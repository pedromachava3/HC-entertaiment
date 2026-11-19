"use client";
import { useActionState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Input } from "@/components/ui/primitives";
import { cancelOrderAction } from "@/app/admin/actions";

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(cancelOrderAction, null);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Cancelar esta encomenda e libertar os bilhetes reservados?")) e.preventDefault(); }} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <Input name="note" placeholder="Motivo (opcional)" maxLength={300} className="w-56" />
      <Button type="submit" size="sm" variant="danger" disabled={pending}><Ban /> Cancelar encomenda</Button>
      {state?.error ? <Alert tone="error" className="py-2">{state.error}</Alert> : null}
    </form>
  );
}
