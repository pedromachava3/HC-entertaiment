import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { PageHero } from "@/components/site/page-hero";
import { COMPANY } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sobre Nós",
  description: `${COMPANY.fullName} — ${COMPANY.sector} em ${COMPANY.location}.`,
  alternates: { canonical: "/sobre" },
};

const PILLARS = [
  { t: "Produção", d: "Planeamento e execução de eventos, do conceito ao último som da noite." },
  { t: "Promoção", d: "Cartazes, comunicação e divulgação que colocam cada evento no mapa." },
  { t: "Organização", d: "Bilhética digital, controlo de entradas e coordenação com parceiros e artistas." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Sobre nós" title="Hot Crazy Entertainment" intro={COMPANY.tagline} />
      <Container className="grid gap-12 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5 text-lg text-white/75">
          <p>
            A <strong className="text-white">{COMPANY.name}</strong> ({COMPANY.fullName}) dedica-se à produção, promoção e
            organização de eventos, com base na Matola, Moçambique.
          </p>
          <p>
            Cada evento é pensado para ser uma experiência completa: boa música, bons artistas, boa energia e uma organização
            em que o público pode confiar — incluindo a compra de bilhetes digitais com QR Code.
          </p>
          <p className="font-display text-4xl uppercase text-white">{COMPANY.slogan}</p>
          <Link href="/eventos" className={buttonVariants()}>Ver eventos <ArrowRight /></Link>
        </div>
        <div className="grid gap-4">
          {PILLARS.map((p, i) => (
            <div key={p.t} className="flex gap-5 rounded-2xl border border-white/10 bg-coal p-6">
              <span className="font-display text-4xl text-hc-red">0{i + 1}</span>
              <div>
                <h2 className="font-display text-2xl uppercase">{p.t}</h2>
                <p className="mt-1 text-mute">{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
