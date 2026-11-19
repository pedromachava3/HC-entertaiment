import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Token aleatório (base64url) — 32 bytes = 256 bits. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Hash do IP com segredo (não guardamos IPs em claro). */
export function hashIp(ip: string): string {
  const secret = process.env.TICKET_SIGNING_SECRET ?? "dev";
  return createHmac("sha256", secret).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}
