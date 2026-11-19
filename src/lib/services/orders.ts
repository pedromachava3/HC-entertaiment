import "server-only";
import { createHmac } from "node:crypto";
import { supabaseAdmin } from "../supabase/admin";
import { orderTtlMinutes } from "../env";
import { randomToken, sha256Hex, hashIp } from "../security";
import { enforceRateLimit } from "../rate-limit";
import type { CheckoutData } from "../validation";

/**
 * Cria a encomenda. Os preços e o total são calculados pela função create_order
 * na base de dados — nunca a partir de valores enviados pelo navegador.
 */
export async function createOrder(input: CheckoutData, ip: string) {
  const ipHash = hashIp(ip);
  await enforceRateLimit(`order:${ipHash}`, 10, 600); // 10 encomendas / 10 min por IP

  // A chave de acesso só é devolvida ao comprador; na BD guarda-se apenas o hash.
  // Derivada do idempotencyKey + segredo para que um reenvio do mesmo pedido devolva a mesma chave.
  const accessKey = deriveAccessKey(input.idempotencyKey);

  const { data, error } = await supabaseAdmin().rpc("create_order", {
    p_event_id: input.eventId,
    p_items: input.items.map((i) => ({ ticket_type_id: i.ticketTypeId, quantity: i.quantity })),
    p_customer_name: input.customerName,
    p_customer_whatsapp: input.customerWhatsapp,
    p_customer_email: input.customerEmail ?? null,
    p_payment_method: input.paymentMethod,
    p_access_token_hash: sha256Hex(accessKey),
    p_idempotency_key: input.idempotencyKey,
    p_ttl_minutes: orderTtlMinutes(),
    p_ip_hash: ipHash,
  });
  if (error) throw error;
  const row = (data as { order_id: string; order_code: string; total_cents: number; created: boolean }[])[0];
  return { orderId: row.order_id, code: row.order_code, totalCents: Number(row.total_cents), created: row.created, accessKey };
}

function deriveAccessKey(idempotencyKey: string): string {
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!secret) return randomToken();
  return createHmac("sha256", secret).update(`order-access:${idempotencyKey}`).digest("base64url");
}

export async function expireStaleOrders(): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("expire_stale_orders");
  if (error) throw error;
  return Number(data ?? 0);
}
