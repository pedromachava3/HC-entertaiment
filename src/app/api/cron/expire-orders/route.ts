import { timingSafeEqual } from "node:crypto";
import { expireStaleOrders } from "@/lib/services/orders";
import { json, jsonError } from "@/lib/http";

/** Executado pelo Vercel Cron (ver vercel.json). As encomendas também expiram a cada nova compra. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return json({ error: "Não autorizado." }, 401);
  }
  try {
    return json({ expired: await expireStaleOrders() });
  } catch (err) {
    return jsonError(err, 500);
  }
}
