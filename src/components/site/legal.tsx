import { AlertTriangle } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { PageHero } from "./page-hero";

/** Cláusula que necessita de aprovação da HC Entertainment / revisão jurídica. */
export function Pending({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200 ring-1 ring-amber-500/30">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wider">[A aprovar]</span>
      {children}
    </span>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Políticas" title={title} />
      <Container className="max-w-3xl">
        <div className="mb-10 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-300" />
          <p>
            Texto-base editável. As cláusulas assinaladas com <strong>[A aprovar]</strong> necessitam de aprovação da
            HC Entertainment e de revisão jurídica conforme a legislação moçambicana aplicável antes de serem consideradas definitivas.
          </p>
        </div>
        <article className="space-y-8 text-white/80 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:uppercase [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
          {children}
        </article>
        <p className="mt-12 text-xs text-white/40">Última actualização: {updated}</p>
      </Container>
    </>
  );
}
