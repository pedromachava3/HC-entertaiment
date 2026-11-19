import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/primitives";
import { EventForm } from "@/components/admin/event-form";
import { createEventAction } from "@/app/admin/actions";

export default async function NewEvent() {
  await requireAdmin();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Novo evento" description="O evento é criado como rascunho. Depois poderá carregar o cartaz, definir bilhetes e publicar." />
      <Card className="p-6"><EventForm action={createEventAction} /></Card>
    </div>
  );
}
