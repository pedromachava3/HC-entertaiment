import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin } from "lucide-react";
import { Poster } from "./poster";
import { Badge } from "@/components/ui/primitives";
import { formatDateShort, formatMZN, formatTime, monthShort } from "@/lib/format";
import type { EventWithRelations } from "@/lib/types";

export function EventCard({ event, past = false }: { event: EventWithRelations; past?: boolean }) {
  const minPrice = event.ticket_types.length ? Math.min(...event.ticket_types.map((t) => t.price_cents)) : null;
  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-coal transition duration-300 hover:-translate-y-1 hover:border-hc-red/50 hover:shadow-[0_20px_60px_-20px_rgba(255,16,16,0.35)]"
    >
      <div className="relative overflow-hidden">
        <Poster
          image={event.poster}
          alt={`Cartaz: ${event.name}`}
          className={`aspect-[4/5] transition duration-500 group-hover:scale-[1.03] ${past ? "grayscale-[35%] group-hover:grayscale-0" : ""}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-ink/85 px-3 py-2 text-center backdrop-blur">
          <span className="font-display text-2xl leading-none">{event.event_date.slice(8, 10)}</span>
          <span className="text-[10px] font-bold tracking-widest text-hc-red">{monthShort(event.event_date)}</span>
          <span className="text-[10px] text-white/50">{event.event_date.slice(0, 4)}</span>
        </div>
        {event.status === "cancelled" ? (
          <Badge tone="red" className="absolute right-3 top-3">Cancelado</Badge>
        ) : past ? (
          <Badge tone="grey" className="absolute right-3 top-3 bg-ink/80">Realizado</Badge>
        ) : event.sales_status === "open" ? (
          <Badge tone="red" className="absolute right-3 top-3 bg-ink/80">Vendas abertas</Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-2xl uppercase leading-tight">{event.name}</h3>
        <div className="space-y-1.5 text-sm text-mute">
          <p className="flex items-center gap-2">
            <Calendar className="size-4 text-hc-red" /> {formatDateShort(event.event_date)}
            {event.start_time ? ` · ${formatTime(event.start_time)}` : ""}
          </p>
          {event.venue ? (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-hc-red" /> {event.venue}
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          {!past && minPrice !== null ? (
            <span className="text-sm">
              <span className="text-white/50">Desde </span>
              <span className="font-bold">{formatMZN(minPrice)}</span>
            </span>
          ) : (
            <span className="text-xs uppercase tracking-widest text-white/40">Ver cartaz</span>
          )}
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 transition group-hover:border-hc-red group-hover:bg-hc-red">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
