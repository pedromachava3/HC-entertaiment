"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/config";
import { paymentReportSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

const MAX = 4 * 1024 * 1024;

export function PaymentReportForm({ code, accessKey, defaultMethod }: { code: string; accessKey: string; defaultMethod: PaymentMethodId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethodId>(defaultMethod);
  const [payerPhone, setPayerPhone] = useState("");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <CheckCircle2 /> JÁ EFECTUEI O PAGAMENTO
      </Button>
    );
  }

  function pickFile(f: File | null) {
    setErrors((e) => ({ ...e, proof: "" }));
    if (!f) return setFile(null);
    if (!/\.(jpe?g|png|pdf)$/i.test(f.name) || !["image/jpeg", "image/png", "application/pdf"].includes(f.type)) {
      setErrors((e) => ({ ...e, proof: "Formato inválido. Envie JPG, PNG ou PDF." }));
      if (fileRef.current) fileRef.current.value = "";
      return setFile(null);
    }
    if (f.size > MAX) {
      setErrors((e) => ({ ...e, proof: "O comprovativo excede 4 MB." }));
      if (fileRef.current) fileRef.current.value = "";
      return setFile(null);
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = paymentReportSchema.safeParse({ accessKey, method, payerPhone, transactionRef: ref });
    if (!r.success) {
      const map: Record<string, string> = {};
      for (const i of r.error.issues) map[String(i.path[0])] ??= i.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setBusy(true);
    setServerError(null);
    const fd = new FormData();
    fd.set("accessKey", accessKey);
    fd.set("method", method);
    fd.set("payerPhone", payerPhone);
    fd.set("transactionRef", ref);
    if (file) fd.set("proof", file);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(code)}/payment`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível comunicar o pagamento.");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-white/10 bg-ink/50 p-5">
      <h3 className="font-display text-2xl uppercase">Comunicar pagamento</h3>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">Método utilizado</legend>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PAYMENT_METHODS) as PaymentMethodId[]).map((m) => (
            <label key={m} className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold", method === m ? "border-hc-red bg-hc-red/10" : "border-white/10")}>
              <input type="radio" name="method" className="accent-[#ff1010]" checked={method === m} onChange={() => setMethod(m)} />
              {PAYMENT_METHODS[m].label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Número utilizado na transferência" htmlFor="payerPhone" error={errors.payerPhone} hint="Ex.: 84 123 4567">
        <Input id="payerPhone" type="tel" inputMode="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} aria-invalid={!!errors.payerPhone} />
      </Field>
      <Field label="Referência da transacção" htmlFor="ref" error={errors.transactionRef} hint="Código indicado na mensagem de confirmação do M-Pesa/e-Mola">
        <Input id="ref" value={ref} maxLength={64} autoCapitalize="characters" onChange={(e) => setRef(e.target.value)} aria-invalid={!!errors.transactionRef} />
      </Field>
      <Field label="Comprovativo (opcional)" htmlFor="proof" error={errors.proof} hint="JPG, PNG ou PDF, até 4 MB">
        <label htmlFor="proof" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/70 hover:border-white/40">
          <Upload className="size-5 text-hc-red" />
          <span className="truncate">{file ? file.name : "Seleccionar ficheiro"}</span>
        </label>
        <input ref={fileRef} id="proof" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
      </Field>
      <p className="text-xs text-white/50">Nunca partilhe o seu PIN ou códigos OTP. A HC Entertainment não os pede.</p>
      {serverError ? <Alert tone="error">{serverError}</Alert> : null}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null} Enviar</Button>
      </div>
    </form>
  );
}
