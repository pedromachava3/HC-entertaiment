import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ManualSaleForm } from "@/components/admin/manual-sale-form";
import { Card } from "@/components/ui/primitives";
import { formatDateShort, todayInMaputo } from "@/lib/format";
import { availableOf, type EventWithRelations } from "@/lib/types";

export default async function NewManualSale() {
  await requireAdmin();
  const { data } = await supabaseAdmin()
    .from("events")
    .select("*, ticket_types(*)")
    .eq("status", "published")
    .eq("sales_status", "open")
    .eq("is_archived", false)
    .gte("event_date", todayInMaputo())
    .order("event_date");
  const events = ((data ?? []) as EventWithRelations[]).map((e) => ({
    id: e.id,
    name: e.name,
    date: formatDateShort(e.event_date),
    types: e.ticket_types
      .filter((t) => t.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({ id: t.id, name: t.name, priceCents: Number(t.price_cents), available: availableOf(t) })),
  }));
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Registar venda"
        description="Para clientes que transferiram por M-Pesa/e-Mola e enviaram o comprovativo pelo WhatsApp. Os bilhetes são emitidos de imediato."
      />
      <Card className="p-6"><ManualSaleForm events={events} /></Card>
    </div>
  );
}
