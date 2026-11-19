import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/pricing";

const types = [{ id: "normal", priceCents: 30000 }, { id: "vip", priceCents: 70000 }];

describe("cálculo de totais (apresentação)", () => {
  it("Normal 300 MT", () => expect(computeTotals(types, { normal: 1 }).totalCents).toBe(30000));
  it("VIP 700 MT", () => expect(computeTotals(types, { vip: 1 }).totalCents).toBe(70000));
  it("Compra mista: 2 Normais + 1 VIP = 1.300 MT", () => {
    const t = computeTotals(types, { normal: 2, vip: 1 });
    expect(t.totalCents).toBe(130000);
    expect(t.quantity).toBe(3);
    expect(t.lines.find((l) => l.id === "normal")?.subtotalCents).toBe(60000);
  });
  it("ignora quantidades negativas", () => expect(computeTotals(types, { normal: -3 }).totalCents).toBe(0));
});
