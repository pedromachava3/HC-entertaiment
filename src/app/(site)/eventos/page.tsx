import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { EventCard } from "@/components/site/event-card";
import { PageHero } from "@/components/site/page-hero";
import { getPastEvents, getUpcomingEvents } from "@/lib/data/events";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Próximos eventos e festas realizadas pela HC Entertainment.",
  alternates: { canonical: "/eventos" },
};

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents()]);
  return (
    <>
      <PageHero eyebrow="Agenda" title="Eventos" intro="Garanta o seu lugar nas próximas festas e reviva as edições anteriores." />
      <Container className="space-y-20">
        <section aria-labelledby="proximos">
          <h2 id="proximos" className="mb-8 font-display text-3xl uppercase">Próximos eventos</h2>
          {upcoming.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <p className="text-mute">Novos eventos serão anunciados em breve.</p>
          )}
        </section>
        {past.length ? (
          <section aria-labelledby="anteriores">
            <h2 id="anteriores" className="mb-2 font-display text-3xl uppercase">Eventos realizados</h2>
            <p className="mb-8 text-sm text-mute">Por ordem cronológica.</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((e) => <EventCard key={e.id} event={e} past />)}
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}
