/**
 * Dados oficiais da HC Entertainment.
 * Apenas informação confirmada pela empresa — não acrescentar contactos ou redes sociais não fornecidos.
 */
export const COMPANY = {
  name: "HC Entertainment",
  fullName: "Hot Crazy Entertainment",
  slogan: "A FESTA COMEÇA AQUI.",
  tagline:
    "Produzimos experiências, criamos momentos e transformamos eventos em memórias inesquecíveis.",
  sector: "Produção, promoção e organização de eventos",
  location: "Matola, Moçambique",
  timezone: "Africa/Maputo",
  currency: "MZN",
  whatsapp: {
    display: "+258 84 542 5186",
    e164: "+258845425186",
    waNumber: "258845425186",
    url: "https://wa.me/258845425186",
  },
} as const;

export const PAYMENT_METHODS = {
  mpesa: {
    id: "mpesa",
    label: "M-Pesa",
    number: "+258 84 542 5186",
    digits: "845425186",
  },
  emola: {
    id: "emola",
    label: "e-Mola",
    number: "+258 87 885 2846",
    digits: "878852846",
  },
} as const;

export type PaymentMethodId = keyof typeof PAYMENT_METHODS;
export const PAYMENT_METHOD_IDS = Object.keys(PAYMENT_METHODS) as PaymentMethodId[];
