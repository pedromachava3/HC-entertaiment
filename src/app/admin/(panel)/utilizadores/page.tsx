import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { AddStaffForm, RoleBadge } from "@/components/admin/users-client";
import { Card } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";

export default async function UsersPage() {
  const me = await requireAdmin();
  const admin = supabaseAdmin();
  const { data: roles } = await admin.from("user_roles").select("user_id, role, created_at").order("created_at");
  const byUser = new Map<string, ("admin" | "staff")[]>();
  for (const r of roles ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
  const users = await Promise.all(
    [...byUser.keys()].map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return { id, email: data.user?.email ?? "—", lastSignIn: data.user?.last_sign_in_at ?? null, roles: byUser.get(id)! };
    }),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader title="Utilizadores" description="Administradores gerem tudo. Funcionários de validação só lêem QR Codes e confirmam entradas." />
      <Card className="mb-6 p-6">
        <AddStaffForm />
        <p className="mt-3 text-xs text-white/40">Se o email ainda não tiver conta, é enviado um convite para que a pessoa defina a sua própria palavra-passe.</p>
      </Card>
      <Card className="divide-y divide-white/5">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{u.email} {u.id === me.id ? <span className="text-xs text-white/40">(você)</span> : null}</p>
              <p className="text-xs text-white/40">Último acesso: {u.lastSignIn ? formatDateTime(u.lastSignIn) : "nunca"}</p>
            </div>
            <div className="flex gap-2">{u.roles.map((r) => <RoleBadge key={r} userId={u.id} role={r} canRemove={!(u.id === me.id && r === "admin")} />)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
