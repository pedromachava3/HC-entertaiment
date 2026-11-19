import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Troca o código do link de acesso (PKCE) por uma sessão. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/admin";
  const next = nextRaw.startsWith("/admin") && !nextRaw.startsWith("//") ? nextRaw : "/admin";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/admin/login?erro=link", url.origin));
}
