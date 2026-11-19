import { getOrderForCustomer } from "@/lib/data/orders";
import { downloadTicketsPdf } from "@/lib/services/tickets";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp, hashIp } from "@/lib/security";
import { json, jsonError } from "@/lib/http";

/** Download dos bilhetes pelo próprio comprador (exige a chave privada da encomenda). */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[code]/pdf">) {
  const { code } = await ctx.params;
  const key = new URL(req.url).searchParams.get("k");
  try {
    await enforceRateLimit(`pdf:${hashIp(clientIp(req.headers))}`, 30, 600);
    const order = await getOrderForCustomer(code, key);
    if (!order) return json({ error: "Encomenda não encontrada." }, 404);
    if (order.status !== "paid") return json({ error: "Os bilhetes ainda não foram emitidos." }, 409);
    const { bytes, filename } = await downloadTicketsPdf(order.id);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    return jsonError(err, 400);
  }
}
