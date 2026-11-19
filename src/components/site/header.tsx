"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Ticket, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Eventos" },
  { href: "/galeria", label: "Galeria" },
  { href: "/sobre", label: "Sobre Nós" },
  { href: "/contactos", label: "Contactos" },
];

export function Header({ buyHref }: { buyHref: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || open ? "border-b border-white/[0.06] bg-ink/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-hc-red focus:px-4 focus:py-2">
        Saltar para o conteúdo
      </a>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="HC Entertainment — Início" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo size={44} priority />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive(n.href) ? "text-white" : "text-white/60 hover:text-white",
              )}
            >
              {n.label}
              {isActive(n.href) ? <span className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-hc-red" /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={buyHref}
            className="hidden h-11 items-center gap-2 rounded-full bg-hc-red px-5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_8px_30px_-8px_rgba(255,16,16,0.7)] transition hover:bg-hc-red-dark sm:inline-flex"
          >
            <Ticket className="size-4" /> Comprar Bilhetes
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        hidden={!open}
        className="h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/[0.06] bg-ink px-5 pb-10 pt-6 lg:hidden"
      >
        <nav aria-label="Menu móvel" className="flex flex-col">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(n.href) ? "page" : undefined}
              style={{ animationDelay: `${i * 50}ms` }}
              className={cn(
                "animate-fade-up border-b border-white/[0.06] py-4 font-display text-4xl uppercase",
                isActive(n.href) ? "text-hc-red" : "text-white",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href={buyHref}
          onClick={() => setOpen(false)}
          className="mt-8 flex h-14 items-center justify-center gap-2 rounded-full bg-hc-red text-base font-bold uppercase tracking-wide"
        >
          <Ticket className="size-5" /> Comprar Bilhetes
        </Link>
      </div>
    </header>
  );
}
