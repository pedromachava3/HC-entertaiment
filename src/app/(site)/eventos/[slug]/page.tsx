import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Badge, Container } from "@/components/ui/primitives";
import { Poster } from "@/components/site/poster";
import { Countdown } from "@/components/site/countdown";
import { ManualPurchase } from "@/components/site/manual-purchase";
import { getEventBySlug } from "@/lib/data/events";
import { isOnSale } from "@/lib/data/site";
import { eventStartInstant, formatDateLong, formatMZN, formatTime, todayInMaputo } from "@/lib/format";
import { posterUrl } from "@/lib/storage";
import { availableOf, EVENT_STATUS_LABEL } from "@/lib/types";
import { COMPANY } from "@/lib/config";
import { publicEnv } from "@/lib/env";

function absUrl(u: string | null) {
  if (!u) return null;
  return u.startsWith("/") ? `${publicEnv().siteUrl}${u}` : u;
}

export async function generateMetadata(props: PageProps<"/eventos/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const e = await getEventBySlug(slug).catch(() => null);
  if (!e) return { title: "Evento não encontrado" };
  const img = posterUrl(e.poster?.display_path);
  const desc = `${formatDateLong(e.event_date)}${e.venue ? ` · ${e.venue}` : ""}. ${COMPANY.name}.`;
  return {
    title: `${e.name} — ${formatDateLong(e.event_date, false)}`,
    description: desc,
    alternates: { canonical: `/eventos/${e.slug}` },
    openGraph: { title: e.name, description: desc, images: img ? [{ url: img }] : undefined },
  };
}

export default async function EventPage(props: PageProps<"/eventos/[slug]">) {
  const { slug } = await props.params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const isPast = event.status === "completed" || event.event_date < todayInMaputo();
  const onSale = isOnSale(event) && !isPast;
  const place = [event.address, event.city].filter(Boolean).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: eventStartInstant(event.event_date, event.start_time).toISOString(),
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: event.description ?? `${event.name} — ${COMPANY.name}`,
    location: {
      "@type": "Place",
      name: event.venue ?? "A definir",
      address: { "@type": "PostalAddress", streetAddress: place || undefined, addressLocality: event.city ?? undefined, addressCountry: "MZ" },
    },
    image: [absUrl(posterUrl(event.poster?.display_path))].filter(Boolean),
    organizer: { "@type": "Organization", name: COMPANY.name, url: publicEnv().siteUrl },
    performer: event.lineup.slice(0, 10).map((n) => ({ "@type": "PerformingGroup", name: n })),
    offers: event.ticket_types.map((t) => ({
      "@type": "Offer", name: t.name, price: t.price_cents / 100, priceCurrency: "MZN",
      url: `${publicEnv().siteUrl}/eventos/${event.slug}`,
      availability: availableOf(t) > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    })),
  };

  return (
    <div className="pt-28 sm:pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Container>
        <Link href="/eventos" className="inline-flex items-center gap-2 text-sm text-mute hover:text-white">
          <ArrowLeft className="size-4" /> Todos os eventos
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <Poster image={event.poster} alt={`Cartaz: ${event.name}`} priority fit="contain" sizes="(max-width: 1024px) 100vw, 45vw" />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {event.status === "cancelled" ? <Badge tone="red">Cancelado</Badge> : isPast ? <Badge tone="grey">Realizado</Badge> : onSale ? <Badge tone="red">Vendas abertas</Badge> : <Badge tone="grey">{EVENT_STATUS_LABEL[event.status]}</Badge>}
            </div>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] sm:text-7xl">{event.name}</h1>

            <ul className="mt-8 space-y-3 text-white/85">
              <li className="flex items-center gap-3"><Calendar className="size-5 text-hc-red" /> {formatDateLong(event.event_date)}</li>
              <li className="flex items-center gap-3"><Clock className="size-5 text-hc-red" /> {formatTime(event.start_time) ?? "Horário a definir"}</li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-hc-red" />
                <span>{event.venue ?? "Local a definir"}{place ? <span className="block text-sm text-mute">{place}</span> : null}</span>
              </li>
            </ul>

            {!isPast && event.status !== "cancelled" ? (
              <div className="mt-8"><Countdown targetIso={eventStartInstant(event.event_date, event.start_time).toISOString()} /></div>
            ) : null}

            {event.status === "cancelled" ? (
              <Alert tone="error" className="mt-8" title="Evento cancelado">
                Este evento foi cancelado. Para questões sobre bilhetes adquiridos, contacte a HC Entertainment pelo WhatsApp {COMPANY.whatsapp.display}.
              </Alert>
            ) : null}

            {event.description ? (
              <div className="mt-8 whitespace-pre-line text-white/75">{event.description}</div>
            ) : null}

            {event.lineup.length ? (
              <div className="mt-8">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">Line-up</h2>
                <ul className="flex flex-wrap gap-2">
                  {event.lineup.map((a) => (
                    <li key={a} className="rounded-full border border-white/10 bg-coal px-3.5 py-1.5 text-sm font-semibold">{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!isPast && event.ticket_types.length ? (
              <div className="mt-10">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">Bilhetes</h2>
                <div className="divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/10 bg-coal">
                  {event.ticket_types.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="font-display text-2xl uppercase">{t.name}</p>
                        {t.description ? <p className="text-sm text-mute">{t.description}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatMZN(t.price_cents)}</p>
                        {availableOf(t) === 0 ? <Badge tone="grey">Esgotado</Badge> : null}
                      </div>
                    </div>
                  ))}
                </div>
                {event.door_info ? <p className="mt-3 text-sm text-mute">{event.door_info}</p> : null}
                {onSale ? (
                  <>
                    <Link href={`/checkout/${event.id}`} className={buttonVariants({ size: "lg", className: "mt-6 w-full sm:w-auto" })}>
                      <Ticket /> Comprar bilhetes
                    </Link>
                    <div className="mt-6">
                      <ManualPurchase
                        eventName={event.name}
                        eventDate={event.event_date}
                        types={event.ticket_types.map((t) => ({ name: t.name, priceCents: Number(t.price_cents) }))}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-mute">As vendas online não estão abertas de momento.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  );
}
