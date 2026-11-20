"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Actualiza a página periodicamente enquanto se aguarda a confirmação automática do pagamento. */
export function AutoRefresh({ everyMs = 4000, maxTimes = 40 }: { everyMs?: number; maxTimes?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > maxTimes) return clearInterval(id);
      router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, maxTimes]);
  return null;
}
