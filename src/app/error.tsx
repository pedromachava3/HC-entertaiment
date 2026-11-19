"use client";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl uppercase">Algo correu mal</h1>
      <p className="mt-3 max-w-md text-mute">Ocorreu um erro inesperado. Tente novamente dentro de instantes.</p>
      <Button className="mt-8" onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
