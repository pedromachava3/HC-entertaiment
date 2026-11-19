import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { AppError } from "./errors";

/** Limitação de frequência persistente (PostgreSQL) — funciona em ambiente serverless. */
export async function enforceRateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  if (data !== true) throw new AppError("RATE_LIMITED", 429);
}
