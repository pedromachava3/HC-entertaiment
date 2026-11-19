import "server-only";
import { getUpcomingEvents } from "./events";
import type { EventWithRelations } from "../types";

export function isOnSale(e: EventWithRelations) {
  return e.status === "published" && e.sales_status === "open" && e.ticket_types.length > 0;
}

/** Próximo evento com vendas abertas (ou o próximo evento publicado). */
export async function getFeaturedEvent(): Promise<EventWithRelations | null> {
  try {
    const list = await getUpcomingEvents();
    return list.find(isOnSale) ?? list[0] ?? null;
  } catch (e) {
    console.error("getFeaturedEvent", e);
    return null;
  }
}

export async function getBuyHref(): Promise<string> {
  const e = await getFeaturedEvent();
  return e && isOnSale(e) ? `/checkout/${e.id}` : "/eventos";
}
