"use client";
import { useActionState, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Field, Input, Select } from "@/components/ui/primitives";
import { deleteTicketTypeAction, saveTicketTypeAction, type ActionState } from "@/app/admin/actions";
import { formatMZN } from "@/lib/format";
import { availableOf, type TicketTypeRow } from "@/lib/types";

function TypeForm({ eventId, t, onDone }: { eventId: string; t?: TicketTypeRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (s: ActionState, fd: FormData) => {
    const r = await saveTicketTypeAction(s, fd);
    if (r?.ok) onDone();
    return r;
  }, null);
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-white/10 bg-ink/50 p-5 sm:grid-cols-3">
      <input type="hidden" name="eventId" value={eventId} />
      {t ? <input type="hidden" name="id" value={t.id} /> : null}
      <Field label="Nome" htmlFor="tt-name"><Input id="tt-name" name="name" required maxLength={60} defaultValue={t?.name ?? ""} /></Field>
      <Field label="Categoria" htmlFor="tt-cat">
        <Select id="tt-cat" name="category" defaultValue={t?.category ?? "normal"}>
          <option value="normal">Normal</option>
          <option value="vip">VIP</option>
          <option value="other">Outra</option>
        </Select>
      </Field>
      <Field label="Preço (MT)" htmlFor="tt-price"><Input id="tt-price" name="priceMzn" type="number" min={0} step="0.01" required defaultValue={t ? Number(t.price_cents) / 100 : ""} /></Field>
      <Field label="Quantidade total" htmlFor="tt-qty"><Input id="tt-qty" name="quantityTotal" type="number" min={0} required defaultValue={t?.quantity_total ?? ""} /></Field>
      <Field label="Máx. por encomenda" htmlFor="tt-max"><Input id="tt-max" name="maxPerOrder" type="number" min={1} max={50} defaultValue={t?.max_per_order ?? 10} /></Field>
      <Field label="Ordem" htmlFor="tt-sort"><Input id="tt-sort" name="sortOrder" type="number" min={0} defaultValue={t?.sort_order ?? 0} /></Field>
      <Field label="Descrição / benefícios (opcional)" htmlFor="tt-desc" className="sm:col-span-3"><Input id="tt-desc" name="description" maxLength={500} defaultValue={t?.description ?? ""} /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="isActive" defaultChecked={t?.is_active ?? true} className="size-4 accent-[#ff1010]" /> Activa (visível e à venda)</label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Guardar</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancelar</Button>
        {state?.error ? <Alert tone="error" className="py-2">{state.error}</Alert> : null}
      </div>
    </form>
  );
}

export function TicketTypesManager({ eventId, types }: { eventId: string; types: TicketTypeRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  return (
    <div className="space-y-3">
      {types.length === 0 && editing !== "new" ? <p className="text-sm text-mute">Ainda não há categorias de bilhetes.</p> : null}
      {types.map((t) =>
        editing === t.id ? (
          <TypeForm key={t.id} eventId={eventId} t={t} onDone={() => setEditing(null)} />
        ) : (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4">
            <div>
              <p className="flex items-center gap-2 font-semibold">{t.name} {!t.is_active ? <Badge tone="grey">Inactiva</Badge> : null} {t.category === "vip" ? <Badge tone="red">VIP</Badge> : null}</p>
              <p className="text-sm text-mute">
                {formatMZN(t.price_cents)} · Total {t.quantity_total} · Vendidos {t.quantity_sold} · Reservados {t.quantity_reserved} · Disponíveis {availableOf(t)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(t.id)}><Pencil /> Editar</Button>
              <Button size="sm" variant="danger" disabled={pending} onClick={() => { if (confirm(`Eliminar a categoria “${t.name}”?`)) start(async () => setMsg(await deleteTicketTypeAction(t.id))); }}><Trash2 /></Button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? <TypeForm eventId={eventId} onDone={() => setEditing(null)} /> : (
        <Button size="sm" variant="outline" onClick={() => setEditing("new")}><Plus /> Nova categoria</Button>
      )}
      {msg?.error ? <Alert tone="error">{msg.error}</Alert> : null}
      {msg?.message ? <Alert tone="info">{msg.message}</Alert> : null}
    </div>
  );
}
