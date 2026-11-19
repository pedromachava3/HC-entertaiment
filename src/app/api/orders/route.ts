import { checkoutSchema, firstError } from "@/lib/validation";
import { createOrder } from "@/lib/services/orders";
import { clientIp } from "@/lib/security";
import { json, jsonError, sameOrigin } from "@/lib/http";
import { isSupabaseConfigured } from "@/lib/env";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Pedido não autorizado." }, 403);
  if (!isSupabaseConfigured()) return json({ error: "O sistema ainda não está configurado." }, 503);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "Formato inválido." }, 415);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Pedido inválido." }, 400);
  }
  // Campos como preço ou total enviados pelo navegador são simplesmente ignorados (o schema não os aceita).
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return json({ error: firstError(parsed.error) }, 422);

  try {
    const order = await createOrder(parsed.data, clientIp(req.headers));
    return json({ code: order.code, accessKey: order.accessKey, totalCents: order.totalCents, created: order.created }, order.created ? 201 : 200);
  } catch (err) {
    return jsonError(err, 409);
  }
}
