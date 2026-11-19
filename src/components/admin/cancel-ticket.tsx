"use client";
import { useActionState, useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { cancelTicketAction } from "@/app/admin/actions";

export function CancelTicket({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelTicketAction, null);
  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Ban /> Cancelar</Button>;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Input name="reason" placeholder="Motivo" required minLength={3} maxLength={300} className="h-9 w-40 py-1" />
      <Button type="submit" size="sm" variant="danger" disabled={pending}>OK</Button>
      {state?.error ? <span className="text-xs text-hc-red">{state.error}</span> : null}
    </form>
  );
}
