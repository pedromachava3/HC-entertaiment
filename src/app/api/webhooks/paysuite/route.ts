import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { amountToCents, verifyPaysuiteSignature } from "@/lib/payments/paysuite";
import { applyConfirmedPayment } from "@/lib/services/online-payments";
import { json } from "@/lib/http";

const eventSchema = z.object({
  event: z.string().max(60),
  data: z.object({
    id: z.string().min(8).max(64),
    amount: z.union([z.number(), z.string()]).optional(),
    reference: z.string().max(64).optional(),
    transaction: z
      .object({ id: z.union([z.string(), z.number()]).optional(), method: z.string().max(30).optional(), paid_at: z.string().optional() })
      .nullish(),
  }),
});

/**
 * Webhook da PaySuite. Só é aceite com assinatura HMAC-SHA256 válida (PAYSUITE_WEBHOOK_SECRET).
 * Idempotente: repetições do mesmo evento não emitem bilhetes adicionais.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 64 * 1024) return json({ error: "Payload demasiado grande." }, 413);
  const signature = req.headers.get("x-webhook-signature") ?? req.headers.get("x-signature");
  if (!verifyPaysuiteSignature(raw, signature)) return json({ error: "Assinatura inválida." }, 401);

  let parsed;
  try {
    parsed = eventSchema.safeParse(JSON.parse(raw));
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  if (!parsed.success) return json({ error: "Evento inválido." }, 400);
  const { event, data } = parsed.data;

  try {
    if (event === "payment.success") {
      const r = await applyConfirmedPayment({
        providerPaymentId: data.id,
        amountCents: data.amount !== undefined ? amountToCents(data.amount) : NaN,
        transactionId: data.transaction?.id !== undefined ? String(data.transaction.id) : null,
        method: data.transaction?.method ?? null,
        raw: JSON.parse(raw),
      });
      return json({ ok: true, result: r.result });
    }
    if (event === "payment.failed" || event === "payment.cancelled" || event === "payment.expired") {
      await supabaseAdmin().rpc("fail_online_payment", { p_provider_payment_id: data.id, p_raw: JSON.parse(raw) });
      return json({ ok: true });
    }
    return json({ ok: true, ignored: event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/ONLINE_PAYMENT_NOT_FOUND/.test(msg)) return json({ ok: true, ignored: "unknown_payment" });
    console.error("Webhook PaySuite", err);
    return json({ error: "Erro interno." }, 500); // a PaySuite volta a tentar
  }
}
