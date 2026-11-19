"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { eventFormSchema, firstError, ticketTypeFormSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/errors";
import { cancelOrder, reviewPayment } from "@/lib/services/payments";
import { ensureTicketsPdf } from "@/lib/services/tickets";
import { deleteImage } from "@/lib/services/images";
import { publicEnv } from "@/lib/env";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const uuid = z.uuid();

function revalidatePublic() {
  revalidatePath("/", "layout");
}

function eventPayload(fd: FormData) {
  return eventFormSchema.safeParse({
    name: fd.get("name"),
    slug: fd.get("slug"),
    description: fd.get("description") ?? undefined,
    eventDate: fd.get("eventDate"),
    startTime: fd.get("startTime") ?? undefined,
    venue: fd.get("venue") ?? undefined,
    address: fd.get("address") ?? undefined,
    city: fd.get("city") ?? undefined,
    doorInfo: fd.get("doorInfo") ?? undefined,
    lineup: fd.get("lineup") ?? undefined,
    maxTicketsPerOrder: fd.get("maxTicketsPerOrder") ?? 10,
  });
}

function toRow(d: z.output<typeof eventFormSchema>) {
  return {
    name: d.name,
    slug: d.slug,
    description: d.description,
    event_date: d.eventDate,
    start_time: d.startTime,
    venue: d.venue,
    address: d.address,
    city: d.city,
    door_info: d.doorInfo,
    lineup: d.lineup,
    max_tickets_per_order: d.maxTicketsPerOrder,
  };
}

// ---------------- Eventos ----------------
export async function createEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = eventPayload(fd);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { data, error } = await supabaseAdmin()
    .from("events")
    .insert({ ...toRow(parsed.data), status: "draft", sales_status: "closed", created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Já existe um evento com esse endereço (slug)." : "Não foi possível criar o evento." };
  revalidatePublic();
  redirect(`/admin/eventos/${data.id}`);
}

export async function updateEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Evento inválido." };
  const parsed = eventPayload(fd);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { error } = await supabaseAdmin().from("events").update(toRow(parsed.data)).eq("id", id.data);
  if (error) return { error: error.code === "23505" ? "Já existe um evento com esse endereço (slug)." : "Não foi possível guardar." };
  revalidatePublic();
  return { ok: true, message: "Alterações guardadas." };
}

const statusSchema = z.enum(["draft", "published", "ongoing", "completed", "cancelled"]);

export async function setEventStatusAction(eventId: string, status: string): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(eventId);
  const st = statusSchema.safeParse(status);
  if (!id.success || !st.success) return { error: "Pedido inválido." };
  const patch: Record<string, unknown> = { status: st.data };
  // Eventos cancelados, realizados ou em rascunho não aceitam compras.
  if (st.data !== "published") patch.sales_status = "closed";
  const { error } = await supabaseAdmin().from("events").update(patch).eq("id", id.data);
  if (error) return { error: "Não foi possível alterar o estado." };
  revalidatePublic();
  return { ok: true };
}

export async function setSalesStatusAction(eventId: string, open: boolean): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(eventId);
  if (!id.success) return { error: "Pedido inválido." };
  const admin = supabaseAdmin();
  if (open) {
    const { data: ev } = await admin.from("events").select("status, is_archived").eq("id", id.data).single();
    if (!ev || ev.status !== "published" || ev.is_archived) return { error: "Publique o evento antes de abrir as vendas." };
    const { count } = await admin.from("ticket_types").select("id", { count: "exact", head: true }).eq("event_id", id.data).eq("is_active", true);
    if (!count) return { error: "Crie pelo menos uma categoria de bilhete activa." };
  }
  const { error } = await admin.from("events").update({ sales_status: open ? "open" : "closed" }).eq("id", id.data);
  if (error) return { error: "Não foi possível alterar as vendas." };
  revalidatePublic();
  return { ok: true };
}

export async function setArchivedAction(eventId: string, archived: boolean): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(eventId);
  if (!id.success) return { error: "Pedido inválido." };
  const patch = archived ? { is_archived: true, sales_status: "closed" } : { is_archived: false };
  const { error } = await supabaseAdmin().from("events").update(patch).eq("id", id.data);
  if (error) return { error: "Não foi possível arquivar." };
  revalidatePublic();
  return { ok: true };
}

// ---------------- Categorias de bilhetes ----------------
export async function saveTicketTypeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const eventId = uuid.safeParse(fd.get("eventId"));
  if (!eventId.success) return { error: "Evento inválido." };
  const idRaw = fd.get("id");
  const parsed = ticketTypeFormSchema.safeParse({
    name: fd.get("name"),
    category: fd.get("category"),
    description: fd.get("description") ?? undefined,
    priceMzn: fd.get("priceMzn"),
    quantityTotal: fd.get("quantityTotal"),
    maxPerOrder: fd.get("maxPerOrder"),
    isActive: fd.get("isActive") === "on",
    sortOrder: fd.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const row = {
    event_id: eventId.data,
    name: d.name,
    category: d.category,
    description: d.description,
    price_cents: Math.round(d.priceMzn * 100),
    quantity_total: d.quantityTotal,
    max_per_order: d.maxPerOrder,
    is_active: d.isActive,
    sort_order: d.sortOrder,
  };
  const admin = supabaseAdmin();
  if (idRaw) {
    const id = uuid.safeParse(idRaw);
    if (!id.success) return { error: "Categoria inválida." };
    const { data: cur } = await admin.from("ticket_types").select("quantity_reserved, quantity_sold").eq("id", id.data).single();
    if (cur && d.quantityTotal < cur.quantity_reserved + cur.quantity_sold) {
      return { error: `A quantidade não pode ser inferior aos bilhetes já reservados/vendidos (${cur.quantity_reserved + cur.quantity_sold}).` };
    }
    const { error } = await admin.from("ticket_types").update(row).eq("id", id.data).eq("event_id", eventId.data);
    if (error) return { error: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível guardar." };
  } else {
    const { error } = await admin.from("ticket_types").insert(row);
    if (error) return { error: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível criar." };
  }
  revalidatePublic();
  return { ok: true, message: "Categoria guardada. Os novos preços aplicam-se apenas a novas encomendas." };
}

export async function deleteTicketTypeAction(ticketTypeId: string): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(ticketTypeId);
  if (!id.success) return { error: "Pedido inválido." };
  const admin = supabaseAdmin();
  const { count } = await admin.from("order_items").select("id", { count: "exact", head: true }).eq("ticket_type_id", id.data);
  if (count) {
    await admin.from("ticket_types").update({ is_active: false }).eq("id", id.data);
    revalidatePublic();
    return { ok: true, message: "A categoria tem encomendas associadas: foi desactivada em vez de eliminada." };
  }
  const { error } = await admin.from("ticket_types").delete().eq("id", id.data);
  if (error) return { error: "Não foi possível eliminar." };
  revalidatePublic();
  return { ok: true };
}

// ---------------- Pagamentos ----------------
export async function reviewPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = z
    .object({
      submissionId: z.uuid(),
      action: z.enum(["confirm", "keep_pending", "reject"]),
      note: z.string().trim().max(500).optional(),
      confirmed: z.literal("yes").optional(),
    })
    .safeParse({
      submissionId: fd.get("submissionId"),
      action: fd.get("action"),
      note: fd.get("note") || undefined,
      confirmed: fd.get("confirmed") || undefined,
    });
  if (!parsed.success) return { error: "Pedido inválido." };
  if (parsed.data.action === "confirm" && parsed.data.confirmed !== "yes") {
    return { error: "Confirme que verificou o recebimento do valor no M-Pesa/e-Mola." };
  }
  if (parsed.data.action === "reject" && !parsed.data.note) {
    return { error: "Indique o motivo da rejeição." };
  }
  try {
    const r = await reviewPayment({
      submissionId: parsed.data.submissionId,
      action: parsed.data.action,
      adminId: user.id,
      note: parsed.data.note ?? null,
    });
    revalidatePath("/admin", "layout");
    if (r.pdfError) return { error: r.pdfError };
    const msg =
      parsed.data.action === "confirm"
        ? r.tickets_created > 0
          ? `Pagamento confirmado. ${r.tickets_created} bilhete(s) emitido(s).`
          : "Este pagamento já estava confirmado — nenhum bilhete adicional foi criado."
        : parsed.data.action === "reject"
          ? "Comprovativo rejeitado. O cliente pode comunicar novamente."
          : "Mantido pendente.";
    return { ok: true, message: msg };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function cancelOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = uuid.safeParse(fd.get("orderId"));
  if (!id.success) return { error: "Pedido inválido." };
  try {
    await cancelOrder(id.data, user.id, (fd.get("note") as string) || null);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Encomenda cancelada e bilhetes libertados." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function regeneratePdfAction(orderId: string): Promise<ActionState> {
  const user = await requireAdmin();
  const id = uuid.safeParse(orderId);
  if (!id.success) return { error: "Pedido inválido." };
  try {
    await ensureTicketsPdf(id.data, user.id, true);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "PDF gerado novamente." };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

const deliveryActions = ["pdf_downloaded", "message_copied", "chat_opened", "marked_sent", "unmarked_sent"] as const;

export async function deliveryAction(orderId: string, action: (typeof deliveryActions)[number]): Promise<ActionState> {
  const user = await requireAdmin();
  const id = uuid.safeParse(orderId);
  if (!id.success || !deliveryActions.includes(action)) return { error: "Pedido inválido." };
  const admin = supabaseAdmin();
  if (action === "marked_sent" || action === "unmarked_sent") {
    const { data: o } = await admin.from("orders").select("status").eq("id", id.data).single();
    if (o?.status !== "paid") return { error: "Só é possível marcar como enviado depois da emissão dos bilhetes." };
    await admin
      .from("orders")
      .update(action === "marked_sent"
        ? { delivery_status: "sent", delivered_at: new Date().toISOString(), delivered_by: user.id }
        : { delivery_status: "not_sent", delivered_at: null, delivered_by: null })
      .eq("id", id.data);
  }
  await admin.from("ticket_delivery_logs").insert({ order_id: id.data, actor_id: user.id, action });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ---------------- Bilhetes ----------------
export async function cancelTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const id = uuid.safeParse(fd.get("ticketId"));
  const reason = String(fd.get("reason") ?? "").trim();
  if (!id.success) return { error: "Pedido inválido." };
  if (reason.length < 3) return { error: "Indique o motivo do cancelamento." };
  const { error } = await supabaseAdmin().rpc("cancel_ticket", { p_ticket_id: id.data, p_admin: user.id, p_reason: reason });
  if (error) return { error: errorMessage(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Bilhete cancelado." };
}

// ---------------- Galeria ----------------
export async function deleteImageAction(imageId: string): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(imageId);
  if (!id.success) return { error: "Pedido inválido." };
  try {
    await deleteImage(id.data);
  } catch {
    return { error: "Não foi possível eliminar a imagem." };
  }
  revalidatePublic();
  return { ok: true };
}

export async function toggleGalleryAction(imageId: string, show: boolean): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(imageId);
  if (!id.success) return { error: "Pedido inválido." };
  await supabaseAdmin().from("event_images").update({ show_in_gallery: show }).eq("id", id.data);
  revalidatePublic();
  return { ok: true };
}

// ---------------- Utilizadores ----------------
export async function addStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = z
    .object({ email: z.email({ error: "Email inválido." }), role: z.enum(["admin", "staff"]) })
    .safeParse({ email: String(fd.get("email") ?? "").trim().toLowerCase(), role: fd.get("role") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const admin = supabaseAdmin();

  let targetId: string | null = null;
  for (let page = 1; page <= 20 && !targetId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { error: "Não foi possível consultar os utilizadores." };
    targetId = data.users.find((u) => u.email?.toLowerCase() === parsed.data.email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  let invited = false;
  if (!targetId) {
    // Convite por email: o utilizador define a sua própria palavra-passe (sem senhas fixas).
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${publicEnv().siteUrl}/admin/auth/confirm`,
    });
    if (error || !data.user) return { error: "Não foi possível enviar o convite." };
    targetId = data.user.id;
    invited = true;
  }
  const { error } = await admin.from("user_roles").upsert(
    { user_id: targetId, role: parsed.data.role, created_by: user.id },
    { onConflict: "user_id,role", ignoreDuplicates: true },
  );
  if (error) return { error: "Não foi possível atribuir o papel." };
  revalidatePath("/admin/utilizadores");
  return { ok: true, message: invited ? "Convite enviado por email e papel atribuído." : "Papel atribuído." };
}

export async function removeRoleAction(userId: string, role: "admin" | "staff"): Promise<ActionState> {
  const user = await requireAdmin();
  const id = uuid.safeParse(userId);
  if (!id.success || !["admin", "staff"].includes(role)) return { error: "Pedido inválido." };
  if (id.data === user.id && role === "admin") return { error: "Não pode remover o seu próprio acesso de administrador." };
  const admin = supabaseAdmin();
  if (role === "admin") {
    const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return { error: "Tem de existir pelo menos um administrador." };
  }
  await admin.from("user_roles").delete().eq("user_id", id.data).eq("role", role);
  revalidatePath("/admin/utilizadores");
  return { ok: true };
}
