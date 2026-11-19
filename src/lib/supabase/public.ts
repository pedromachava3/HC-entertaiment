import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "../env";

let cached: SupabaseClient | null = null;

/** Cliente anónimo (chave pública) — leituras públicas sujeitas a RLS. */
export function supabasePublic(): SupabaseClient {
  if (cached) return cached;
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("SUPABASE_NOT_CONFIGURED");
  cached = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
