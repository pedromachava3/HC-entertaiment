import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { PageHero } from "@/components/site/page-hero";
import { COMPANY, PAYMENT_METHODS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Fale com a HC Entertainment pelo WhatsApp.",
  alternates: { canonical: "/contactos" },
};

export default function ContactsPage() {
  return (
    <>
      <PageHero eyebrow="Contactos" title="Fale connosco" intro="Bilhetes, reservas, parcerias ou dúvidas — o canal oficial é o WhatsApp." />
      <Container className="grid gap-6 md:grid-cols-3">
        <a
          href={COMPANY.whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-transparent p-8 transition hover:border-emerald-400 md:col-span-2"
        >
          <MessageCircle className="size-8 text-emerald-400" />
          <p className="mt-6 text-sm uppercase tracking-widest text-white/50">WhatsApp oficial</p>
          <p className="mt-1 font-display text-5xl">{COMPANY.whatsapp.display}</p>
          <span className={buttonVariants({ variant: "secondary", className: "mt-8" })}>Abrir conversa</span>
        </a>
        <div className="space-y-6 rounded-3xl border border-white/10 bg-coal p-8">
          <div>
            <MapPin className="size-6 text-hc-red" />
            <p className="mt-3 text-sm uppercase tracking-widest text-white/50">Localização</p>
            <p className="mt-1 text-lg font-semibold">{COMPANY.location}</p>
          </div>
          <div>
            <Clock className="size-6 text-hc-red" />
            <p className="mt-3 text-sm uppercase tracking-widest text-white/50">Fuso horário</p>
            <p className="mt-1 text-lg font-semibold">Hora de Moçambique (CAT, UTC+2)</p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-coal p-8 md:col-span-3">
          <p className="text-sm uppercase tracking-widest text-white/50">Números oficiais de pagamento</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Object.values(PAYMENT_METHODS).map((m) => (
              <div key={m.id} className="rounded-2xl border border-white/10 p-5">
                <p className="font-semibold">{m.label}</p>
                <p className="font-display text-3xl">{m.number}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-mute">
            A HC Entertainment nunca pede o seu PIN, códigos OTP ou dados bancários. Pague apenas para os números acima.
          </p>
        </div>
      </Container>
    </>
  );
}
