/** Cálculo de totais no navegador (apenas apresentação — o servidor recalcula a partir da BD). */
export type PricedType = { id: string; priceCents: number };
export type Selection = Record<string, number>;

export function computeTotals(types: PricedType[], selection: Selection) {
  const lines = types
    .map((t) => {
      const quantity = Math.max(0, Math.floor(selection[t.id] ?? 0));
      return { id: t.id, quantity, unitCents: t.priceCents, subtotalCents: quantity * t.priceCents };
    })
    .filter((l) => l.quantity > 0);
  const totalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);
  const quantity = lines.reduce((s, l) => s + l.quantity, 0);
  return { lines, totalCents, quantity };
}

export function clampQuantity(next: number, opts: { maxForType: number; available: number; remainingForOrder: number }) {
  const upper = Math.max(0, Math.min(opts.maxForType, opts.available, opts.remainingForOrder));
  return Math.max(0, Math.min(Math.floor(next), upper));
}
