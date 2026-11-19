/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, Card } from "@/components/ui/primitives";
import { EventForm } from "@/components/admin/event-form";
import { EventStatusActions } from "@/components/admin/event-status-actions";
import { TicketTypesManager } from "@/components/admin/ticket-types-manager";
import { PosterUploader } from "@/components/admin/poster-uploader";
import { updateEventAction } from "@/app/admin/actions";
import { posterUrl } from "@/lib/storage";
import { EVENT_STATUS_LABEL, type EventWithRelations } from "@/lib/types";

export default async function EditEvent(props: PageProps<"/admin/eventos/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await supabaseAdmin()
    .from("events")
    .select("*, poster:event_images!events_poster_fk(*), ticket_types(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const event = data as EventWithRelations;
  event.ticket_types.sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents);
  const poster = posterUrl(event.poster?.display_path);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/eventos" className="mb-4 inline-flex items-center gap-2 text-sm text-mute hover:text-white"><ArrowLeft className="size-4" /> Eventos</Link>
      <PageHeader
        title={event.name}
        description={`/eventos/${event.slug}`}
        actions={<Link href={`/eventos/${event.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-mute hover:text-white">Ver no site <ExternalLink className="size-4" /></Link>}
      />
      <div className="grid gap-6">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-sm font-semibold uppercase tracking-wider text-white/60">Estado</h2>
            <Badge tone={event.status === "published" ? "green" : event.status === "cancelled" ? "red" : "grey"}>{EVENT_STATUS_LABEL[event.status]}</Badge>
            <Badge tone={event.sales_status === "open" ? "red" : "grey"}>{event.sales_status === "open" ? "Vendas abertas" : "Vendas encerradas"}</Badge>
            {event.is_archived ? <Badge tone="grey">Arquivado</Badge> : null}
          </div>
          <EventStatusActions event={event} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-white/60">Informação</h2>
            <EventForm event={event} action={updateEventAction} />
          </Card>
          <Card className="h-fit p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Cartaz principal</h2>
            {poster ? <img src={poster} alt="Cartaz actual" className="mb-4 w-full rounded-xl" /> : null}
            <PosterUploader eventId={event.id} kind="poster" replaceImageId={event.poster?.id ?? null} label={poster ? "Substituir cartaz" : "Carregar cartaz"} />
            <p className="mt-3 text-xs text-white/40">O cartaz é mostrado tal como foi criado: sem cortes nem alterações ao texto, datas, preços ou logótipos.</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-white/60">Bilhetes, preços e limites</h2>
          <TicketTypesManager eventId={event.id} types={event.ticket_types} />
        </Card>
      </div>
    </div>
  );
}
