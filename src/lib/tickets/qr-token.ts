import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Conteúdo do QR Code: "HC1.<uuid do bilhete>.<assinatura HMAC-SHA256 truncada>".
 * - Não contém dados pessoais.
 * - Não pode ser forjado sem o segredo do servidor (TICKET_SIGNING_SECRET).
 * - Mesmo com assinatura válida, o bilhete só é aceite se existir na base de dados.
 */
const PREFIX = "HC1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sign(ticketId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${PREFIX}:${ticketId}`).digest("base64url").slice(0, 22);
}

function getSecret(explicit?: string): string {
  const s = explicit ?? process.env.TICKET_SIGNING_SECRET;
  if (!s || s.length < 32) throw new Error("TICKET_SIGNING_SECRET em falta ou demasiado curto (mín. 32 caracteres)");
  return s;
}

export function createTicketPayload(ticketId: string, secret?: string): string {
  const id = ticketId.toLowerCase();
  if (!UUID_RE.test(id)) throw new Error("ID de bilhete inválido");
  return `${PREFIX}.${id}.${sign(id, getSecret(secret))}`;
}

/** Devolve o ID do bilhete se a assinatura for válida; caso contrário, null. */
export function verifyTicketPayload(payload: string, secret?: string): string | null {
  if (typeof payload !== "string" || payload.length > 200) return null;
  const parts = payload.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const id = parts[1].toLowerCase();
  if (!UUID_RE.test(id)) return null;
  const expected = Buffer.from(sign(id, getSecret(secret)));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}
