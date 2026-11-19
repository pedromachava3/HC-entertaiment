import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { PageHero } from "@/components/site/page-hero";
import { GalleryGrid, type GalleryEntry } from "@/components/site/gallery-grid";
import { getGallery } from "@/lib/data/events";
import { posterUrl } from "@/lib/storage";
import { formatDateLong } from "@/lib/format";

export const metadata: Metadata = {
  title: "Galeria",
  description: "Cartazes dos eventos produzidos pela HC Entertainment, por ordem cronológica.",
  alternates: { canonical: "/galeria" },
};

export default async function GalleryPage() {
  const images = await getGallery();
  const items: GalleryEntry[] = images
    .map((img) => ({
      id: img.id,
      full: posterUrl(img.display_path) ?? "",
      thumb: posterUrl(img.thumb_path) ?? "",
      width: img.width,
      height: img.height,
      caption: img.event ? `${img.event.name} — ${formatDateLong(img.event.event_date, false)}` : img.title ?? "HC Entertainment",
      year: (img.event?.event_date ?? img.created_at).slice(0, 4),
    }))
    .filter((i) => i.full);

  return (
    <>
      <PageHero eyebrow="Arquivo" title="Galeria" intro="Os cartazes das nossas festas, organizados por ordem cronológica." />
      <Container>
        {items.length ? <GalleryGrid items={items} /> : <p className="text-mute">A galeria será actualizada em breve.</p>}
      </Container>
    </>
  );
}
