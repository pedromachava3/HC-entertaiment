import { z } from "zod";
import { getOrderForCustomer } from "@/lib/data/orders";
import { startOnlineCheckout } from "@/lib/services/online-payments";
import { isOnlinePaymentEnabled } from "@/lib/payments/paysuite";
import { clientIp } from "@/lib/security";
import { json, jsonError, sameOrigin } from "@/lib/http";

const schema = z.object({ accessKey: z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/) });

/** Inicia o pagamento automático: devolve o URL da página segura da PaySuite. */
export async function POST(req: Request, ctx: RouteContext<"/api/orders/[code]/pay-online">) {
  if (!sameOrigin(req)) return json({ error: "Pedido não autorizado." }, 403);
  if (!isOnlinePaymentEnabled()) return json({ error: "O pagamento automático ainda não está disponível." }, 503);
  const { code } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Pedido inválido." }, 422);
  try {
    const order = await getOrderForCustomer(code, parsed.data.accessKey);
    if (!order) return json({ error: "Encomenda não encontrada." }, 404);
    const url = await startOnlineCheckout(order, parsed.data.accessKey, clientIp(req.headers));
    return json({ url });
  } catch (err) {
    return jsonError(err, 502);
  }
}
