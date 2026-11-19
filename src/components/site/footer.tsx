import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/config";
import { Logo } from "./logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-white/[0.06] bg-coal/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo size={64} />
          <p className="mt-6 font-display text-3xl uppercase leading-none">{COMPANY.slogan}</p>
          <p className="mt-4 max-w-xs text-sm text-mute">{COMPANY.fullName} — {COMPANY.sector.toLowerCase()}.</p>
        </div>
        <nav aria-label="Navegação do rodapé">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">Navegação</p>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><Link className="hover:text-white" href="/eventos">Eventos</Link></li>
            <li><Link className="hover:text-white" href="/galeria">Galeria</Link></li>
            <li><Link className="hover:text-white" href="/sobre">Sobre Nós</Link></li>
            <li><Link className="hover:text-white" href="/contactos">Contactos</Link></li>
          </ul>
        </nav>
        <nav aria-label="Políticas">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">Políticas</p>
          <ul className="space-y-2.5 text-sm text-white/70">
            <li><Link className="hover:text-white" href="/termos">Termos e Condições</Link></li>
            <li><Link className="hover:text-white" href="/privacidade">Política de Privacidade</Link></li>
            <li><Link className="hover:text-white" href="/reembolsos">Cancelamentos e Reembolsos</Link></li>
            <li><Link className="hover:text-white" href="/acesso">Acesso aos Eventos</Link></li>
          </ul>
        </nav>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">Contacto</p>
          <a
            href={COMPANY.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 transition hover:border-emerald-500/50"
          >
            <MessageCircle className="size-5 text-emerald-400" />
            <span>
              <span className="block text-xs text-white/50">WhatsApp</span>
              <span className="font-semibold">{COMPANY.whatsapp.display}</span>
            </span>
          </a>
          <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
            <MapPin className="size-4 text-hc-red" /> {COMPANY.location}
          </p>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/40 sm:flex-row sm:justify-between sm:px-8">
          <p>© {year} {COMPANY.name} ({COMPANY.fullName}). Todos os direitos reservados.</p>
          <Link href="/admin" className="hover:text-white/70">Área reservada</Link>
        </div>
      </div>
    </footer>
  );
}
