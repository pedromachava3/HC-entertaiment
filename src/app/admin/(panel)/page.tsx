import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { HBar, RevenueBars } from "@/components/admin/charts";
import { Card } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { formatMZN } from "@/lib/format";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";

type Stats = {
  events_total: number; events_published: number; orders_total: number; payments_pending: number;
  payments_reported: number; payments_confirmed: number; revenue_confirmed_cents: number;
  tickets_normal_sold: number; tickets_vip_sold: number; tickets_issued: number; tickets_used: number;
  tickets_cancelled: number; orders_by_status: Partial<Record<OrderStatus, number>>;
  revenue_by_day: { day: string; cents: number }[];
};

export default async function Dashboard() {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().rpc("dashboard_stats");
  if (error) throw error;
  const s = data as Stats;

  const tiles: [string, string | number, string?][] = [
    ["Receita confirmada", formatMZN(s.revenue_confirmed_cents)],
    ["Pagamentos por verificar", s.payments_reported, "/admin/pagamentos?estado=payment_reported"],
    ["Pagamentos pendentes", s.payments_pending, "/admin/pagamentos?estado=pending_payment"],
    ["Pagamentos confirmados", s.payments_confirmed],
    ["Encomendas recebidas", s.orders_total, "/admin/pagamentos"],
    ["Eventos (publicados)", `${s.events_total} (${s.events_published})`, "/admin/eventos"],
    ["Bilhetes Normais vendidos", s.tickets_normal_sold],
    ["Bilhetes VIP vendidos", s.tickets_vip_sold],
    ["Bilhetes emitidos", s.tickets_issued, "/admin/bilhetes"],
    ["Bilhetes utilizados", s.tickets_used],
    ["Bilhetes cancelados", s.tickets_cancelled],
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Indicadores em tempo real."
        actions={<>
          <Link href="/admin/pagamentos/nova" className={buttonVariants({ variant: "outline" })}>+ Registar venda</Link>
          {s.payments_reported > 0 ? (
            <Link href="/admin/pagamentos?estado=payment_reported" className={buttonVariants()}>
              Verificar {s.payments_reported} pagamento(s) <ArrowRight />
            </Link>
          ) : null}
        </>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {tiles.map(([label, value, href], i) => {
          const inner = (
            <Card className={`h-full p-5 transition ${href ? "hover:border-hc-red/50" : ""} ${i === 0 ? "col-span-2 bg-gradient-to-br from-hc-red/20 to-coal md:col-span-1" : ""}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
              <p className="mt-2 font-display text-3xl tabular-nums sm:text-4xl">{value}</p>
            </Card>
          );
          return href ? <Link key={label} href={href} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>{inner}</Link> : <div key={label} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>{inner}</div>;
        })}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-white/60">Receita confirmada por dia (30 dias)</h2>
          <RevenueBars data={s.revenue_by_day.map((r) => ({ day: r.day, cents: Number(r.cents) }))} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-white/60">Encomendas por estado</h2>
          <HBar rows={(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((k) => ({ label: ORDER_STATUS_LABEL[k], value: Number(s.orders_by_status[k] ?? 0) }))} />
        </Card>
      </div>
    </div>
  );
}
