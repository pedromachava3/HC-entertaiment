"use client";
import { useActionState, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Textarea } from "@/components/ui/primitives";
import { reviewPaymentAction } from "@/app/admin/actions";

export function ReviewPanel({ submissionId, amount, method, payerPhone, reference }: { submissionId: string; amount: string; method: string; payerPhone: string; reference: string }) {
  const [state, action, pending] = useActionState(reviewPaymentAction, null);
  const [checked, setChecked] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="submissionId" value={submissionId} />
      <Alert tone="warning" title="Antes de confirmar">
        Abra o {method} da HC Entertainment e confirme que recebeu <strong>{amount}</strong> do número <strong>{payerPhone}</strong> com a referência <strong className="font-mono">{reference}</strong>.
        Um comprovativo ou o botão “Já paguei” do cliente não são prova de pagamento.
      </Alert>
      <label className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm">
        <input type="checkbox" name="confirmed" value="yes" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-5 accent-[#ff1010]" />
        Verifiquei no {method} que o valor exacto foi recebido.
      </label>
      <Textarea name="note" placeholder="Nota (obrigatória para rejeitar)" maxLength={500} rows={2} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="action" value="confirm" variant="success" disabled={pending || !checked}>
          {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Confirmar Pagamento
        </Button>
        <Button type="submit" name="action" value="keep_pending" variant="outline" disabled={pending}><Clock /> Manter Pendente</Button>
        <Button type="submit" name="action" value="reject" variant="danger" disabled={pending}><XCircle /> Rejeitar Comprovativo</Button>
      </div>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
    </form>
  );
}
