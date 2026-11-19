/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { formatDateShort } from "@/lib/format";
import { posterUrl } from "@/lib/storage";
import { EVENT_STATUS_LABEL, type EventWithRelations } from "@/lib/types";

export default async function AdminEvents(props: PageProps<"/admin/eventos">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const showArchived = sp.arquivados === "1";
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("*, poster:event_images!events_poster_fk(*), ticket_types(*)")
    .eq("is_archived", showArchived)
    .order("event_date", { ascending: false });
  if (error) throw error;
  const events = (data ?? []) as EventWithRelations[];

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Criar, editar, publicar, cancelar e arquivar eventos."
        actions={<>
          <Link href={showArchived ? "/admin/eventos" : "/admin/eventos?arquivados=1"} className={buttonVariants({ variant: "ghost" })}>{showArchived ? "Ver activos" : "Ver arquivados"}</Link>
          <Link href="/admin/eventos/novo" className={buttonVariants()}><Plus /> Novo evento</Link>
        </>}
      />
      <div className="grid gap-3">
        {events.length === 0 ? <p className="text-mute">Nenhum evento.</p> : null}
        {events.map((e) => {
          const sold = e.ticket_types.reduce((s, t) => s + t.quantity_sold, 0);
          const thumb = posterUrl(e.poster?.thumb_path);
          return (
            <Link key={e.id} href={`/admin/eventos/${e.id}`}>
              <Card className="flex items-center gap-4 p-3 transition hover:border-hc-red/50">
                {thumb ? <img src={thumb} alt="" className="h-20 w-16 rounded-lg object-cover" /> : <div className="h-20 w-16 rounded-lg bg-white/5" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className="text-sm text-mute">{formatDateShort(e.event_date)}{e.venue ? ` · ${e.venue}` : ""}</p>
                </div>
                <div className="hidden text-right text-sm sm:block">
                  <p className="text-white/50">Vendidos</p>
                  <p className="font-semibold">{sold}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={e.status === "published" ? "green" : e.status === "cancelled" ? "red" : "grey"}>{EVENT_STATUS_LABEL[e.status]}</Badge>
                  {e.sales_status === "open" ? <Badge tone="red">Vendas abertas</Badge> : null}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
