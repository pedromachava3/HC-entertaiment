import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { Alert, Card } from "@/components/ui/primitives";
import { PasswordForm } from "./password-form";

export default async function AccountPage(props: PageProps<"/admin/conta">) {
  const user = await requireStaff();
  const sp = await props.searchParams;
  return (
    <div className="max-w-lg">
      <PageHeader title="A minha conta" description={user.email} />
      {sp.novo ? <Alert tone="success" className="mb-6" title="Bem-vindo(a)!">Defina agora a sua palavra-passe para os próximos acessos.</Alert> : null}
      <Card className="p-6">
        <p className="mb-4 text-sm text-mute">Papéis: {user.roles.map((r) => (r === "admin" ? "Administrador" : "Funcionário de validação")).join(", ")}</p>
        <PasswordForm />
      </Card>
    </div>
  );
}
