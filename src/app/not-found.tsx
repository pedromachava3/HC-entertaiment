import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[10rem] leading-none text-hc-red">404</p>
      <h1 className="font-display text-4xl uppercase">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-mute">A página que procura não existe ou foi movida.</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>Voltar ao início</Link>
    </main>
  );
}
