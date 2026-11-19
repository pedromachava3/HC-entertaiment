import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logótipo oficial, sem alterações de design nem de cores.
 * Como o "H" é preto, é apresentado sobre uma placa branca para manter a legibilidade no tema escuro.
 */
export function Logo({ className, size = 44, priority = false }: { className?: string; size?: number; priority?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]", className)}
      style={{ height: size }}
    >
      <Image
        src="/brand/hc-logo.png"
        alt="HC — Hot Crazy Entertainment"
        width={359}
        height={292}
        priority={priority}
        className="h-full w-auto"
      />
    </span>
  );
}
