import { paymentReportSchema, firstError } from "@/lib/validation";
import { getOrderForCustomer } from "@/lib/data/orders";
import { reportPayment } from "@/lib/services/payments";
import { clientIp } from "@/lib/security";
import { json, jsonError, sameOrigin } from "@/lib/http";
import { MAX_PROOF_BYTES } from "@/lib/files";

export async function POST(req: Request, ctx: RouteContext<"/api/orders/[code]/payment">) {
  if (!sameOrigin(req)) return json({ error: "Pedido não autorizado." }, 403);
  const { code } = await ctx.params;

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_PROOF_BYTES + 64 * 1024) return json({ error: "O comprovativo excede 4 MB." }, 413);

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return json({ error: "Pedido inválido." }, 400);
  }
  const parsed = paymentReportSchema.safeParse({
    accessKey: fd.get("accessKey"),
    method: fd.get("method"),
    payerPhone: fd.get("payerPhone"),
    transactionRef: fd.get("transactionRef"),
  });
  if (!parsed.success) return json({ error: firstError(parsed.error) }, 422);

  try {
    const order = await getOrderForCustomer(code, parsed.data.accessKey);
    if (!order) return json({ error: "Encomenda não encontrada." }, 404);
    const proof = fd.get("proof");
    await reportPayment({
      order,
      method: parsed.data.method,
      payerPhone: parsed.data.payerPhone,
      transactionRef: parsed.data.transactionRef,
      proof: proof instanceof File && proof.size > 0 ? proof : null,
      ip: clientIp(req.headers),
    });
    return json({ ok: true });
  } catch (err) {
    return jsonError(err, 409);
  }
}
