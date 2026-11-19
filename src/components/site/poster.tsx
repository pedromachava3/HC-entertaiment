/* eslint-disable @next/next/no-img-element */
import { posterUrl } from "@/lib/storage";
import type { ImageRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Cartaz com proporções originais preservadas (object-contain quando necessário),
 * miniaturas responsivas (srcset) e lazy loading.
 */
export function Poster({
  image,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  fit = "cover",
}: {
  image: Pick<ImageRow, "display_path" | "thumb_path" | "width" | "height"> | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fit?: "cover" | "contain";
}) {
  const full = posterUrl(image?.display_path);
  const thumb = posterUrl(image?.thumb_path);
  if (!image || !full) {
    return (
      <div className={cn("flex aspect-[4/5] items-center justify-center bg-coal text-center", className)}>
        <div>
          <p className="font-display text-3xl uppercase text-white/20">Cartaz</p>
          <p className="text-xs uppercase tracking-widest text-white/30">em breve</p>
        </div>
      </div>
    );
  }
  return (
    <img
      src={full}
      srcSet={thumb ? `${thumb} 640w, ${full} ${image.width ?? 1600}w` : undefined}
      sizes={sizes}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("h-auto w-full bg-coal", fit === "contain" ? "object-contain" : "object-cover", className)}
    />
  );
}
