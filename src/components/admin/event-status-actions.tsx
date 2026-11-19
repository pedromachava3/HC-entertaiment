"use client";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Ban, CheckCircle2, Eye, Loader2, Lock, PlayCircle, Unlock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { setArchivedAction, setEventStatusAction, setSalesStatusAction, type ActionState } from "@/app/admin/actions";
import type { EventRow } from "@/lib/types";

export function EventStatusActions({ event }: { event: EventRow }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  const run = (fn: () => Promise<ActionState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => setMsg(await fn()));
  };
  const s = event.status;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {s === "draft" ? <Button size="sm" onClick={() => run(() => setEventStatusAction(event.id, "published"))}><Eye /> Publicar</Button> : null}
        {s === "published" ? <Button size="sm" variant="outline" onClick={() => run(() => setEventStatusAction(event.id, "draft"))}><Undo2 /> Voltar a rascunho</Button> : null}
        {s === "published" && event.sales_status === "closed" ? <Button size="sm" onClick={() => run(() => setSalesStatusAction(event.id, true))}><Unlock /> Abrir vendas</Button> : null}
        {event.sales_status === "open" ? <Button size="sm" variant="outline" onClick={() => run(() => setSalesStatusAction(event.id, false))}><Lock /> Encerrar vendas</Button> : null}
        {s === "published" ? <Button size="sm" variant="outline" onClick={() => run(() => setEventStatusAction(event.id, "ongoing"), "Marcar o evento como “A decorrer”? As vendas online serão encerradas.")}><PlayCircle /> A decorrer</Button> : null}
        {s === "published" || s === "ongoing" ? <Button size="sm" variant="outline" onClick={() => run(() => setEventStatusAction(event.id, "completed"), "Marcar o evento como realizado?")}><CheckCircle2 /> Realizado</Button> : null}
        {s !== "cancelled" && s !== "completed" ? <Button size="sm" variant="danger" onClick={() => run(() => setEventStatusAction(event.id, "cancelled"), "Cancelar este evento? As vendas serão encerradas e os bilhetes deixam de dar entrada.")}><Ban /> Cancelar evento</Button> : null}
        {event.is_archived
          ? <Button size="sm" variant="ghost" onClick={() => run(() => setArchivedAction(event.id, false))}><ArchiveRestore /> Desarquivar</Button>
          : <Button size="sm" variant="ghost" onClick={() => run(() => setArchivedAction(event.id, true), "Arquivar? O evento deixa de aparecer no site.")}><Archive /> Arquivar</Button>}
        {pending ? <Loader2 className="size-5 animate-spin text-hc-red" /> : null}
      </div>
      {msg?.error ? <Alert tone="error">{msg.error}</Alert> : null}
    </div>
  );
}
