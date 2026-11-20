import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/data/orders";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewPanel } from "@/components/admin/review-panel";
import { DeliveryPanel } from "@/components/admin/delivery-panel";
import { CancelOrderForm } from "@/components/admin/cancel-order-form";
import { Badge, Card } from "@/components/ui/primitives";
import { PAYMENT_METHODS } from "@/lib/config";
import { formatDateShort, formatDateTime, formatMZN } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { buildTicketsReadyMessage, waLink } from "@/lib/whatsapp";
import { ORDER_STATUS_LABEL, TICKET_STATUS_LABEL, orderStatusTone } from "@/lib/types";

const AUDIT_LABEL: Record<string, string> = {
  order_created: "Encomenda criada", payment_reported: "Pagamento comunicado pelo cliente", kept_pending: "Mantido pendente",
  rejected: "Comprovativo rejeitado", confirmed: "Pagamento confirmado", confirm_repeated: "Confirmação repetida (ignorada)",
  tickets_issued: "Bilhetes emitidos", online_checkout_created: "Cliente iniciou pagamento automático (PaySuite)",
  online_payment_confirmed: "Pagamento automático confirmado (PaySuite)", online_payment_failed: "Pagamento automático falhou/cancelado",
  online_payment_needs_review: "Pagamento automático requer verificação", expired: "Encomenda expirada", cancelled: "Encomenda cancelada", pdf_generated: "PDF gerado",
};
const SUB_LABEL = { pending: "Em verificação", approved: "Aprovado", rejected: "Rejeitado" } as const;

export default async function PaymentDetail(props: PageProps<"/admin/pagamentos/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();
  const admin = supabaseAdmin();
  const [{ data: audit }, { data: deliveries }, { data: onlinePays }] = await Promise.all([
    admin.from("payment_audit_logs").select("*").eq("order_id", id).order("created_at", { ascending: true }),
    admin.from("ticket_delivery_logs").select("*").eq("order_id", id).order("created_at", { ascending: true }),
    admin.from("online_payments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  const actorIds = [...new Set([...(audit ?? []), ...(deliveries ?? [])].map((a) => a.actor_id).filter(Boolean))] as string[];
  const emails = new Map<string, string>();
  for (const uid of actorIds) {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data.user?.email) emails.set(uid, data.user.email);
  }

  const pending = order.payment_submissions.find((s) => s.status === "pending");
  const quantity = order.order_items.reduce((s, i) => s + i.quantity, 0);
  const message = buildTicketsReadyMessage({
    customerName: order.customer_name, orderCode: order.code, eventName: order.event.name,
    eventDate: order.event.event_date, quantity, totalCents: Number(order.total_cents),
  });

  return (
    <div className="max-w-6xl">
      <Link href="/admin/pagamentos" className="mb-4 inline-flex items-center gap-2 text-sm text-mute hover:text-white"><ArrowLeft className="size-4" /> Pagamentos</Link>
      <PageHeader title={order.code} description={`${order.event.name} · ${formatDateShort(order.event.event_date)}`} actions={<Badge tone={orderStatusTone(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Badge>} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {pending && order.status === "payment_reported" ? (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Verificação do pagamento</h2>
              <ReviewPanel
                submissionId={pending.id}
                amount={formatMZN(order.total_cents)}
                method={PAYMENT_METHODS[pending.method].label}
                payerPhone={formatPhone(pending.payer_phone)}
                reference={pending.transaction_ref}
              />
            </Card>
          ) : null}

          {order.status === "paid" ? (
            <Card className="p-6">
              <h2 className="mb-1 font-display text-2xl uppercase text-emerald-400">PAGAMENTO CONFIRMADO — BILHETES GERADOS</h2>
              <p className="mb-5 text-sm text-mute">Confirmado em {order.paid_at ? formatDateTime(order.paid_at) : "—"}{order.confirmed_by && emails.get(order.confirmed_by) ? ` por ${emails.get(order.confirmed_by)}` : ""}.</p>
              <DeliveryPanel
                orderId={order.id}
                message={message}
                waUrl={waLink(order.customer_whatsapp, message)}
                sent={order.delivery_status === "sent"}
                hasPdf={Boolean(order.tickets_pdf_path)}
              />
            </Card>
          ) : null}

          {(onlinePays ?? []).length ? (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Pagamentos automáticos (PaySuite)</h2>
              <div className="space-y-3">
                {(onlinePays ?? []).map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/10 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{formatMZN(p.amount_cents)}{p.method ? ` · ${p.method}` : ""}</span>
                      <Badge tone={p.status === "paid" ? "green" : p.status === "needs_review" ? "red" : p.status === "failed" ? "grey" : "amber"}>
                        {{ created: "Iniciado", paid: "Pago", failed: "Falhou/cancelado", needs_review: "Verificar" }[p.status as string] ?? p.status}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-white/50">PaySuite {p.provider_payment_id}{p.provider_transaction_id ? ` · Tx ${p.provider_transaction_id}` : ""}</p>
                    <p className="text-xs text-white/50">{formatDateTime(p.created_at)}{p.paid_at ? ` → pago ${formatDateTime(p.paid_at)}` : ""}</p>
                    {p.review_reason ? <p className="mt-1 text-hc-red">{p.review_reason}</p> : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Comunicações de pagamento</h2>
            {order.payment_submissions.length === 0 ? <p className="text-sm text-mute">O cliente ainda não comunicou nenhum pagamento.</p> : null}
            <div className="space-y-3">
              {order.payment_submissions.map((s) => (
                <div key={s.id} className="rounded-xl border border-white/10 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{PAYMENT_METHODS[s.method].label} · <span className="font-mono">{s.transaction_ref}</span></span>
                    <Badge tone={s.status === "approved" ? "green" : s.status === "rejected" ? "red" : "amber"}>{SUB_LABEL[s.status]}</Badge>
                  </div>
                  <p className="mt-1 text-white/60">Número: {formatPhone(s.payer_phone)} · {formatDateTime(s.created_at)}</p>
                  {s.review_note ? <p className="mt-1 text-white/60">Nota: {s.review_note}</p> : null}
                  {s.proof_path ? (
                    <a href={`/api/admin/proofs/${s.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-hc-red hover:underline"><FileText className="size-4" /> Ver comprovativo</a>
                  ) : <p className="mt-1 text-white/40">Sem comprovativo.</p>}
                </div>
              ))}
            </div>
          </Card>

          {order.tickets.length ? (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Bilhetes ({order.tickets.length})</h2>
              <ul className="divide-y divide-white/5 text-sm">
                {order.tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <span className="font-mono">{t.ticket_number}</span>
                    <span className="flex items-center gap-2">{t.ticket_type_name} <Badge tone={t.status === "valid" ? "green" : t.status === "used" ? "white" : "red"}>{TICKET_STATUS_LABEL[t.status]}</Badge></span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="p-6 text-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Cliente</h2>
            <p className="text-lg font-semibold">{order.customer_name}</p>
            <p className="text-white/70">{formatPhone(order.customer_whatsapp)}</p>
            {order.customer_email ? <p className="text-white/70">{order.customer_email}</p> : null}
            <div className="mt-5 space-y-1.5 border-t border-white/10 pt-4">
              {order.order_items.map((i) => (
                <div key={i.id} className="flex justify-between"><span>{i.quantity} × {i.ticket_type_name} ({formatMZN(i.unit_price_cents)})</span><span>{formatMZN(i.line_total_cents)}</span></div>
              ))}
              <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold"><span>Total</span><span>{formatMZN(order.total_cents)}</span></div>
            </div>
            <p className="mt-3 text-white/50">Método escolhido: {PAYMENT_METHODS[order.payment_method].label}</p>
            {order.expires_at ? <p className="text-white/50">Expira: {formatDateTime(order.expires_at)}</p> : null}
            {order.status === "pending_payment" || order.status === "payment_reported" ? <div className="mt-5"><CancelOrderForm orderId={order.id} /></div> : null}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Histórico</h2>
            <ol className="relative space-y-4 border-l border-white/10 pl-5 text-sm">
              {[...(audit ?? []).map((a) => ({ at: a.created_at, label: AUDIT_LABEL[a.action] ?? a.action, actor: a.actor_id, note: a.note })),
                ...(deliveries ?? []).map((d) => ({ at: d.created_at, label: { pdf_downloaded: "PDF descarregado", message_copied: "Mensagem copiada", chat_opened: "WhatsApp do cliente aberto", marked_sent: "Marcado como enviado", unmarked_sent: "Envio desmarcado" }[d.action as string] ?? d.action, actor: d.actor_id, note: null }))]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((e, i) => (
                  <li key={i}>
                    <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-hc-red" />
                    <p className="font-semibold">{e.label}</p>
                    <p className="text-xs text-white/50">{formatDateTime(e.at)}{e.actor ? ` · ${emails.get(e.actor) ?? "utilizador"}` : ""}</p>
                    {e.note ? <p className="text-xs text-white/60">{e.note}</p> : null}
                  </li>
                ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
