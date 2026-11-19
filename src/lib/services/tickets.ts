import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { getOrderById } from "../data/orders";
import { createTicketPayload } from "../tickets/qr-token";
import { generateTicketsPdf } from "../tickets/pdf";

export function ticketsPdfPath(orderId: string, code: string) {
  return `${orderId}/bilhetes-${code}.pdf`;
}

/**
 * Gera (ou regenera) o PDF da encomenda e guarda-o no bucket privado "tickets".
 * Idempotente: caminho determinístico + upsert; não cria bilhetes.
 */
export async function ensureTicketsPdf(orderId: string, actorId: string | null, force = false): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "paid" || order.tickets.length === 0) throw new Error("INVALID_STATE");
  if (order.tickets_pdf_path && !force) return order.tickets_pdf_path;

  const bytes = await generateTicketsPdf({
    orderCode: order.code,
    event: {
      name: order.event.name,
      eventDate: order.event.event_date,
      startTime: order.event.start_time,
      venue: order.event.venue,
      address: order.event.address,
      city: order.event.city,
    },
    tickets: order.tickets
      .filter((t) => t.status !== "cancelled")
      .map((t) => ({
        ticketNumber: t.ticket_number,
        holderName: t.holder_name,
        category: t.category,
        ticketTypeName: t.ticket_type_name,
        priceCents: Number(t.price_cents),
        qrPayload: createTicketPayload(t.id),
      })),
  });

  const path = ticketsPdfPath(order.id, order.code);
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from("tickets").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  await admin.from("orders").update({ tickets_pdf_path: path }).eq("id", order.id);
  await admin.from("payment_audit_logs").insert({ order_id: order.id, action: "pdf_generated", actor_id: actorId });
  return path;
}

export async function downloadTicketsPdf(orderId: string): Promise<{ bytes: ArrayBuffer; filename: string }> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const path = await ensureTicketsPdf(orderId, null);
  const { data, error } = await supabaseAdmin().storage.from("tickets").download(path);
  if (error || !data) throw error ?? new Error("DOWNLOAD_FAILED");
  return { bytes: await data.arrayBuffer(), filename: `bilhetes-${order.code}.pdf` };
}
