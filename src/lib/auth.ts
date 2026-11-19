import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";
import { isSupabaseConfigured } from "./env";

export type StaffUser = { id: string; email: string; roles: ("admin" | "staff")[]; isAdmin: boolean };

/** Utilizador autenticado + papéis (verificados no servidor). Null se não autenticado ou sem papel. */
export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser(); // valida o JWT junto do Supabase Auth
  if (error || !data.user) return null;
  const { data: roles } = await supabaseAdmin()
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const list = (roles ?? []).map((r) => r.role as "admin" | "staff");
  if (list.length === 0) return null;
  return { id: data.user.id, email: data.user.email ?? "", roles: list, isAdmin: list.includes("admin") };
});

export async function requireStaff(): Promise<StaffUser> {
  const u = await getStaffUser();
  if (!u) redirect("/admin/login");
  return u;
}

export async function requireAdmin(): Promise<StaffUser> {
  const u = await requireStaff();
  if (!u.isAdmin) redirect("/admin/validacao");
  return u;
}

/** Para route handlers: devolve o utilizador ou null (sem redireccionar). */
export async function staffForApi(role: "admin" | "staff"): Promise<StaffUser | null> {
  const u = await getStaffUser();
  if (!u) return null;
  if (role === "admin" && !u.isAdmin) return null;
  return u;
}
