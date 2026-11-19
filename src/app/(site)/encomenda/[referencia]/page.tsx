import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Download, Hourglass, MessageCircle, Ticket, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Alert, Badge, Card, Container } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/copy-button";
import { PaymentReportForm } from "./payment-report-form";
import { getOrderForCustomer, publicOrderView } from "@/lib/data/orders";
import { PAYMENT_METHODS } from "@/lib/config";
import { formatAmount, formatDateLong, formatDateTime, formatMZN, formatTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { countByCategory, customerToCompanyLink } from "@/lib/whatsapp";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "A minha encomenda", robots: { index: false, follow: false } };

export default async function OrderPage(props: PageProps<"/encomenda/[referencia]">) {
  const { referencia } = await props.params;
  const sp = await props.searchParams;
  const key = typeof sp.k === "string" ? sp.k : null;
  const raw = isSupabaseConfigured() ? await getOrderForCustomer(decodeURIComponent(referencia), key) : null;

  if (!raw) {
    return (
      <div className="pt-32">
        <Container className="max-w-xl text-center">
          <AlertTriangle className="mx-auto size-10 text-hc-red" />
          <h1 className="mt-4 font-display text-5xl uppercase">Encomenda não encontrada</h1>
          <p className="mt-4 text-mute">
            Por segurança, as encomendas só podem ser consultadas através do link privado mostrado no final da compra.
            Se o perdeu, contacte a HC Entertainment pelo WhatsApp indicando o código da encomenda.
          </p>
          <Link href="/" className={buttonVariants({ className: "mt-8" })}>Voltar ao início</Link>
        </Container>
      </div>
    );
  }

  const order = publicOrderView(raw);
  const method = PAYMENT_METHODS[order.payment_method];
  const counts = countByCategory(order.order_items);
  const quantity = order.order_items.reduce((s, i) => s + i.quantity, 0);
  const latest = order.payment_submissions[0];
  const rejected = latest?.status === "rejected" && order.status === "pending_payment";
  const pending = order.payment_submissions.find((s) => s.status === "pending");

  return (
    <div className="pt-28 sm:pt-32">
      <Container className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Encomenda</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-5xl uppercase sm:text-6xl">{order.code}</h1>
          <CopyButton value={order.code} label="Copiar código" />
        </div>

        {/* ===== Estado ===== */}
        <div className="mt-8">
          {order.status === "pending_payment" ? (
            <StatusBanner tone="amber" icon={<Clock />} title="AGUARDA PAGAMENTO">
              {order.expires_at ? <>Efectue o pagamento até <strong>{formatDateTime(order.expires_at)}</strong>. Depois desse prazo a encomenda expira.</> : null}
            </StatusBanner>
          ) : order.status === "payment_reported" ? (
            <StatusBanner tone="amber" icon={<Hourglass />} title="PAGAMENTO COMUNICADO — EM VERIFICAÇÃO">
              O pagamento foi comunicado e encontra-se em verificação. Após a confirmação do recebimento, a HC Entertainment emitirá os seus bilhetes digitais.
            </StatusBanner>
          ) : order.status === "paid" ? (
            <StatusBanner tone="green" icon={<CheckCircle2 />} title="PAGAMENTO CONFIRMADO — BILHETES GERADOS">
              Os seus bilhetes digitais foram emitidos. A HC Entertainment irá enviá-los para o seu WhatsApp; também os pode descarregar abaixo.
            </StatusBanner>
          ) : (
            <StatusBanner tone="red" icon={<XCircle />} title={order.status === "expired" ? "ENCOMENDA EXPIRADA" : "ENCOMENDA CANCELADA"}>
              Esta encomenda já não aceita pagamentos. {order.status === "expired" ? "Pode fazer uma nova encomenda." : ""}
            </StatusBanner>
          )}
        </div>

        <Alert tone="warning" className="mt-4">
          Guarde este link: é a única forma de consultar esta encomenda. Não o partilhe.
        </Alert>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ===== Pagamento ===== */}
          <div className="space-y-6">
            {order.status === "pending_payment" ? (
              <Card className="p-6">
                {rejected ? (
                  <Alert tone="error" className="mb-5" title="Comprovativo não aceite">
                    A comunicação anterior não foi validada{latest?.status === "rejected" ? "" : ""}. Verifique os dados e comunique novamente.
                  </Alert>
                ) : null}
                <h2 className="font-display text-3xl uppercase">Instruções de pagamento</h2>
                <ol className="mt-4 space-y-2 text-sm text-white/75">
                  <li>1. Abra o {method.label} no seu telemóvel e escolha transferir dinheiro.</li>
                  <li>2. Transfira <strong className="text-white">exactamente {formatMZN(order.total_cents)}</strong> para o número abaixo.</li>
                  <li>3. Guarde a referência da transacção que recebe por SMS.</li>
                  <li>4. Volte a esta página e carregue em <strong className="text-white">“Já efectuei o pagamento”</strong>.</li>
                </ol>
                <dl className="mt-6 space-y-3">
                  <CopyRow label="Método" value={method.label} />
                  <CopyRow label="Número" value={method.number} copy={method.digits} />
                  <CopyRow label="Valor exacto" value={formatMZN(order.total_cents)} copy={formatAmount(order.total_cents).replace(/\./g, "")} highlight />
                  <CopyRow label="Referência da encomenda" value={order.code} copy={order.code} />
                </dl>
                <p className="mt-4 text-xs text-white/50">
                  Também pode pagar por {order.payment_method === "mpesa" ? `${PAYMENT_METHODS.emola.label} (${PAYMENT_METHODS.emola.number})` : `${PAYMENT_METHODS.mpesa.label} (${PAYMENT_METHODS.mpesa.number})`} — indique o método correcto ao comunicar.
                  Nunca partilhe o seu PIN ou códigos OTP.
                </p>
                <div className="mt-6">
                  <PaymentReportForm code={order.code} accessKey={key!} defaultMethod={order.payment_method} />
                </div>
              </Card>
            ) : null}

            {order.status === "payment_reported" && pending ? (
              <Card className="p-6">
                <h2 className="font-display text-3xl uppercase">Pagamento comunicado</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-white/50">Método</dt><dd>{PAYMENT_METHODS[pending.method].label}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/50">Referência</dt><dd className="font-mono">{pending.transaction_ref}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/50">Comprovativo</dt><dd>{pending.has_proof ? "Enviado" : "Não enviado"}</dd></div>
                </dl>
                <a
                  href={customerToCompanyLink({
                    customerName: order.customer_name,
                    eventName: order.event.name,
                    eventDate: order.event.event_date,
                    orderCode: order.code,
                    counts,
                    totalCents: order.total_cents,
                    method: pending.method,
                    transactionRef: pending.transaction_ref,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-emerald-500 text-ink shadow-none hover:bg-emerald-400" })}
                >
                  <MessageCircle /> CONTACTAR HC ENTERTAINMENT
                </a>
                <p className="mt-3 text-xs text-white/50">
                  Abre o WhatsApp com uma mensagem pré-preenchida. A sua encomenda já está registada no sistema, quer envie a mensagem quer não.
                </p>
              </Card>
            ) : null}

            {order.status === "paid" ? (
              <Card className="p-6">
                <h2 className="font-display text-3xl uppercase">Os seus bilhetes</h2>
                <ul className="mt-4 space-y-2">
                  {order.tickets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
                      <span className="flex items-center gap-3"><Ticket className="size-4 text-hc-red" /><span className="font-mono">{t.ticket_number}</span></span>
                      <span className="flex items-center gap-2">
                        <Badge tone={t.category === "vip" ? "red" : "white"}>{t.ticket_type_name}</Badge>
                        {t.status !== "valid" ? <Badge tone="grey">{t.status === "used" ? "Utilizado" : "Cancelado"}</Badge> : null}
                      </span>
                    </li>
                  ))}
                </ul>
                <a href={`/api/orders/${order.code}/pdf?k=${encodeURIComponent(key!)}`} className={buttonVariants({ size: "lg", className: "mt-6 w-full" })}>
                  <Download /> Descarregar bilhetes (PDF)
                </a>
              </Card>
            ) : null}
          </div>

          {/* ===== Resumo ===== */}
          <Card className="h-fit p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">Resumo</p>
            <p className="mt-3 font-display text-2xl uppercase">{order.event.name}</p>
            <p className="text-sm text-mute">
              {formatDateLong(order.event.event_date)}{order.event.start_time ? ` · ${formatTime(order.event.start_time)}` : ""}
            </p>
            {order.event.venue ? <p className="text-sm text-mute">{order.event.venue}</p> : null}
            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
              {order.order_items.map((i) => (
                <div key={i.id} className="flex justify-between gap-3">
                  <span>{i.quantity} × {i.ticket_type_name} <span className="text-white/40">({formatMZN(i.unit_price_cents)})</span></span>
                  <span className="font-semibold">{formatMZN(i.line_total_cents)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
              <span className="text-sm uppercase tracking-wider text-white/60">Total ({quantity})</span>
              <span className="font-display text-4xl">{formatMZN(order.total_cents)}</span>
            </div>
            <dl className="mt-5 space-y-1.5 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-white/50">Nome</dt><dd>{order.customer_name}</dd></div>
              <div className="flex justify-between"><dt className="text-white/50">WhatsApp</dt><dd>{formatPhone(order.customer_whatsapp)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/50">Criada</dt><dd>{formatDateTime(order.created_at)}</dd></div>
            </dl>
          </Card>
        </div>
      </Container>
    </div>
  );
}

function StatusBanner({ tone, icon, title, children }: { tone: "amber" | "green" | "red"; icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  const tones = {
    amber: "border-amber-500/40 bg-amber-500/10 [&_svg]:text-amber-300",
    green: "border-emerald-500/40 bg-emerald-500/10 [&_svg]:text-emerald-400",
    red: "border-hc-red/40 bg-hc-red/10 [&_svg]:text-hc-red",
  };
  return (
    <div role="status" className={`flex gap-4 rounded-2xl border p-5 ${tones[tone]}`}>
      <span className="[&_svg]:size-7">{icon}</span>
      <div>
        <p className="font-display text-2xl uppercase tracking-wide">{title}</p>
        {children ? <p className="mt-1 text-sm text-white/80">{children}</p> : null}
      </div>
    </div>
  );
}

function CopyRow({ label, value, copy, highlight }: { label: string; value: string; copy?: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${highlight ? "border-hc-red/50 bg-hc-red/10" : "border-white/10"}`}>
      <div>
        <dt className="text-xs uppercase tracking-wider text-white/50">{label}</dt>
        <dd className={highlight ? "font-display text-3xl" : "text-lg font-semibold"}>{value}</dd>
      </div>
      {copy ? <CopyButton value={copy} /> : null}
    </div>
  );
}
