import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase/admin";
import { detectFileType, EXT, MAX_POSTER_BYTES, POSTER_TYPES } from "../files";
import { processPoster } from "../images";
import { AppError } from "../errors";

export function stagingPath(userId: string, fileName: string) {
  const ext = (/\.(jpe?g|png|webp)$/i.exec(fileName)?.[1] ?? "bin").toLowerCase().replace("jpeg", "jpg");
  return `staging/${userId}/${randomUUID()}.${ext}`;
}

/**
 * Finaliza um upload de cartaz já enviado (directamente do navegador) para o bucket privado "originals".
 * Valida o conteúdo REAL do ficheiro, gera versões optimizadas e regista a imagem.
 */
export async function finalizePosterUpload(opts: {
  stagingPath: string;
  userId: string;
  eventId: string | null;
  kind: "poster" | "gallery";
  title: string | null;
  replaceImageId: string | null;
}) {
  const admin = supabaseAdmin();
  if (!opts.stagingPath.startsWith(`staging/${opts.userId}/`) || opts.stagingPath.includes("..")) {
    throw new AppError("FORBIDDEN", 403);
  }
  const { data: blob, error: dlErr } = await admin.storage.from("originals").download(opts.stagingPath);
  if (dlErr || !blob) throw dlErr ?? new AppError("INVALID_IMAGE");
  const buf = Buffer.from(await blob.arrayBuffer());

  const discard = () => admin.storage.from("originals").remove([opts.stagingPath]);
  if (buf.length > MAX_POSTER_BYTES) {
    await discard();
    throw new AppError("IMAGE_TOO_LARGE");
  }
  const type = detectFileType(buf);
  if (!type || !POSTER_TYPES.includes(type)) {
    await discard();
    throw new AppError("IMAGE_INVALID_TYPE");
  }

  let processed;
  try {
    processed = await processPoster(buf);
  } catch {
    await discard();
    throw new AppError("INVALID_IMAGE");
  }

  const id = randomUUID();
  const originalPath = `posters/${id}.${EXT[type]}`;
  const displayPath = `${id}/display.webp`;
  const thumbPath = `${id}/thumb.webp`;

  const mv = await admin.storage.from("originals").move(opts.stagingPath, originalPath);
  if (mv.error) throw mv.error;
  const up1 = await admin.storage.from("posters").upload(displayPath, processed.display, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (up1.error) throw up1.error;
  const up2 = await admin.storage.from("posters").upload(thumbPath, processed.thumb, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (up2.error) throw up2.error;

  const { error: insErr } = await admin.from("event_images").insert({
    id,
    event_id: opts.eventId,
    kind: opts.kind,
    title: opts.title,
    original_path: originalPath,
    display_path: displayPath,
    thumb_path: thumbPath,
    width: processed.width,
    height: processed.height,
    mime_type: type,
    size_bytes: buf.length,
    show_in_gallery: true,
    created_by: opts.userId,
  });
  if (insErr) throw insErr;

  if (opts.kind === "poster" && opts.eventId) {
    const { error } = await admin.from("events").update({ poster_image_id: id }).eq("id", opts.eventId);
    if (error) throw error;
  }
  if (opts.replaceImageId) await deleteImage(opts.replaceImageId);
  return { id, displayPath, thumbPath, width: processed.width, height: processed.height };
}

export async function deleteImage(imageId: string) {
  const admin = supabaseAdmin();
  const { data: img } = await admin.from("event_images").select("*").eq("id", imageId).maybeSingle();
  if (!img) return;
  await admin.from("events").update({ poster_image_id: null }).eq("poster_image_id", imageId);
  const { error } = await admin.from("event_images").delete().eq("id", imageId);
  if (error) throw error;
  // Os cartazes iniciais incluídos no site (caminhos "/posters/…") não estão no Storage.
  const stored = [img.display_path, img.thumb_path].filter((p: string) => !p.startsWith("/"));
  if (stored.length) await admin.storage.from("posters").remove(stored);
  if (!img.original_path.startsWith("seed/")) await admin.storage.from("originals").remove([img.original_path]);
}
