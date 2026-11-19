import { describe, expect, it } from "vitest";
import { eventStartInstant, formatDateLong, formatDateShort, formatMZN, formatTime, todayInMaputo } from "@/lib/format";

describe("formatação", () => {
  it("formata meticais", () => {
    expect(formatMZN(30000)).toBe("300 MT");
    expect(formatMZN(70000)).toBe("700 MT");
    expect(formatMZN(130000)).toBe("1.300 MT");
    expect(formatMZN(150050)).toBe("1.500,50 MT");
  });
  it("formata datas sem desvio de fuso", () => {
    expect(formatDateShort("2026-12-12")).toBe("12/12/2026");
    expect(formatDateLong("2026-12-12")).toBe("Sábado, 12 de Dezembro de 2026");
    expect(formatTime("14:00:00")).toBe("14h00");
    expect(formatTime(null)).toBeNull();
  });
  it("usa o fuso Africa/Maputo (UTC+2)", () => {
    expect(eventStartInstant("2026-12-12", "14:00:00").toISOString()).toBe("2026-12-12T12:00:00.000Z");
    expect(todayInMaputo(new Date("2026-12-11T22:30:00Z"))).toBe("2026-12-12");
  });
});
