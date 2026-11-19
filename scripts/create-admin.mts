/**
 * Criação segura do primeiro administrador (sem palavras-passe fixas).
 * Uso:  SUPABASE_SERVICE_ROLE_KEY=… NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SITE_URL=… npm run admin:create -- email@exemplo.com [admin|staff]
 * Se o utilizador não existir, é enviado um convite por email para definir a palavra-passe.
 */
import { createClient } from "@supabase/supabase-js";

const [email, role = "admin"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !["admin", "staff"].includes(role)) {
  console.error("Uso: npm run admin:create -- email@exemplo.com [admin|staff]");
  process.exit(1);
}
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/admin/auth/confirm` });
  if (error) throw error;
  user = data.user!;
  console.log(`Convite enviado para ${email}.`);
}
const { error } = await sb.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
if (error) throw error;
console.log(`Papel "${role}" atribuído a ${email}.`);
