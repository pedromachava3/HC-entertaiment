import { publicEnv } from "./env";

/** URL público de um ficheiro do bucket "posters". */
export function posterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Cartazes iniciais incluídos no próprio site (public/posters/…)
  if (path.startsWith("/")) return path;
  const { supabaseUrl } = publicEnv();
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/posters/${path.split("/").map(encodeURIComponent).join("/")}`;
}
