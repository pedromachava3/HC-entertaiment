import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { COMPANY, PAYMENT_METHODS } from "@/lib/config";
import { formatDateShort, formatMZN } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";

/**
 * Compra por transferência manual + WhatsApp — funciona em qualquer telemóvel.
 * O cliente transfere, envia o comprovativo pelo WhatsApp e a HC regista a venda no painel.
 */
export function ManualPurchase({
  eventName,
  eventDate,
  types,
}: {
  eventName: string;
  eventDate: string;
  types: { name: string; priceCents: number }[];
}) {
  const message = [
    "Olá, HC Entertainment!",
    "",
    `Quero comprar bilhetes para: ${eventName} (${formatDateShort(eventDate)})`,
    "",
    ...types.map((t) => `${t.name} (${formatMZN(t.priceCents)}): ___`),
    "",
    "Nome completo: ___",
    "",
    "Paguei por (M-Pesa / e-Mola): ___",
    "Valor transferido: ___ MT",
    "Referência da transacção: ___",
    "",
    "Envio em anexo o comprovativo.",
  ].join("\n");

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 sm:p-6">
      <h2 className="font-display text-2xl uppercase">Comprar por transferência</h2>
      <p className="mt-1 text-sm text-white/70">Simples e funciona em qualquer telemóvel:</p>
      <ol className="mt-4 space-y-2 text-sm text-white/80">
        <li>
          <strong>1.</strong> Transfira o valor dos bilhetes ({types.map((t) => `${t.name} ${formatMZN(t.priceCents)}`).join(" · ")}) para:
        </li>
      </ol>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.values(PAYMENT_METHODS).map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink/50 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">{m.label}</p>
              <p className="text-lg font-bold">{m.number}</p>
            </div>
            <CopyButton value={m.digits} />
          </div>
        ))}
      </div>
      <ol className="mt-4 space-y-2 text-sm text-white/80">
        <li><strong>2.</strong> Envie o comprovativo (captura da SMS) pelo WhatsApp, com o seu nome e a quantidade de bilhetes.</li>
        <li><strong>3.</strong> Depois de confirmarmos o recebimento, enviamos os bilhetes com QR Code para o seu WhatsApp.</li>
      </ol>
      <a
        href={waLink(COMPANY.whatsapp.waNumber, message)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ size: "lg", className: "mt-5 w-full bg-emerald-500 text-ink shadow-none hover:bg-emerald-400" })}
      >
        <MessageCircle /> Enviar comprovativo pelo WhatsApp
      </a>
      <p className="mt-2 text-center text-xs text-white/50">WhatsApp {COMPANY.whatsapp.display} · Nunca partilhe o seu PIN.</p>
    </div>
  );
}
