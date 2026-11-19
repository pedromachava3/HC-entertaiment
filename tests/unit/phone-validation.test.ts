import { describe, expect, it } from "vitest";
import { normalizePhone, formatPhone } from "@/lib/phone";
import { checkoutSchema, paymentReportSchema } from "@/lib/validation";

const base = {
  eventId: "8c1f6a5e-1d2b-4c3d-9e4f-5a6b7c8d9e0f",
  idempotencyKey: "0f9e8d7c-6b5a-4f3e-8d2c-1b0a9f8e7d6c",
  items: [{ ticketTypeId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
  customerName: "Maria Joana Cossa",
  customerWhatsapp: "84 123 4567",
  paymentMethod: "mpesa",
  acceptTerms: true,
  acceptPrivacy: true,
};

describe("telefones", () => {
  it("normaliza números moçambicanos", () => {
    expect(normalizePhone("84 542 5186")).toBe("+258845425186");
    expect(normalizePhone("+258 87 885 2846")).toBe("+258878852846");
    expect(normalizePhone("258845425186")).toBe("+258845425186");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("+258 21 123 456")).toBeNull();
    expect(formatPhone("+258845425186")).toBe("+258 84 542 5186");
  });
});

describe("validação do checkout", () => {
  it("aceita dados válidos e normaliza o WhatsApp", () => {
    const r = checkoutSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customerWhatsapp).toBe("+258841234567");
  });
  it("ignora preços/totais enviados pelo navegador", () => {
    const r = checkoutSchema.safeParse({ ...base, total: 1, items: [{ ...base.items[0], price: 1, priceCents: 1 }] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("total");
      expect(r.data.items[0]).not.toHaveProperty("price");
      expect(r.data.items[0]).not.toHaveProperty("priceCents");
    }
  });
  it("rejeita quantidades inválidas", () => {
    expect(checkoutSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: -1 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 1.5 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 51 }] }).success).toBe(false);
  });
  it("exige termos, privacidade, nome completo e método", () => {
    expect(checkoutSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, acceptPrivacy: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, customerName: "Maria" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, customerName: "<script>x</script> y" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, paymentMethod: "visa" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, customerEmail: "nao-e-email" }).success).toBe(false);
  });
  it("valida a comunicação de pagamento", () => {
    const ok = paymentReportSchema.safeParse({ accessKey: "a".repeat(43), method: "emola", payerPhone: "87 885 2846", transactionRef: "ABC123XYZ" });
    expect(ok.success).toBe(true);
    expect(paymentReportSchema.safeParse({ accessKey: "a".repeat(43), method: "emola", payerPhone: "87 885 2846", transactionRef: "<x>" }).success).toBe(false);
  });
});
