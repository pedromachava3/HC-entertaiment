/** Acesso centralizado às variáveis de ambiente. */
export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  };
}

/**
 * Chave service_role do Supabase (só servidor).
 * Aceita também SUPABASE_ROLE_KEY — nome com que a variável foi criada na Vercel deste projecto.
 */
export function serviceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ROLE_KEY || undefined;
}

/** Leituras públicas (eventos, galeria) só precisam do URL e da chave pública. */
export function isPublicSupabaseConfigured(): boolean {
  const e = publicEnv();
  return Boolean(e.supabaseUrl && e.supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  const e = publicEnv();
  return Boolean(e.supabaseUrl && e.supabaseAnonKey && serviceRoleKey());
}

/** Prazo (minutos) para pagar uma encomenda antes de expirar. Padrão: 48 horas. */
export function orderTtlMinutes(): number {
  const raw = Number(process.env.ORDER_PENDING_TTL_MINUTES ?? 2880);
  return Number.isFinite(raw) && raw >= 15 && raw <= 10080 ? Math.floor(raw) : 2880;
}

export function requireServerSecret(name: "SUPABASE_SERVICE_ROLE_KEY" | "TICKET_SIGNING_SECRET" | "CRON_SECRET"): string {
  const v = process.env[name];
  if (!v || v.length < 16) {
    throw new Error(`Variável de ambiente em falta ou inválida: ${name}`);
  }
  return v;
}
