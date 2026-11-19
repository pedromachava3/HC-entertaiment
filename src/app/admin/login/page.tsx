import type { Metadata } from "next";
import { Logo } from "@/components/site/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Área reservada", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const sp = await props.searchParams;
  const err = typeof sp.erro === "string" ? sp.erro : null;
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-16">
      <div className="absolute -top-40 left-1/2 -z-10 size-[600px] -translate-x-1/2 rounded-full bg-hc-red/20 blur-[140px]" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} priority />
          <h1 className="mt-6 font-display text-4xl uppercase">Área reservada</h1>
          <p className="mt-2 text-sm text-mute">Administradores e funcionários de validação.</p>
        </div>
        <LoginForm initialError={err === "link" ? "O link de acesso é inválido ou expirou." : null} />
      </div>
    </main>
  );
}
