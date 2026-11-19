import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { CancelTicket } from "@/components/admin/cancel-ticket";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, formatMZN } from "@/lib/format";
import { TICKET_STATUS_LABEL, type TicketStatus } from "@/lib/types";

export default async function Tickets(props: PageProps<"/admin/bilhetes">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const estado = typeof sp.estado === "string" && ["valid", "used", "cancelled"].includes(sp.estado) ? (sp.estado as TicketStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "").slice(0, 60) : "";
  let query = supabaseAdmin()
    .from("tickets")
    .select("id, order_id, ticket_number, holder_name, ticket_type_name, category, price_cents, status, used_at, cancel_reason, event:events(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (estado) query = query.eq("status", estado);
  if (q) query = query.or(`ticket_number.ilike.%${q}%,holder_name.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  const tickets = (data ?? []) as unknown as {
    id: string; order_id: string; ticket_number: string; holder_name: string; ticket_type_name: string; category: string;
    price_cents: number; status: TicketStatus; used_at: string | null; cancel_reason: string | null; event: { name: string } | null;
  }[];

  return (
    <div>
      <PageHeader title="Bilhetes" description="Consultar, descarregar e cancelar bilhetes. Entradas registadas." />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[["", "Todos"], ["valid", "Válidos"], ["used", "Utilizados"], ["cancelled", "Cancelados"]].map(([k, l]) => (
            <Link key={k} href={`/admin/bilhetes${k ? `?estado=${k}` : ""}`} className={buttonVariants({ size: "sm", variant: (estado ?? "") === k ? "primary" : "outline" })}>{l}</Link>
          ))}
        </div>
        <form action="/admin/bilhetes" className="flex gap-2">
          {estado ? <input type="hidden" name="estado" value={estado} /> : null}
          <Input name="q" defaultValue={q} placeholder="Número ou titular" className="w-64" />
        </form>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-white/40">
            <tr className="border-b border-white/10"><th className="p-4">Bilhete</th><th className="p-4">Titular</th><th className="p-4">Evento</th><th className="p-4">Categoria</th><th className="p-4">Estado</th><th className="p-4" /></tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-mute">Sem bilhetes.</td></tr> : null}
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="p-4"><Link href={`/admin/pagamentos/${t.order_id}`} className="font-mono hover:text-hc-red">{t.ticket_number}</Link></td>
                <td className="p-4">{t.holder_name}</td>
                <td className="p-4 text-white/70">{t.event?.name}</td>
                <td className="p-4">{t.ticket_type_name} <span className="text-white/40">({formatMZN(t.price_cents)})</span></td>
                <td className="p-4">
                  <Badge tone={t.status === "valid" ? "green" : t.status === "used" ? "white" : "red"}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                  {t.used_at ? <p className="mt-1 text-xs text-white/40">Entrada: {formatDateTime(t.used_at)}</p> : null}
                  {t.cancel_reason ? <p className="mt-1 text-xs text-white/40">{t.cancel_reason}</p> : null}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <a href={`/api/admin/orders/${t.order_id}/pdf`} className={buttonVariants({ size: "sm", variant: "outline" })}>PDF</a>
                    {t.status === "valid" ? <CancelTicket ticketId={t.id} /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
