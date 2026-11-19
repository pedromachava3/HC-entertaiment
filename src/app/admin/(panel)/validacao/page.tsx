import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { Scanner } from "./scanner";

export default async function ValidationPage() {
  await requireStaff();
  return (
    <div>
      <PageHeader title="Validação" description="Leia o QR Code do bilhete. A entrada só fica registada depois de confirmar." />
      <Scanner />
    </div>
  );
}
