import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, formatMZN } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { PAYMENT_METHODS } from "@/lib/config";
import { ORDER_STATUS_LABEL, orderStatusTone as statusTone, type OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "payment_reported", label: "Por verificar" },
  { key: "pending_payment", label: "Aguarda pagamento" },
  { key: "paid", label: "Confirmados" },
  { key: "expired", label: "Expirados" },
  { key: "cancelled", label: "Cancelados" },
  { key: "all", label: "Todos" },
];

export default async function Payments(props: PageProps<"/admin/pagamentos">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const estado = (typeof sp.estado === "string" ? sp.estado : "payment_reported") as OrderStatus | "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";

  let query = supabaseAdmin()
    .from("orders")
    .select("id, code, status, customer_name, customer_whatsapp, payment_method, total_cents, created_at, delivery_status, event:events(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (estado !== "all") query = query.eq("status", estado);
  if (q) {
    const safe = q.replace(/[%,()]/g, "");
    query = query.or(`code.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_whatsapp.ilike.%${safe.replace(/\s/g, "")}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const orders = (data ?? []) as unknown as {
    id: string; code: string; status: OrderStatus; customer_name: string; customer_whatsapp: string;
    payment_method: "mpesa" | "emola"; total_cents: number; created_at: string; delivery_status: string; event: { name: string } | null;
  }[];

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        description="Verifique cada transacção no M-Pesa/e-Mola antes de confirmar."
        actions={<Link href="/admin/pagamentos/nova" className={buttonVariants()}>+ Registar venda (WhatsApp)</Link>}
      />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/admin/pagamentos?estado=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn(buttonVariants({ size: "sm", variant: estado === f.key ? "primary" : "outline" }))}>
              {f.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2" action="/admin/pagamentos">
          <input type="hidden" name="estado" value={estado} />
          <Input name="q" defaultValue={q} placeholder="Código, nome ou telefone" className="w-64" />
        </form>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-white/40">
            <tr className="border-b border-white/10">
              <th className="p-4">Encomenda</th><th className="p-4">Cliente</th><th className="p-4">Evento</th><th className="p-4">Método</th><th className="p-4 text-right">Total</th><th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-mute">Sem encomendas neste filtro.</td></tr> : null}
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-4"><Link href={`/admin/pagamentos/${o.id}`} className="font-mono font-semibold text-white hover:text-hc-red">{o.code}</Link><p className="text-xs text-white/40">{formatDateTime(o.created_at)}</p></td>
                <td className="p-4">{o.customer_name}<p className="text-xs text-white/40">{formatPhone(o.customer_whatsapp)}</p></td>
                <td className="p-4 text-white/70">{o.event?.name}</td>
                <td className="p-4">{PAYMENT_METHODS[o.payment_method].label}</td>
                <td className="p-4 text-right font-semibold">{formatMZN(o.total_cents)}</td>
                <td className="p-4">
                  <Badge tone={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status].split(" — ")[0]}</Badge>
                  {o.status === "paid" ? <p className="mt-1 text-xs text-white/40">{o.delivery_status === "sent" ? "Enviado" : "Por enviar"}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
