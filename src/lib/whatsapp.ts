import { COMPANY, PAYMENT_METHODS, type PaymentMethodId } from "./config";
import { formatAmount, formatDateShort } from "./format";
import { waDigits } from "./phone";

/**
 * Constrói um link wa.me com mensagem pré-preenchida (codificada com encodeURIComponent).
 * IMPORTANTE: abrir este link NÃO envia mensagens nem ficheiros — apenas abre a conversa.
 */
export function waLink(e164OrDigits: string, message?: string): string {
  const digits = waDigits(e164OrDigits);
  if (!/^\d{8,15}$/.test(digits)) throw new Error("Número de WhatsApp inválido");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

type Counts = { normal: number; vip: number; other?: number };

export type CustomerPaymentMessage = {
  customerName: string;
  eventName: string;
  eventDate: string; // AAAA-MM-DD
  orderCode: string;
  counts: Counts;
  totalCents: number;
  method: PaymentMethodId;
  transactionRef: string;
};

/** Mensagem do cliente para a HC Entertainment após comunicar o pagamento. */
export function buildCustomerPaymentMessage(m: CustomerPaymentMessage): string {
  const lines = [
    "Olá, HC Entertainment!",
    "",
    "Acabei de efectuar o pagamento dos meus bilhetes.",
    "",
    `Nome: ${m.customerName}`,
    "",
    `Evento: ${m.eventName}`,
    "",
    `Data: ${formatDateShort(m.eventDate)}`,
    "",
    `Encomenda: ${m.orderCode}`,
    "",
    `Bilhetes Normais: ${m.counts.normal}`,
    "",
    `Bilhetes VIP: ${m.counts.vip}`,
  ];
  if (m.counts.other) lines.push("", `Outros bilhetes: ${m.counts.other}`);
  lines.push(
    "",
    `Total: ${formatAmount(m.totalCents)} MT`,
    "",
    `Pagamento: ${PAYMENT_METHODS[m.method].label}`,
    "",
    `Referência da transacção: ${m.transactionRef}`,
    "",
    "Aguardo a confirmação e o envio dos meus bilhetes digitais.",
  );
  return lines.join("\n");
}

export function customerToCompanyLink(m: CustomerPaymentMessage): string {
  return waLink(COMPANY.whatsapp.waNumber, buildCustomerPaymentMessage(m));
}

export type TicketsReadyMessage = {
  customerName: string;
  orderCode: string;
  eventName: string;
  eventDate: string;
  quantity: number;
  totalCents: number;
};

/** Mensagem da HC Entertainment para o cliente após a emissão dos bilhetes. */
export function buildTicketsReadyMessage(m: TicketsReadyMessage): string {
  return [
    `Olá, ${m.customerName}!`,
    "",
    `A HC Entertainment confirma o recebimento do pagamento da sua encomenda ${m.orderCode}.`,
    "",
    `Evento: ${m.eventName}`,
    "",
    `Data: ${formatDateShort(m.eventDate)}`,
    "",
    `Quantidade: ${m.quantity}`,
    "",
    `Total pago: ${formatAmount(m.totalCents)} MT`,
    "",
    "Os seus bilhetes digitais foram emitidos com sucesso.",
    "",
    "Enviamos em anexo os bilhetes com QR Code.",
    "",
    "Apresente-os à entrada do evento.",
    "",
    "HC ENTERTAINMENT",
    "A FESTA COMEÇA AQUI.",
  ].join("\n");
}

export function countByCategory(items: { category: string; quantity: number }[]): Counts {
  const c: Counts = { normal: 0, vip: 0, other: 0 };
  for (const i of items) {
    if (i.category === "vip") c.vip += i.quantity;
    else if (i.category === "normal") c.normal += i.quantity;
    else c.other = (c.other ?? 0) + i.quantity;
  }
  return c;
}
