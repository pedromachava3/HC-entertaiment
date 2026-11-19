import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "../env";

let cached: SupabaseClient | null = null;

/**
 * Cliente com a chave service_role — EXCLUSIVO do servidor.
 * Usado apenas depois de validar a autorização do pedido.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const { supabaseUrl } = publicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  cached = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "hc-entertainment-server" } },
  });
  return cached;
}
