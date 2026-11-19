"use client";
import { useState, useTransition } from "react";
import { CheckCheck, Download, Eye, Loader2, MessageCircle, RefreshCw, Undo2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/copy-button";
import { deliveryAction, regeneratePdfAction, type ActionState } from "@/app/admin/actions";

export function DeliveryPanel({ orderId, message, waUrl, sent, hasPdf }: { orderId: string; message: string; waUrl: string; sent: boolean; hasPdf: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <a href={`/api/admin/orders/${orderId}/pdf?ver=1`} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}><Eye /> Ver Bilhete</a>
        <a href={`/api/admin/orders/${orderId}/pdf`} className={buttonVariants({ size: "sm" })}><Download /> Descarregar PDF</a>
        <CopyButton value={message} label="Copiar Mensagem" onCopied={() => { void deliveryAction(orderId, "message_copied"); }} />
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { void deliveryAction(orderId, "chat_opened"); }}
          className={buttonVariants({ size: "sm", className: "bg-emerald-500 text-ink shadow-none hover:bg-emerald-400" })}
        >
          <MessageCircle /> Abrir WhatsApp do Cliente
        </a>
      </div>
      <Alert tone="info">
        Abrir o WhatsApp <strong>não envia</strong> os ficheiros. Descarregue o PDF, abra a conversa, anexe o PDF e envie. Depois marque como enviado.
      </Alert>
      <div className="flex flex-wrap items-center gap-2">
        {sent ? (
          <>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400"><CheckCheck className="size-4" /> Marcado como enviado</span>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => setMsg(await deliveryAction(orderId, "unmarked_sent")))}><Undo2 /> Desfazer</Button>
          </>
        ) : (
          <Button size="sm" variant="success" disabled={pending} onClick={() => { if (confirm("Confirma que anexou e enviou os PDFs ao cliente pelo WhatsApp?")) start(async () => setMsg(await deliveryAction(orderId, "marked_sent"))); }}>
            <CheckCheck /> Marcar como Enviado
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => setMsg(await regeneratePdfAction(orderId)))}>
          <RefreshCw /> {hasPdf ? "Gerar PDF novamente" : "Gerar PDF"}
        </Button>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      </div>
      {msg?.error ? <Alert tone="error">{msg.error}</Alert> : null}
      {msg?.message ? <Alert tone="success">{msg.message}</Alert> : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-white/60">Pré-visualizar mensagem</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-ink p-4 font-sans text-white/80">{message}</pre>
      </details>
    </div>
  );
}
