import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Alert, Container } from "@/components/ui/primitives";
import { CheckoutClient } from "./checkout-client";
import { getEventById } from "@/lib/data/events";
import { isOnSale } from "@/lib/data/site";
import { todayInMaputo } from "@/lib/format";
import { availableOf } from "@/lib/types";

export const metadata: Metadata = { title: "Comprar bilhetes", robots: { index: false } };

export default async function CheckoutPage(props: PageProps<"/checkout/[eventId]">) {
  const { eventId } = await props.params;
  const event = await getEventById(eventId);
  if (!event) notFound();
  const open = isOnSale(event) && event.event_date >= todayInMaputo();

  return (
    <div className="pt-28 sm:pt-32">
      <Container className="max-w-5xl">
        <Link href={`/eventos/${event.slug}`} className="inline-flex items-center gap-2 text-sm text-mute hover:text-white">
          <ArrowLeft className="size-4" /> {event.name}
        </Link>
        <h1 className="mt-6 font-display text-5xl uppercase sm:text-7xl">Comprar bilhetes</h1>
        {!open ? (
          <Alert tone="warning" className="mt-8" title="Vendas encerradas">
            Este evento não está a aceitar novas compras de momento.
          </Alert>
        ) : (
          <CheckoutClient
            event={{
              id: event.id,
              name: event.name,
              eventDate: event.event_date,
              startTime: event.start_time,
              venue: event.venue,
              maxPerOrder: event.max_tickets_per_order,
            }}
            types={event.ticket_types.map((t) => ({
              id: t.id,
              name: t.name,
              category: t.category,
              description: t.description,
              priceCents: Number(t.price_cents),
              maxPerOrder: t.max_per_order,
              available: availableOf(t),
            }))}
          />
        )}
      </Container>
    </div>
  );
}
