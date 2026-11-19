"use client";
import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Textarea } from "@/components/ui/primitives";
import type { ActionState } from "@/app/admin/actions";
import type { EventRow } from "@/lib/types";

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

export function EventForm({ event, action }: { event?: EventRow; action: (s: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <Field label="Nome do evento" htmlFor="name" className="sm:col-span-2">
        <Input id="name" name="name" required maxLength={150} value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
      </Field>
      <Field label="Endereço (slug)" htmlFor="slug" hint="Usado no URL: /eventos/slug">
        <Input id="slug" name="slug" required maxLength={120} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
      </Field>
      <Field label="Máx. bilhetes por encomenda" htmlFor="maxTicketsPerOrder">
        <Input id="maxTicketsPerOrder" name="maxTicketsPerOrder" type="number" min={1} max={50} defaultValue={event?.max_tickets_per_order ?? 10} />
      </Field>
      <Field label="Data" htmlFor="eventDate">
        <Input id="eventDate" name="eventDate" type="date" required defaultValue={event?.event_date} />
      </Field>
      <Field label="Horário (opcional)" htmlFor="startTime" hint="Deixe vazio se ainda não estiver definido">
        <Input id="startTime" name="startTime" type="time" defaultValue={event?.start_time?.slice(0, 5) ?? ""} />
      </Field>
      <Field label="Local" htmlFor="venue">
        <Input id="venue" name="venue" maxLength={150} defaultValue={event?.venue ?? ""} />
      </Field>
      <Field label="Cidade" htmlFor="city">
        <Input id="city" name="city" maxLength={100} defaultValue={event?.city ?? ""} />
      </Field>
      <Field label="Morada / referência" htmlFor="address" className="sm:col-span-2">
        <Input id="address" name="address" maxLength={300} defaultValue={event?.address ?? ""} />
      </Field>
      <Field label="Descrição" htmlFor="description" className="sm:col-span-2">
        <Textarea id="description" name="description" maxLength={5000} rows={5} defaultValue={event?.description ?? ""} />
      </Field>
      <Field label="Line-up (um por linha)" htmlFor="lineup" className="sm:col-span-2">
        <Textarea id="lineup" name="lineup" rows={4} defaultValue={event?.lineup.join("\n") ?? ""} />
      </Field>
      <Field label="Informação de entrada na porta (opcional)" htmlFor="doorInfo" className="sm:col-span-2" hint="Ex.: preços na porta, consumo mínimo">
        <Input id="doorInfo" name="doorInfo" maxLength={300} defaultValue={event?.door_info ?? ""} />
      </Field>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} {event ? "Guardar alterações" : "Criar evento (rascunho)"}</Button>
        {state?.error ? <Alert tone="error" className="py-2">{state.error}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="success" className="py-2">{state.message}</Alert> : null}
      </div>
    </form>
  );
}
