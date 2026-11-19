"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryEntry = { id: string; full: string; thumb: string; width: number | null; height: number | null; caption: string; year: string };

export function GalleryGrid({ items }: { items: GalleryEntry[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => {
    dialogRef.current?.close();
    setIndex(null);
  }, []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const years = [...new Set(items.map((i) => i.year))];
  const current = index !== null ? items[index] : null;

  return (
    <>
      {years.map((year) => (
        <section key={year} className="mb-16" aria-labelledby={`ano-${year}`}>
          <div className="mb-6 flex items-center gap-4">
            <h2 id={`ano-${year}`} className="font-display text-5xl text-hc-red">{year}</h2>
            <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {items.map((it, i) =>
              it.year !== year ? null : (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => open(i)}
                  className="group mb-5 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/10 text-left transition hover:border-hc-red/60"
                  aria-label={`Ampliar: ${it.caption}`}
                >
                  <img
                    src={it.thumb}
                    width={it.width ?? undefined}
                    height={it.height ?? undefined}
                    alt={it.caption}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full transition duration-500 group-hover:scale-[1.02]"
                  />
                  <span className="block bg-coal px-4 py-3 text-sm text-white/80">{it.caption}</span>
                </button>
              ),
            )}
          </div>
        </section>
      ))}

      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto max-h-[100dvh] max-w-[100vw] bg-transparent p-0 backdrop:bg-black/90 backdrop:backdrop-blur"
        aria-label="Visualizador de cartazes"
      >
        {current ? (
          <div className="relative flex max-h-[100dvh] flex-col items-center p-4">
            <img src={current.full} alt={current.caption} className="max-h-[85dvh] w-auto max-w-[92vw] rounded-xl object-contain" />
            <p className="mt-3 text-center text-sm text-white/80">{current.caption}</p>
            <button type="button" onClick={close} className="absolute right-6 top-6 rounded-full bg-black/70 p-2" aria-label="Fechar"><X className="size-5" /></button>
            {items.length > 1 ? (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-3" aria-label="Anterior"><ChevronLeft className="size-5" /></button>
                <button type="button" onClick={() => step(1)} className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-3" aria-label="Seguinte"><ChevronRight className="size-5" /></button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
