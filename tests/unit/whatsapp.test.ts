import { describe, expect, it } from "vitest";
import { buildCustomerPaymentMessage, buildTicketsReadyMessage, customerToCompanyLink, waLink } from "@/lib/whatsapp";
import { COMPANY } from "@/lib/config";

const msg = {
  customerName: "Ana & Rui",
  eventName: "Good Vibes at Summer",
  eventDate: "2026-12-12",
  orderCode: "HC-2026-000001",
  counts: { normal: 2, vip: 1 },
  totalCents: 130000,
  method: "mpesa" as const,
  transactionRef: "ABC#123?",
};

describe("WhatsApp", () => {
  it("usa o número oficial", () => {
    expect(COMPANY.whatsapp.url).toBe("https://wa.me/258845425186");
    expect(customerToCompanyLink(msg).startsWith("https://wa.me/258845425186?text=")).toBe(true);
  });
  it("gera a mensagem do cliente exactamente no formato definido", () => {
    expect(buildCustomerPaymentMessage(msg)).toBe(
      "Olá, HC Entertainment!\n\nAcabei de efectuar o pagamento dos meus bilhetes.\n\nNome: Ana & Rui\n\nEvento: Good Vibes at Summer\n\nData: 12/12/2026\n\nEncomenda: HC-2026-000001\n\nBilhetes Normais: 2\n\nBilhetes VIP: 1\n\nTotal: 1.300 MT\n\nPagamento: M-Pesa\n\nReferência da transacção: ABC#123?\n\nAguardo a confirmação e o envio dos meus bilhetes digitais.",
    );
  });
  it("codifica a mensagem com encodeURIComponent (caracteres especiais seguros)", () => {
    const url = new URL(customerToCompanyLink(msg));
    expect(url.searchParams.get("text")).toBe(buildCustomerPaymentMessage(msg));
    expect(url.search).not.toContain("#");
    expect(url.search).toContain("%26"); // "&" do nome
    expect(url.hash).toBe("");
  });
  it("gera a mensagem de bilhetes emitidos", () => {
    const m = buildTicketsReadyMessage({ customerName: "Ana", orderCode: "HC-2026-000001", eventName: "Good Vibes at Summer", eventDate: "2026-12-12", quantity: 3, totalCents: 130000 });
    expect(m).toContain("Olá, Ana!");
    expect(m).toContain("Total pago: 1.300 MT");
    expect(m.endsWith("HC ENTERTAINMENT\nA FESTA COMEÇA AQUI.")).toBe(true);
  });
  it("abre a conversa do cliente com número normalizado", () => {
    expect(waLink("+258841234567", "x")).toBe("https://wa.me/258841234567?text=x");
    expect(() => waLink("abc")).toThrow();
  });
});
