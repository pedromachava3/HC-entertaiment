/** Detecção do tipo REAL do ficheiro pelos primeiros bytes (não confia na extensão nem no MIME do navegador). */
export type DetectedType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function detectFileType(buf: Uint8Array): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "application/pdf";
  return null;
}

export const EXT: Record<DetectedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const POSTER_TYPES: DetectedType[] = ["image/jpeg", "image/png", "image/webp"];
export const PROOF_TYPES: DetectedType[] = ["image/jpeg", "image/png", "application/pdf"];
export const MAX_POSTER_BYTES = 10 * 1024 * 1024;
/** Limitado a 4 MB porque o upload passa por uma função da Vercel (limite de corpo 4,5 MB). */
export const MAX_PROOF_BYTES = 4 * 1024 * 1024;

export function isAllowedPosterName(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}
