"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CreditCard, Images, LayoutDashboard, LogOut, Menu, QrCode, Ticket, User, Users, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, admin: true },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard, admin: true },
  { href: "/admin/bilhetes", label: "Bilhetes", icon: Ticket, admin: true },
  { href: "/admin/galeria", label: "Galeria", icon: Images, admin: true },
  { href: "/admin/validacao", label: "Validação", icon: QrCode, admin: false },
  { href: "/admin/utilizadores", label: "Utilizadores", icon: Users, admin: true },
  { href: "/admin/conta", label: "A minha conta", icon: User, admin: false },
];

export function AdminNav({ isAdmin, email, pendingCount }: { isAdmin: boolean; email: string; pendingCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => isAdmin || !i.admin);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Administração">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={() => setOpen(false)}
          aria-current={active(i.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            active(i.href) ? "bg-hc-red text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
          )}
        >
          <i.icon className="size-4" /> {i.label}
          {i.href === "/admin/pagamentos" && pendingCount > 0 ? (
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold", active(i.href) ? "bg-white text-hc-red" : "bg-hc-red text-white")}>{pendingCount}</span>
          ) : null}
        </Link>
      ))}
      <form action="/admin/auth/signout" method="post" className="mt-auto">
        <p className="truncate px-3 pb-2 text-xs text-white/40">{email}</p>
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" /> Terminar sessão
        </button>
      </form>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-ink/90 px-4 backdrop-blur lg:hidden">
        <Link href="/admin"><Logo size={36} /></Link>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menu" className="rounded-full border border-white/15 p-2">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? <div className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-y-auto bg-ink p-4 lg:hidden">{nav}</div> : null}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-white/[0.06] bg-coal/40 p-5 lg:flex">
        <Link href="/admin" className="flex items-center gap-3">
          <Logo size={40} />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">Painel</span>
        </Link>
        {nav}
      </aside>
    </>
  );
}
