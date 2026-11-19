"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/** Recebe convites enviados pelo administrador (tokens no fragmento do URL) e inicia a sessão. */
export default function ConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    history.replaceState(null, "", window.location.pathname);
    const session = access_token && refresh_token ? { access_token, refresh_token } : null;
    Promise.resolve(session)
      .then((s) => {
        if (!s) throw new Error("missing");
        return supabaseBrowser().auth.setSession(s);
      })
      .catch(() => ({ error: new Error("invalid") }))
      .then(({ error }) => {
        if (error) setError("Link inválido ou expirado.");
        else router.replace("/admin/conta?novo=1");
      });
  }, [router]);
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      {error ? <p className="text-hc-red">{error}</p> : <Loader2 className="size-8 animate-spin text-hc-red" />}
    </main>
  );
}
