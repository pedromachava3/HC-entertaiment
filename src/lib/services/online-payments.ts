import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { publicEnv } from "../env";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { hashIp } from "../security";
import type { OrderFull } from "../data/orders";
import { amountToCents, createPaysuitePayment, getPaysuitePayment, isPaidStatus } from "../payments/paysuite";
import { ensureTicketsPdf } from "./tickets";

/** Cria (ou reutiliza) o pedido de pagamento PaySuite e devolve o URL da página de pagamento. */
export async function startOnlineCheckout(order: OrderFull, accessKey: string, ip: string): Promise<string> {
  if (order.status !== "pending_payment") throw new AppError("ORDER_CLOSED");
  await enforceRateLimit(`pay-online:${hashIp(ip)}`, 10, 600);
  await enforceRateLimit(`pay-online-order:${order.id}`, 6, 3600);

  const admin = supabaseAdmin();
  const { data: recent } = await admin
    .from("online_payments")
    .select("checkout_url, created_at, amount_cents")
    .eq("order_id", order.id)
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Number(recent.amount_cents) === Number(order.total_cents) && Date.now() - new Date(recent.created_at).getTime() < 20 * 60_000) {
    return recent.checkout_url;
  }

  const site = publicEnv().siteUrl;
  const payment = await createPaysuitePayment({
    amountCents: Number(order.total_cents),
    reference: order.code,
    description: `Bilhetes ${order.event.name} — ${order.code}`,
    returnUrl: `${site}/encomenda/${order.code}?k=${encodeURIComponent(accessKey)}&pago=1`,
    callbackUrl: `${site}/api/webhooks/paysuite`,
  });
  if (!payment.id || !payment.checkout_url || !/^https:\/\//.test(payment.checkout_url)) throw new Error("PAYSUITE_ERROR");

  const { error } = await admin.from("online_payments").insert({
    order_id: order.id,
    provider: "paysuite",
    provider_payment_id: payment.id,
    checkout_url: payment.checkout_url,
    amount_cents: Number(order.total_cents),
  });
  if (error) throw error;
  await admin.from("payment_audit_logs").insert({ order_id: order.id, action: "online_checkout_created", metadata: { provider_payment_id: payment.id } });
  return payment.checkout_url;
}

/** Aplica um pagamento confirmado (webhook assinado ou consulta à API) e gera o PDF. */
export async function applyConfirmedPayment(p: {
  providerPaymentId: string;
  amountCents: number;
  transactionId: string | null;
  method: string | null;
  raw: unknown;
}) {
  const { data, error } = await supabaseAdmin().rpc("confirm_online_payment", {
    p_provider_payment_id: p.providerPaymentId,
    p_amount_cents: p.amountCents,
    p_transaction_id: p.transactionId,
    p_method: p.method,
    p_raw: p.raw ?? null,
  });
  if (error) throw error;
  const row = (data as { result: string; order_id: string; tickets_created: number }[])[0];
  if (row.result === "confirmed") {
    try {
      await ensureTicketsPdf(row.order_id, null);
    } catch (e) {
      console.error("PDF após pagamento automático", e); // pode ser regenerado no painel ou no download
    }
  }
  return row;
}

/**
 * Verificação activa (quando o cliente volta da PaySuite): consulta a API com o token do servidor.
 * Complementa o webhook — útil se o webhook se atrasar.
 */
export async function reconcileOrderOnlinePayments(orderId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("online_payments")
    .select("provider_payment_id")
    .eq("order_id", orderId)
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(3);
  for (const op of data ?? []) {
    try {
      const p = await getPaysuitePayment(op.provider_payment_id);
      if (isPaidStatus(p)) {
        const r = await applyConfirmedPayment({
          providerPaymentId: op.provider_payment_id,
          amountCents: amountToCents(p.amount),
          transactionId: p.transaction?.id ?? null,
          method: p.transaction?.method ?? null,
          raw: { source: "api", payment: p },
        });
        if (r.result === "confirmed" || r.result === "already_paid") return true;
      }
    } catch (e) {
      console.error("reconcile", e);
    }
  }
  return false;
}
