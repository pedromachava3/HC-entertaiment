import { NextResponse } from "next/server";
import { staffForApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json } from "@/lib/http";

/** Comprovativos: só administradores; URL assinado de curta duração (60 s). */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/proofs/[id]">) {
  const user = await staffForApi("admin");
  if (!user) return json({ error: "Sem permissão." }, 403);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Inválido." }, 400);
  const admin = supabaseAdmin();
  const { data } = await admin.from("payment_submissions").select("proof_path").eq("id", id).maybeSingle();
  if (!data?.proof_path) return json({ error: "Sem comprovativo." }, 404);
  const { data: signed, error } = await admin.storage.from("payment-proofs").createSignedUrl(data.proof_path, 60);
  if (error || !signed) return json({ error: "Não foi possível abrir o comprovativo." }, 500);
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
