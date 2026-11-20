"use client";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select } from "@/components/ui/primitives";
import { registerPaymentAction } from "@/app/admin/actions";

export function RegisterPaymentForm({ orderId, amount, defaultMethod, defaultPhone }: { orderId: string; amount: string; defaultMethod: string; defaultPhone: string }) {
  const [state, action, pending] = useActionState(registerPaymentAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-sm text-white/70">O cliente pagou mas enviou o comprovativo pelo WhatsApp? Registe aqui o pagamento.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Método" htmlFor="rp-m">
          <Select id="rp-m" name="method" defaultValue={defaultMethod}><option value="mpesa">M-Pesa</option><option value="emola">e-Mola</option></Select>
        </Field>
        <Field label="Número que pagou" htmlFor="rp-p"><Input id="rp-p" name="payerPhone" type="tel" defaultValue={defaultPhone} required /></Field>
        <Field label="Referência" htmlFor="rp-r"><Input id="rp-r" name="transactionRef" required maxLength={64} /></Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm">
        <input type="checkbox" name="confirmed" value="yes" required className="mt-0.5 size-5 accent-[#ff1010]" />
        Verifiquei que recebi exactamente {amount} com esta referência.
      </label>
      <Button type="submit" variant="success" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Registar pagamento e emitir bilhetes</Button>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
    </form>
  );
}
