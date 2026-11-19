import "server-only";
import sharp from "sharp";

/**
 * Processamento de cartazes:
 * - corrige a orientação (EXIF) com .rotate();
 * - mantém as proporções (sem recortes) e não altera o conteúdo da imagem;
 * - gera versão web (WebP, máx. 1600 px) e miniatura (WebP, 640 px);
 * - o original é guardado intacto noutro bucket.
 */
export async function processPoster(input: Buffer) {
  const base = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("INVALID_IMAGE");

  const display = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    display: display.data,
    thumb,
    width: display.info.width,
    height: display.info.height,
  };
}
