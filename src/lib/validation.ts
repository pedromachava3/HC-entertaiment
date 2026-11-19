import { z } from "zod";
import { normalizePhone } from "./phone";

const phoneField = (label: string) =>
  z
    .string({ error: `Indique o ${label}.` })
    .trim()
    .min(1, `Indique o ${label}.`)
    .max(25, `${label[0].toUpperCase()}${label.slice(1)} inválido.`)
    .transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: `${label[0].toUpperCase()}${label.slice(1)} inválido. Ex.: 84 123 4567` });
        return z.NEVER;
      }
      return n;
    });

/** Remove caracteres de controlo e espaços duplicados. */
const cleanText = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();

export const paymentMethodSchema = z.enum(["mpesa", "emola"], { error: "Seleccione M-Pesa ou e-Mola." });

export const checkoutSchema = z.object({
  eventId: z.uuid({ error: "Evento inválido." }),
  idempotencyKey: z.uuid({ error: "Pedido inválido." }),
  items: z
    .array(
      z.object({
        ticketTypeId: z.uuid({ error: "Categoria inválida." }),
        quantity: z.number().int("Quantidade inválida.").min(0, "Quantidade inválida.").max(50, "Quantidade máxima excedida."),
      }),
    )
    .max(10)
    .transform((items) => items.filter((i) => i.quantity > 0))
    .refine((items) => items.length > 0, "Seleccione pelo menos um bilhete.")
    .refine(
      (items) => new Set(items.map((i) => i.ticketTypeId)).size === items.length,
      "Categorias repetidas.",
    ),
  customerName: z
    .string({ error: "Indique o nome completo." })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(3, "Indique o nome completo.")
        .max(120, "Nome demasiado longo.")
        .refine((v) => v.includes(" "), "Indique o nome e o apelido.")
        .refine((v) => !/[<>]/.test(v), "O nome contém caracteres inválidos."),
    ),
  customerWhatsapp: phoneField("número de WhatsApp"),
  customerEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .pipe(z.email({ error: "Email inválido." }).optional()),
  paymentMethod: paymentMethodSchema,
  acceptTerms: z.literal(true, { error: "É necessário aceitar os Termos e Condições." }),
  acceptPrivacy: z.literal(true, { error: "É necessário aceitar a Política de Privacidade." }),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const paymentReportSchema = z.object({
  accessKey: z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/, "Chave de acesso inválida."),
  method: paymentMethodSchema,
  payerPhone: phoneField("número usado na transferência"),
  transactionRef: z
    .string({ error: "Indique a referência da transacção." })
    .trim()
    .min(4, "Referência da transacção inválida.")
    .max(64, "Referência da transacção inválida.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9 .\-/]*$/, "Use apenas letras, números, espaço, ponto, hífen ou barra."),
});

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? t : null;
    });

export const eventFormSchema = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto.").max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífenes.")
    .max(120),
  description: optionalText(5000),
  eventDate: z.iso.date({ error: "Data inválida." }),
  startTime: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida.").nullable()),
  venue: optionalText(150),
  address: optionalText(300),
  city: optionalText(100),
  doorInfo: optionalText(300),
  lineup: z
    .string()
    .max(2000)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(/[\n,•]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 60),
    ),
  maxTicketsPerOrder: z.coerce.number().int().min(1).max(50),
});

export const ticketTypeFormSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.enum(["normal", "vip", "other"]),
  description: optionalText(500),
  priceMzn: z.coerce.number().min(0, "Preço inválido.").max(1_000_000, "Preço inválido."),
  quantityTotal: z.coerce.number().int().min(0).max(100_000),
  maxPerOrder: z.coerce.number().int().min(1).max(50),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
