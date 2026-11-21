/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin, MessageCircle, Sparkles, Ticket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge, Container, Eyebrow, SectionTitle } from "@/components/ui/primitives";
import { Poster } from "@/components/site/poster";
import { Countdown } from "@/components/site/countdown";
import { Marquee } from "@/components/site/marquee";
import { COMPANY } from "@/lib/config";
import { getPastEvents } from "@/lib/data/events";
import { getFeaturedEvent, isOnSale } from "@/lib/data/site";
import { eventStartInstant, formatDateLong, formatMZN, formatTime, monthShort } from "@/lib/format";
import { posterUrl } from "@/lib/storage";
import { publicEnv } from "@/lib/env";
import { availableOf } from "@/lib/types";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [featured, past] = await Promise.all([
    getFeaturedEvent(),
    getPastEvents().catch(() => []),
  ]);
  const onSale = featured ? isOnSale(featured) : false;
  const buyHref = featured && onSale ? `/checkout/${featured.id}` : "/eventos";
  const bg = posterUrl(featured?.poster?.thumb_path);

  const site = publicEnv().siteUrl;
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}/#organizacao`,
        name: COMPANY.name,
        alternateName: [COMPANY.fullName, "HC", "Hot Crazy"],
        url: site,
        logo: `${site}/brand/hc-logo.png`,
        slogan: COMPANY.slogan,
        description: COMPANY.tagline,
        telephone: COMPANY.whatsapp.e164,
        address: { "@type": "PostalAddress", addressLocality: "Matola", addressRegion: "Maputo", addressCountry: "MZ" },
        contactPoint: { "@type": "ContactPoint", telephone: COMPANY.whatsapp.e164, contactType: "customer service", availableLanguage: ["Portuguese"] },
      },
      { "@type": "WebSite", "@id": `${site}/#website`, url: site, name: COMPANY.name, inLanguage: "pt-MZ", publisher: { "@id": `${site}/#organizacao` } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }} />
      {/* ================= HERO ================= */}
      <section className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-36 lg:min-h-[100dvh] lg:pb-28">
        {bg ? (
          <img src={bg} alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-25 blur-3xl" />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
        <div className="absolute -left-40 top-20 -z-10 size-[520px] animate-glow rounded-full bg-hc-red/25 blur-[120px]" />
        <div className="grain absolute inset-0 -z-10 opacity-60" />

        <Container className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Eyebrow className="animate-fade-up">
              <span className="h-px w-10 bg-hc-red" /> {COMPANY.fullName} · {COMPANY.location}
            </Eyebrow>
            <h1 className="mt-6 animate-fade-up font-display text-[13.5vw] uppercase leading-[0.9] [animation-delay:80ms] sm:text-[11vw] lg:text-[8.5rem]">
              <span className="text-hc-red">HC</span> <span className="block sm:inline">Entertainment</span>
            </h1>
            <p className="mt-6 animate-fade-up font-display text-3xl uppercase tracking-wide [animation-delay:160ms] sm:text-5xl">
              {COMPANY.slogan}
            </p>
            <p className="mt-5 max-w-xl animate-fade-up text-base text-white/70 [animation-delay:220ms] sm:text-lg">
              “{COMPANY.tagline}”
            </p>
            <div className="mt-10 flex animate-fade-up flex-col gap-3 [animation-delay:280ms] sm:flex-row">
              <Link href="/eventos" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Explorar Eventos <ArrowRight />
              </Link>
              <Link href={buyHref} className={buttonVariants({ size: "lg" })}>
                <Ticket /> Comprar Bilhetes
              </Link>
            </div>
          </div>

          {featured ? (
            <Link
              href={`/eventos/${featured.slug}`}
              className="group relative mx-auto block w-full max-w-sm animate-fade-up [animation-delay:200ms] lg:max-w-md"
              aria-label={`Ver o evento ${featured.name}`}
            >
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-hc-red/30 blur-2xl transition group-hover:bg-hc-red/45" />
              <div className="overflow-hidden rounded-3xl border border-white/15 shadow-2xl transition duration-500 lg:rotate-2 lg:group-hover:rotate-0">
                <Poster image={featured.poster} alt={`Cartaz: ${featured.name}`} priority sizes="(max-width: 1024px) 90vw, 40vw" />
              </div>
              <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-xl">
                <Sparkles className="size-4 text-hc-red" /> Próximo evento · {featured.event_date.slice(8, 10)} {monthShort(featured.event_date)}
              </div>
            </Link>
          ) : null}
        </Container>
      </section>

      {featured && featured.lineup.length > 0 ? <Marquee items={featured.lineup} /> : null}

      {/* ================= PRÓXIMO EVENTO ================= */}
      <section id="proximo-evento" className="py-24">
        <Container>
          <Eyebrow><span className="h-px w-10 bg-hc-red" /> Próximo evento</Eyebrow>
          {featured ? (
            <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div className="overflow-hidden rounded-3xl border border-white/10">
                <Poster image={featured.poster} alt={`Cartaz: ${featured.name}`} sizes="(max-width: 1024px) 100vw, 45vw" />
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap gap-2">
                  {onSale ? <Badge tone="red">Pré-venda aberta</Badge> : <Badge tone="grey">Vendas em breve</Badge>}
                  {featured.status === "ongoing" ? <Badge tone="green">A decorrer</Badge> : null}
                </div>
                <SectionTitle className="mt-4 sm:text-7xl">{featured.name}</SectionTitle>
                <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                  <InfoItem icon={<Calendar />} label="Data" value={formatDateLong(featured.event_date)} />
                  <InfoItem icon={<Clock />} label="Horário" value={formatTime(featured.start_time) ?? "A definir"} />
                  <InfoItem
                    icon={<MapPin />}
                    label="Local"
                    value={featured.venue ?? "A definir"}
                    sub={[featured.address, featured.city].filter(Boolean).join(", ") || undefined}
                    className="sm:col-span-2"
                  />
                </dl>

                <div className="mt-8">
                  <Countdown targetIso={eventStartInstant(featured.event_date, featured.start_time).toISOString()} />
                </div>

                {featured.ticket_types.length > 0 ? (
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {featured.ticket_types.map((t) => {
                      const soldOut = availableOf(t) === 0;
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "relative overflow-hidden rounded-2xl border p-5",
                            t.category === "vip" ? "border-hc-red/50 bg-gradient-to-br from-hc-red/20 to-transparent" : "border-white/10 bg-coal",
                          )}
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">Bilhete</p>
                          <p className="font-display text-3xl uppercase">{t.name}</p>
                          <p className="mt-2 text-2xl font-bold">{formatMZN(t.price_cents)}</p>
                          {t.description ? <p className="mt-2 text-sm text-mute">{t.description}</p> : null}
                          {soldOut ? <Badge tone="grey" className="mt-3">Esgotado</Badge> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {featured.door_info ? <p className="mt-4 text-sm text-mute">{featured.door_info}</p> : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {onSale ? (
                    <Link href={`/checkout/${featured.id}`} className={buttonVariants({ size: "lg" })}>
                      <Ticket /> Comprar
                    </Link>
                  ) : null}
                  <Link href={`/eventos/${featured.slug}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                    Ver detalhes <ArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-mute">Novos eventos serão anunciados em breve.</p>
          )}
        </Container>
      </section>

      {/* ================= EVENTOS ANTERIORES ================= */}
      {past.length > 0 ? (
        <section className="border-t border-white/[0.06] py-24">
          <Container>
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <Eyebrow><span className="h-px w-10 bg-hc-red" /> Linha do tempo</Eyebrow>
                <SectionTitle className="mt-4">Eventos anteriores</SectionTitle>
                <p className="mt-3 max-w-lg text-mute">As festas que já fizemos acontecer, por ordem cronológica.</p>
              </div>
              <Link href="/galeria" className={buttonVariants({ variant: "outline" })}>
                Ver galeria <ArrowRight />
              </Link>
            </div>
          </Container>
          <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            {past.map((e, i) => (
              <Link
                key={e.id}
                href={`/eventos/${e.slug}`}
                className="group relative w-[72vw] shrink-0 snap-start sm:w-[320px]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-display text-4xl text-hc-red">{e.event_date.slice(0, 4)}</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent" />
                  <span className="text-xs text-white/40">#{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:border-hc-red/60">
                  <Poster image={e.poster} alt={`Cartaz: ${e.name}`} className="aspect-[4/5]" sizes="320px" />
                </div>
                <p className="mt-3 font-semibold">{e.name}</p>
                <p className="text-sm text-mute">{formatDateLong(e.event_date, false)}{e.venue ? ` · ${e.venue}` : ""}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ================= SOBRE ================= */}
      <section className="py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow><span className="h-px w-10 bg-hc-red" /> Sobre nós</Eyebrow>
            <SectionTitle className="mt-4">Hot Crazy<br /><span className="text-outline">Entertainment</span></SectionTitle>
          </div>
          <div className="space-y-5 text-lg text-white/75">
            <p>
              A HC Entertainment é uma empresa de produção, promoção e organização de eventos sediada na Matola,
              Moçambique. Produzimos experiências, criamos momentos e transformamos eventos em memórias inesquecíveis.
            </p>
            {past.length > 0 ? (
              <p className="text-base text-mute">
                {past.length} {past.length === 1 ? "evento realizado" : "eventos realizados"} registados nesta plataforma.
              </p>
            ) : null}
            <Link href="/sobre" className={buttonVariants({ variant: "outline" })}>
              Conhecer a HC <ArrowRight />
            </Link>
          </div>
        </Container>
      </section>

      {/* ================= CTA ================= */}
      <section className="pb-8">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-hc-red/30 bg-gradient-to-br from-hc-red/25 via-coal to-coal p-8 sm:p-14">
            <div className="absolute -right-20 -top-20 size-72 rounded-full bg-hc-red/30 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-display text-4xl uppercase sm:text-6xl">{COMPANY.slogan}</p>
                <p className="mt-3 max-w-lg text-white/70">Dúvidas sobre bilhetes, reservas ou parcerias? Fale connosco pelo WhatsApp.</p>
              </div>
              <a href={COMPANY.whatsapp.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                <MessageCircle /> {COMPANY.whatsapp.display}
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function InfoItem({
  icon, label, value, sub, className,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={cn("flex gap-4 rounded-2xl border border-white/[0.07] bg-coal/60 p-4", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hc-red/15 text-hc-red [&_svg]:size-5">{icon}</span>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</dt>
        <dd className="mt-0.5 font-semibold">{value}</dd>
        {sub ? <dd className="text-sm text-mute">{sub}</dd> : null}
      </div>
    </div>
  );
}
