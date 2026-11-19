export function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-hc-red py-4" aria-label={`Line-up: ${items.join(", ")}`}>
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap" aria-hidden>
        {row.map((name, i) => (
          <span key={i} className="flex items-center gap-8 font-display text-2xl uppercase tracking-wide sm:text-3xl">
            {name}
            <span className="text-ink">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
