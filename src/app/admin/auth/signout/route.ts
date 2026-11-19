import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
