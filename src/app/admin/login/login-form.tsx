"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, Field, Input } from "@/components/ui/primitives";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("Email ou palavra-passe incorrectos.");
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function magicLink() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Indique o seu email.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin/auth/callback` },
    });
    setBusy(false);
    // Mensagem neutra: não revela se o email existe.
    if (error && error.status === 429) setError("Demasiados pedidos. Tente mais tarde.");
    else setInfo("Se o email estiver autorizado, receberá um link de acesso em breve.");
  }

  return (
    <Card className="p-6">
      <form onSubmit={withPassword} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Palavra-passe" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {info ? <Alert tone="success">{info}</Alert> : null}
        <Button type="submit" className="w-full" disabled={busy || !password}>
          {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Entrar
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-white/30"><span className="h-px flex-1 bg-white/10" />ou<span className="h-px flex-1 bg-white/10" /></div>
      <Button variant="outline" className="w-full" onClick={magicLink} disabled={busy}>
        <Mail /> Receber link de acesso por email
      </Button>
    </Card>
  );
}
