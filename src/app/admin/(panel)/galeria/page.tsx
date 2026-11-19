/* eslint-disable @next/next/no-img-element */
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { PosterUploader } from "@/components/admin/poster-uploader";
import { GalleryItemActions } from "@/components/admin/gallery-item-actions";
import { Badge, Card } from "@/components/ui/primitives";
import { posterUrl } from "@/lib/storage";
import { formatDateShort } from "@/lib/format";

export default async function AdminGallery() {
  await requireAdmin();
  const admin = supabaseAdmin();
  const [{ data: images }, { data: posters }] = await Promise.all([
    admin.from("event_images").select("*, event:events!event_images_event_id_fkey(name, event_date)").order("created_at", { ascending: false }),
    admin.from("events").select("poster_image_id").not("poster_image_id", "is", null),
  ]);
  const posterIds = new Set((posters ?? []).map((p) => p.poster_image_id));
  const list = (images ?? []) as { id: string; thumb_path: string; title: string | null; show_in_gallery: boolean; kind: string; width: number; height: number; size_bytes: number; event: { name: string; event_date: string } | null }[];

  return (
    <div>
      <PageHeader title="Galeria" description="Cartazes e imagens. Para o cartaz principal de um evento, use a página do evento." />
      <Card className="mb-8 max-w-xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/60">Adicionar imagem à galeria</h2>
        <PosterUploader eventId={null} kind="gallery" label="Carregar imagem" withTitle />
      </Card>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((img) => (
          <Card key={img.id} className="overflow-hidden">
            <img src={posterUrl(img.thumb_path) ?? ""} alt={img.title ?? img.event?.name ?? ""} loading="lazy" className={`aspect-[4/5] w-full object-cover ${img.show_in_gallery ? "" : "opacity-40"}`} />
            <div className="space-y-1 p-3 text-xs">
              <p className="truncate font-semibold">{img.event?.name ?? img.title ?? "Sem título"}</p>
              <p className="text-white/40">{img.event ? formatDateShort(img.event.event_date) : "Galeria geral"} · {img.width}×{img.height} · {(img.size_bytes / 1024 / 1024).toFixed(1)} MB</p>
              <div className="flex items-center justify-between">
                {posterIds.has(img.id) ? <Badge tone="red">Cartaz</Badge> : <span />}
                <GalleryItemActions id={img.id} visible={img.show_in_gallery} isPoster={posterIds.has(img.id)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
