import "server-only";
import { NextResponse } from "next/server";
import { AppError, errorCode, errorMessage } from "./errors";

/** Protecção CSRF básica: pedidos que alteram estado têm de vir do próprio site. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(err: unknown, fallbackStatus = 400) {
  const code = errorCode(err);
  if (code === "UNKNOWN") console.error(err);
  const status = err instanceof AppError ? err.status : code === "RATE_LIMITED" ? 429 : code === "UNKNOWN" ? 500 : fallbackStatus;
  return NextResponse.json({ error: errorMessage(err), code }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
