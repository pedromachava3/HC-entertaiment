import { formatMZN } from "@/lib/format";

/**
 * Gráficos leves (HTML/CSS, sem bibliotecas): uma série, um eixo, barras finas,
 * tooltip ao passar o rato/foco e tabela acessível equivalente.
 */
export function RevenueBars({ data }: { data: { day: string; cents: number }[] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-mute">Ainda não há receita confirmada nos últimos 30 dias.</p>;
  const max = Math.max(...data.map((d) => d.cents), 1);
  return (
    <figure>
      <div className="flex h-48 items-end gap-[2px]" role="img" aria-label="Receita confirmada por dia, últimos 30 dias">
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end" tabIndex={0}>
            <div className="w-full rounded-t-[4px] bg-hc-red/80 transition group-hover:bg-hc-red group-focus:bg-hc-red" style={{ height: `${Math.max(2, (d.cents / max) * 100)}%` }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink px-3 py-2 text-xs shadow-xl group-hover:block group-focus:block">
              <p className="text-white/50">{d.day.split("-").reverse().join("/")}</p>
              <p className="font-semibold">{formatMZN(d.cents)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-[11px] text-white/40">
        <span>{data[0].day.split("-").reverse().join("/")}</span>
        <span>{data[data.length - 1].day.split("-").reverse().join("/")}</span>
      </div>
      <details className="mt-3 text-xs text-white/50">
        <summary className="cursor-pointer">Ver tabela</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-white/5"><td className="py-1">{d.day}</td><td className="text-right">{formatMZN(d.cents)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function HBar({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-white/70">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-hc-red" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
