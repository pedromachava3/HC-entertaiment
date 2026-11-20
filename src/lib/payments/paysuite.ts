import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente da API PaySuite (https://paysuite.tech) — M-Pesa, e-Mola e mKesh.
 * Fluxo: o servidor cria um pedido de pagamento → o cliente é enviado para a página segura
 * da PaySuite (checkout_url) → escolhe a carteira, indica o número e confirma com o PIN no
 * próprio telemóvel → a PaySuite envia um webhook assinado (HMAC-SHA256) para o servidor.
 * O site nunca recebe nem guarda PIN/OTP.
 */
export function paysuiteConfig() {
  return {
    apiUrl: (process.env.PAYSUITE_API_URL ?? "https://paysuite.tech/api/v1").replace(/\/$/, ""),
    token: process.env.PAYSUITE_API_TOKEN ?? "",
    webhookSecret: process.env.PAYSUITE_WEBHOOK_SECRET ?? "",
  };
}

/** Pagamento automático activo apenas quando o token da API e o segredo do webhook estão configurados. */
export function isOnlinePaymentEnabled(): boolean {
  const c = paysuiteConfig();
  return Boolean(c.token && c.webhookSecret);
}

type ApiEnvelope<T> = { status?: string; message?: string; data?: T };

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const c = paysuiteConfig();
  if (!c.token) throw new Error("PAYSUITE_NOT_CONFIGURED");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${c.apiUrl}/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${c.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!res.ok || json.status !== "success" || !json.data) {
      console.error("PaySuite", method, path, res.status, json.message);
      throw new Error("PAYSUITE_ERROR");
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

export type PaysuitePayment = {
  id: string;
  amount: number | string;
  reference: string;
  status?: string;
  checkout_url?: string;
  transaction?: { id?: string; method?: string; paid_at?: string } | null;
};

export function createPaysuitePayment(input: {
  amountCents: number;
  reference: string;
  description: string;
  returnUrl: string;
  callbackUrl: string;
}) {
  return call<PaysuitePayment>("POST", "payments", {
    amount: (input.amountCents / 100).toFixed(2),
    reference: input.reference,
    description: input.description.slice(0, 120),
    return_url: input.returnUrl,
    callback_url: input.callbackUrl,
  });
}

export function getPaysuitePayment(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("INVALID_ID");
  return call<PaysuitePayment>("GET", `payments/${id}`);
}

/** Verifica a assinatura HMAC-SHA256 (hex) do corpo bruto do webhook. */
export function verifyPaysuiteSignature(rawBody: string, signature: string | null, secret = paysuiteConfig().webhookSecret): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const given = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  if (given.length !== expected.length || !/^[0-9a-f]+$/.test(given)) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Converte o valor da PaySuite (MT, ex.: 1300 ou "1300.00") em cêntimos, sem erros de vírgula flutuante. */
export function amountToCents(amount: number | string): number {
  const [int, dec = ""] = String(amount).trim().split(".");
  if (!/^\d+$/.test(int) || !/^\d{0,2}$/.test(dec)) return NaN;
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

/** Estados da PaySuite considerados como pagamento concluído (consulta GET). */
export function isPaidStatus(p: PaysuitePayment): boolean {
  const s = (p.status ?? "").toLowerCase();
  return ["paid", "completed", "success", "successful", "approved"].includes(s) && Boolean(p.transaction?.id ?? p.transaction?.paid_at);
}
