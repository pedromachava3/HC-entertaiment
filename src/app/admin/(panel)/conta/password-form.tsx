"use client";
import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/primitives";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return setMsg({ tone: "error", text: "Use pelo menos 10 caracteres." });
    if (pw !== pw2) return setMsg({ tone: "error", text: "As palavras-passe não coincidem." });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    setMsg(error ? { tone: "error", text: "Não foi possível alterar. Tente novamente." } : { tone: "success", text: "Palavra-passe definida." });
    if (!error) { setPw(""); setPw2(""); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nova palavra-passe" htmlFor="pw"><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <Field label="Repetir" htmlFor="pw2"><Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
      <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Guardar</Button>
    </form>
  );
}
