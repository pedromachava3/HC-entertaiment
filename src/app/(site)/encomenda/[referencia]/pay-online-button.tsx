"use client";
import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";

export function PayOnlineButton({ code, accessKey, amount }: { code: string; accessKey: string; amount: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(code)}/pay-online`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string" || !data.url.startsWith("https://")) throw new Error(data.error ?? "Não foi possível iniciar o pagamento.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Smartphone />} PAGAR AGORA · {amount}
      </Button>
      <p className="text-center text-xs text-white/50">
        M-Pesa ou e-Mola. Vai para a página segura da PaySuite, indica o seu número e confirma com o PIN <strong>no seu telemóvel</strong>.
        Os bilhetes são emitidos automaticamente.
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
