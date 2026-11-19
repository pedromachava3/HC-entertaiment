"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, Field, Input } from "@/components/ui/primitives";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/config";
import { formatDateLong, formatMZN, formatTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { computeTotals } from "@/lib/pricing";
import { checkoutSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

type TypeView = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  priceCents: number;
  maxPerOrder: number;
  available: number;
};

type EventView = { id: string; name: string; eventDate: string; startTime: string | null; venue: string | null; maxPerOrder: number };

const STEPS = ["Bilhetes", "Os seus dados", "Revisão"];

export function CheckoutClient({ event, types }: { event: EventView; types: TypeView[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", method: "" as PaymentMethodId | "", terms: false, privacy: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Chave de idempotência: um duplo clique ou reenvio não cria duas encomendas.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const totals = useMemo(() => computeTotals(types, qty), [types, qty]);

  function change(t: TypeView, delta: number) {
    setQty((prev) => {
      const current = prev[t.id] ?? 0;
      const othersTotal = totals.quantity - current;
      const upper = Math.max(0, Math.min(t.maxPerOrder, t.available, event.maxPerOrder - othersTotal));
      const next = Math.max(0, Math.min(current + delta, upper));
      return { ...prev, [t.id]: next };
    });
  }

  function payload() {
    return {
      eventId: event.id,
      idempotencyKey,
      items: types.map((t) => ({ ticketTypeId: t.id, quantity: qty[t.id] ?? 0 })),
      customerName: form.name,
      customerWhatsapp: form.whatsapp,
      customerEmail: form.email || undefined,
      paymentMethod: form.method,
      acceptTerms: form.terms,
      acceptPrivacy: form.privacy,
    };
  }

  function validateDetails(): boolean {
    const r = checkoutSchema.safeParse(payload());
    if (r.success) {
      setErrors({});
      return true;
    }
    const map: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (key !== "items" && !map[key]) map[key] = issue.message;
    }
    setErrors(map);
    return Object.keys(map).length === 0;
  }

  const parsed = useMemo(() => checkoutSchema.safeParse(payload()), // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, qty, idempotencyKey]);

  async function submit() {
    if (!parsed.success) {
      setStep(1);
      validateDetails();
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível registar a encomenda.");
      try {
        const saved = JSON.parse(localStorage.getItem("hc-orders") ?? "[]") as { code: string; key: string }[];
        localStorage.setItem("hc-orders", JSON.stringify([{ code: data.code, key: data.accessKey }, ...saved.filter((s) => s.code !== data.code)].slice(0, 20)));
      } catch {}
      router.push(`/encomenda/${data.code}?k=${encodeURIComponent(data.accessKey)}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Erro inesperado.");
      setSubmitting(false);
    }
  }

  const err = (k: string) => errors[k] ?? null;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {/* Indicador de passos */}
        <ol className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" aria-label="Passos da compra">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", i < step ? "border-hc-red bg-hc-red" : i === step ? "border-hc-red text-hc-red" : "border-white/20 text-white/40")}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === step ? "text-white" : "text-white/40")}>{s}</span>
              {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-white/10" /> : null}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <section aria-labelledby="sel-title">
            <h2 id="sel-title" className="sr-only">Seleccione os bilhetes</h2>
            <div className="space-y-4">
              {types.map((t) => {
                const q = qty[t.id] ?? 0;
                const soldOut = t.available === 0;
                return (
                  <Card key={t.id} className={cn("p-5 transition", q > 0 && "border-hc-red/60", t.category === "vip" && "bg-gradient-to-br from-hc-red/10 to-coal")}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-3xl uppercase">{t.name}</p>
                          {soldOut ? <Badge tone="grey">Esgotado</Badge> : t.available <= 20 ? <Badge tone="amber">Últimos {t.available}</Badge> : null}
                        </div>
                        <p className="text-lg font-bold">{formatMZN(t.priceCents)}</p>
                        {t.description ? <p className="mt-1 text-sm text-mute">{t.description}</p> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => change(t, -1)}
                          disabled={q === 0}
                          className="flex size-11 items-center justify-center rounded-full border border-white/15 transition hover:border-white/50 disabled:opacity-30"
                          aria-label={`Diminuir ${t.name}`}
                        >
                          <Minus className="size-4" />
                        </button>
                        <output className="w-8 text-center font-display text-3xl tabular-nums" aria-live="polite" aria-label={`Quantidade ${t.name}`}>{q}</output>
                        <button
                          type="button"
                          onClick={() => change(t, 1)}
                          disabled={soldOut || q >= Math.min(t.maxPerOrder, t.available) || totals.quantity >= event.maxPerOrder}
                          className="flex size-11 items-center justify-center rounded-full bg-hc-red transition hover:bg-hc-red-dark disabled:opacity-30"
                          aria-label={`Aumentar ${t.name}`}
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    {q > 0 ? (
                      <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
                        Subtotal: {q} × {formatMZN(t.priceCents)} = <strong className="text-white">{formatMZN(q * t.priceCents)}</strong>
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-white/40">Máximo de {event.maxPerOrder} bilhetes por encomenda.</p>
            <div className="mt-8 flex justify-end">
              <Button size="lg" disabled={totals.quantity === 0} onClick={() => setStep(1)}>
                Continuar <ArrowRight />
              </Button>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (validateDetails()) setStep(2);
            }}
            className="space-y-5"
            aria-labelledby="dados-title"
          >
            <h2 id="dados-title" className="font-display text-3xl uppercase">Os seus dados</h2>
            <p className="text-sm text-mute">Não é necessário criar conta. Os bilhetes serão enviados para o seu WhatsApp.</p>
            <Field label="Nome completo" htmlFor="name" error={err("customerName")}>
              <Input id="name" autoComplete="name" value={form.name} maxLength={120} aria-invalid={!!err("customerName")} aria-describedby={err("customerName") ? "name-error" : undefined} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Número de WhatsApp" htmlFor="whatsapp" hint="Ex.: 84 123 4567" error={err("customerWhatsapp")}>
              <Input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={form.whatsapp} maxLength={25} aria-invalid={!!err("customerWhatsapp")} aria-describedby={err("customerWhatsapp") ? "whatsapp-error" : undefined} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </Field>
            <Field label="Email (opcional)" htmlFor="email" error={err("customerEmail")}>
              <Input id="email" type="email" inputMode="email" autoComplete="email" value={form.email} maxLength={254} aria-invalid={!!err("customerEmail")} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>

            <fieldset>
              <legend className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mute">Método de pagamento</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(PAYMENT_METHODS) as PaymentMethodId[]).map((m) => (
                  <label
                    key={m}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition",
                      form.method === m ? "border-hc-red bg-hc-red/10" : "border-white/10 hover:border-white/30",
                    )}
                  >
                    <span>
                      <span className="block font-semibold">{PAYMENT_METHODS[m].label}</span>
                      <span className="text-sm text-mute">{PAYMENT_METHODS[m].number}</span>
                    </span>
                    <input type="radio" name="method" value={m} checked={form.method === m} onChange={() => setForm({ ...form, method: m })} className="size-5 accent-[#ff1010]" />
                  </label>
                ))}
              </div>
              {err("paymentMethod") ? <p role="alert" className="mt-1.5 text-xs text-hc-red">{err("paymentMethod")}</p> : null}
            </fieldset>

            <div className="space-y-3 rounded-2xl border border-white/10 p-4">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} className="mt-0.5 size-5 accent-[#ff1010]" />
                <span>Li e aceito os <Link href="/termos" target="_blank" className="underline decoration-hc-red underline-offset-4">Termos e Condições</Link>.</span>
              </label>
              {err("acceptTerms") ? <p role="alert" className="text-xs text-hc-red">{err("acceptTerms")}</p> : null}
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={form.privacy} onChange={(e) => setForm({ ...form, privacy: e.target.checked })} className="mt-0.5 size-5 accent-[#ff1010]" />
                <span>Li e aceito a <Link href="/privacidade" target="_blank" className="underline decoration-hc-red underline-offset-4">Política de Privacidade</Link>.</span>
              </label>
              {err("acceptPrivacy") ? <p role="alert" className="text-xs text-hc-red">{err("acceptPrivacy")}</p> : null}
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft /> Voltar</Button>
              <Button type="submit" size="lg">Rever encomenda <ArrowRight /></Button>
            </div>
          </form>
        ) : null}

        {step === 2 && parsed.success ? (
          <section aria-labelledby="rev-title" className="space-y-6">
            <h2 id="rev-title" className="font-display text-3xl uppercase">Confirme a encomenda</h2>
            <Card className="divide-y divide-white/[0.07]">
              <Row label="Evento" value={event.name} />
              <Row label="Data" value={`${formatDateLong(event.eventDate)}${event.startTime ? ` · ${formatTime(event.startTime)}` : ""}`} />
              <Row label="Nome" value={parsed.data.customerName} />
              <Row label="WhatsApp" value={formatPhone(parsed.data.customerWhatsapp)} />
              {parsed.data.customerEmail ? <Row label="Email" value={parsed.data.customerEmail} /> : null}
              <Row label="Pagamento" value={PAYMENT_METHODS[parsed.data.paymentMethod].label} />
            </Card>
            <Alert tone="info" title="Como funciona">
              Ao confirmar, a encomenda é registada e são-lhe mostrados o número e o valor exacto a transferir. Depois de pagar,
              comunique o pagamento. Os bilhetes são emitidos após a HC Entertainment verificar o recebimento.
            </Alert>
            {serverError ? <Alert tone="error" title="Não foi possível concluir">{serverError}</Alert> : null}
            <div className="flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}><ArrowLeft /> Editar</Button>
              <Button size="lg" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Confirmar encomenda
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Resumo */}
      <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Resumo da encomenda">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40"><Ticket className="size-4 text-hc-red" /> Resumo</p>
          <p className="mt-3 font-display text-2xl uppercase leading-tight">{event.name}</p>
          <p className="text-sm text-mute">{formatDateLong(event.eventDate)}</p>
          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
            {totals.lines.length === 0 ? <p className="text-white/40">Nenhum bilhete seleccionado.</p> : null}
            {totals.lines.map((l) => {
              const t = types.find((x) => x.id === l.id)!;
              return (
                <div key={l.id} className="flex justify-between gap-3">
                  <span>{l.quantity} × {t.name} <span className="text-white/40">({formatMZN(l.unitCents)})</span></span>
                  <span className="font-semibold">{formatMZN(l.subtotalCents)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
            <span className="text-sm uppercase tracking-wider text-white/60">Total</span>
            <span className="font-display text-4xl" aria-live="polite">{formatMZN(totals.totalCents)}</span>
          </div>
          <p className="mt-3 text-xs text-white/40">O valor final é confirmado pelo servidor.</p>
        </Card>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-3.5 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
