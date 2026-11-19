import "server-only";
import { supabasePublic } from "../supabase/public";
import { isPublicSupabaseConfigured as isSupabaseConfigured } from "../env";
import { todayInMaputo } from "../format";
import type { EventWithRelations, ImageRow } from "../types";

const SELECT = "*, poster:event_images!events_poster_fk(*), ticket_types(*)";

function normalize(rows: unknown[] | null): EventWithRelations[] {
  return ((rows ?? []) as EventWithRelations[]).map((e) => ({
    ...e,
    lineup: e.lineup ?? [],
    ticket_types: [...(e.ticket_types ?? [])]
      .filter((t) => t.is_active)
      .sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents),
  }));
}

/** Próximos eventos (publicados ou a decorrer, data >= hoje), por ordem cronológica. */
export async function getUpcomingEvents(): Promise<EventWithRelations[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabasePublic()
    .from("events")
    .select(SELECT)
    .in("status", ["published", "ongoing"])
    .gte("event_date", todayInMaputo())
    .order("event_date", { ascending: true });
  if (error) throw error;
  return normalize(data);
}

/** Eventos realizados, por ordem cronológica (do mais antigo para o mais recente). */
export async function getPastEvents(): Promise<EventWithRelations[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabasePublic()
    .from("events")
    .select(SELECT)
    .or(`status.eq.completed,event_date.lt.${todayInMaputo()}`)
    .neq("status", "cancelled")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return normalize(data);
}

export async function getEventBySlug(slug: string): Promise<EventWithRelations | null> {
  if (!isSupabaseConfigured() || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data, error } = await supabasePublic().from("events").select(SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? normalize([data])[0] : null;
}

export async function getEventById(id: string): Promise<EventWithRelations | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabasePublic().from("events").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalize([data])[0] : null;
}

export type GalleryItem = ImageRow & { event: { name: string; slug: string; event_date: string } | null };

/** Imagens da galeria com o respectivo evento, por ordem cronológica do evento. */
export async function getGallery(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabasePublic()
    .from("event_images")
    .select("*, event:events!event_images_event_id_fkey(name, slug, event_date)")
    .eq("show_in_gallery", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const items = (data ?? []) as GalleryItem[];
  return items.sort((a, b) => {
    const da = a.event?.event_date ?? a.created_at.slice(0, 10);
    const db = b.event?.event_date ?? b.created_at.slice(0, 10);
    return da.localeCompare(db) || a.sort_order - b.sort_order;
  });
}
