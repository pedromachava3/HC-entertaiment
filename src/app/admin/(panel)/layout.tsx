import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaff } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return <main className="p-10 text-center text-mute">Configure as variáveis de ambiente do Supabase para usar o painel.</main>;
  }
  const user = await requireStaff();
  let pending = 0;
  if (user.isAdmin) {
    const { count } = await supabaseAdmin().from("orders").select("id", { count: "exact", head: true }).eq("status", "payment_reported");
    pending = count ?? 0;
  }
  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav isAdmin={user.isAdmin} email={user.email} pendingCount={pending} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
