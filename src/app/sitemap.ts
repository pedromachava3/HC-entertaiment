import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import { getPastEvents, getUpcomingEvents } from "@/lib/data/events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = publicEnv().siteUrl;
  const statics = ["", "/eventos", "/galeria", "/sobre", "/contactos", "/termos", "/privacidade", "/reembolsos", "/acesso"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));
  const events = [...(await getUpcomingEvents().catch(() => [])), ...(await getPastEvents().catch(() => []))];
  return [
    ...statics,
    ...events.map((e) => ({ url: `${base}/eventos/${e.slug}`, lastModified: e.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
