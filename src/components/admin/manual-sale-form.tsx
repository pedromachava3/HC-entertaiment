"use client";
import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select } from "@/components/ui/primitives";
import { manualSaleAction } from "@/app/admin/actions";
import { formatMZN } from "@/lib/format";

type Ev = { id: string; name: string; date: string; types: { id: string; name: string; priceCents: number; available: number }[] };

export function ManualSaleForm({ events }: { events: Ev[] }) {
  const [state, action, pending] = useActionState(manualSaleAction, null);
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const ev = events.find((e) => e.id === eventId);
  const total = useMemo(() => (ev?.types ?? []).reduce((s, t) => s + (qty[t.id] ?? 0) * t.priceCents, 0), [ev, qty]);

  if (events.length === 0) return <Alert tone="warning">Não há eventos com vendas abertas.</Alert>;

  return (
    <form action={action} className="space-y-5">
      <Field label="Evento" htmlFor="ms-ev">
        <Select id="ms-ev" name="eventId" value={eventId} onChange={(e) => { setEventId(e.target.value); setQty({}); }}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.date}</option>)}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {(ev?.types ?? []).map((t) => (
          <Field key={t.id} label={`${t.name} · ${formatMZN(t.priceCents)} (disp. ${t.available})`} htmlFor={`q-${t.id}`}>
            <Input id={`q-${t.id}`} name={`qty_${t.id}`} type="number" min={0} max={Math.min(50, t.available)} inputMode="numeric"
              value={qty[t.id] ?? ""} onChange={(e) => setQty({ ...qty, [t.id]: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
        <span className="text-sm text-white/60">Total a confirmar</span>
        <span className="font-display text-3xl">{formatMZN(total)}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do cliente" htmlFor="ms-name"><Input id="ms-name" name="customerName" required maxLength={120} /></Field>
        <Field label="WhatsApp do cliente" htmlFor="ms-wa" hint="Para onde vai enviar os bilhetes"><Input id="ms-wa" name="customerWhatsapp" type="tel" required /></Field>
        <Field label="Método" htmlFor="ms-m">
          <Select id="ms-m" name="method" defaultValue="mpesa"><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option></Select>
        </Field>
        <Field label="Referência da transacção" htmlFor="ms-ref"><Input id="ms-ref" name="transactionRef" required maxLength={64} autoCapitalize="characters" /></Field>
        <Field label="Número que pagou (se diferente do WhatsApp)" htmlFor="ms-payer" className="sm:col-span-2"><Input id="ms-payer" name="payerPhone" type="tel" /></Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm">
        <input type="checkbox" name="confirmed" value="yes" required className="mt-0.5 size-5 accent-[#ff1010]" />
        Verifiquei no M-Pesa/e-Mola da HC que recebi exactamente {formatMZN(total)} com esta referência.
      </label>
      <Button type="submit" size="lg" variant="success" disabled={pending || total === 0}>
        {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Registar venda e emitir bilhetes
      </Button>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
