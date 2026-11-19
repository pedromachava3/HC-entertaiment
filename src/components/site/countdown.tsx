"use client";
import { useEffect, useState } from "react";

function diff(target: number, now: number) {
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <div className="h-[76px]" aria-hidden />;
  if (target <= now) return null;
  const t = diff(target, now);
  const units: [number, string][] = [[t.d, "Dias"], [t.h, "Horas"], [t.m, "Min"], [t.s, "Seg"]];
  return (
    <div className="flex gap-2 sm:gap-3" role="timer" aria-label={`Faltam ${t.d} dias e ${t.h} horas`}>
      {units.map(([v, l]) => (
        <div key={l} className="min-w-16 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-center backdrop-blur">
          <div className="font-display text-3xl tabular-nums leading-none sm:text-4xl">{String(v).padStart(2, "0")}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-mute">{l}</div>
        </div>
      ))}
    </div>
  );
}
