import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { amountToCents, isPaidStatus, verifyPaysuiteSignature } from "@/lib/payments/paysuite";

const SECRET = "whsec_teste_123";
const body = JSON.stringify({ event: "payment.success", data: { id: "550e8400-e29b-41d4-a716-446655440000", amount: 1300, reference: "HC-2026-000001" } });
const sign = (b: string, s = SECRET) => createHmac("sha256", s).update(b).digest("hex");

describe("PaySuite — webhook", () => {
  it("aceita assinatura HMAC-SHA256 válida", () => {
    expect(verifyPaysuiteSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyPaysuiteSignature(body, `sha256=${sign(body).toUpperCase()}`, SECRET)).toBe(true);
  });
  it("recusa assinatura ausente, errada ou de corpo alterado", () => {
    expect(verifyPaysuiteSignature(body, null, SECRET)).toBe(false);
    expect(verifyPaysuiteSignature(body, sign(body, "outro"), SECRET)).toBe(false);
    expect(verifyPaysuiteSignature(body.replace("1300", "1"), sign(body), SECRET)).toBe(false);
    expect(verifyPaysuiteSignature(body, sign(body), "")).toBe(false);
    expect(verifyPaysuiteSignature(body, "zz", SECRET)).toBe(false);
  });
});

describe("PaySuite — valores e estados", () => {
  it("converte valores em cêntimos sem erros de arredondamento", () => {
    expect(amountToCents(1300)).toBe(130000);
    expect(amountToCents("1300.00")).toBe(130000);
    expect(amountToCents("100.5")).toBe(10050);
    expect(amountToCents("0.29")).toBe(29);
    expect(Number.isNaN(amountToCents("abc"))).toBe(true);
    expect(Number.isNaN(amountToCents("-5"))).toBe(true);
  });
  it("só considera pago com estado de sucesso E transacção", () => {
    expect(isPaidStatus({ id: "x", amount: 1, reference: "r", status: "paid", transaction: { id: "tr_1" } })).toBe(true);
    expect(isPaidStatus({ id: "x", amount: 1, reference: "r", status: "paid", transaction: null })).toBe(false);
    expect(isPaidStatus({ id: "x", amount: 1, reference: "r", status: "pending", transaction: { id: "tr_1" } })).toBe(false);
  });
});
