"use client";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Loader2, RotateCcw, ShieldAlert, WifiOff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Ticket = { number?: string; holder?: string; event?: string; eventDate?: string; category?: string; usedAt?: string | null };
type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "result"; result: string; ticket: Ticket | null; payload: string }
  | { kind: "admitting"; ticket: Ticket | null; payload: string }
  | { kind: "error"; message: string };

const VIEW: Record<string, { title: string; tone: string; icon: React.ReactNode }> = {
  valid: { title: "BILHETE VÁLIDO", tone: "border-emerald-500 bg-emerald-500/15 text-emerald-300", icon: <CheckCircle2 className="size-12" /> },
  admitted: { title: "BILHETE UTILIZADO", tone: "border-emerald-500 bg-emerald-500/25 text-emerald-200", icon: <CheckCircle2 className="size-12" /> },
  already_used: { title: "BILHETE JÁ UTILIZADO", tone: "border-amber-500 bg-amber-500/15 text-amber-300", icon: <ShieldAlert className="size-12" /> },
  cancelled: { title: "BILHETE CANCELADO", tone: "border-hc-red bg-hc-red/15 text-hc-red", icon: <XCircle className="size-12" /> },
  event_cancelled: { title: "EVENTO CANCELADO", tone: "border-hc-red bg-hc-red/15 text-hc-red", icon: <XCircle className="size-12" /> },
  invalid: { title: "BILHETE INVÁLIDO", tone: "border-hc-red bg-hc-red/15 text-hc-red", icon: <XCircle className="size-12" /> },
};

async function call(payload: string, action: "lookup" | "admit") {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch("/api/admin/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, action }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erro no servidor.");
    return data as { result: string; ticket: Ticket | null };
  } finally {
    clearTimeout(t);
  }
}

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "denied">("off");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("off");
  }, []);

  const check = useCallback(async (payload: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setState({ kind: "checking" });
    try {
      const r = await call(payload, "lookup");
      setState({ kind: "result", result: r.result, ticket: r.ticket, payload });
      if (navigator.vibrate) navigator.vibrate(r.result === "valid" ? 80 : [60, 60, 60]);
    } catch {
      setState({ kind: "error", message: "A validação não pôde ser concluída. Verifique a ligação à Internet e leia novamente. O bilhete NÃO foi marcado como utilizado." });
    }
  }, []);

  const start = useCallback(async () => {
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }, []);

  useEffect(() => {
    if (camera !== "on") return;
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 160 || busyRef.current) return;
      last = ts;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      const w = Math.min(640, v.videoWidth);
      const h = Math.round((v.videoHeight / v.videoWidth) * w);
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (code?.data) void check(code.data);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camera, check]);

  useEffect(() => stop, [stop]);

  async function admit(payload: string, ticket: Ticket | null) {
    setState({ kind: "admitting", ticket, payload });
    try {
      const r = await call(payload, "admit");
      setState({ kind: "result", result: r.result, ticket: { ...ticket, ...r.ticket }, payload });
    } catch {
      setState({ kind: "error", message: "A ligação falhou durante a confirmação. Leia o bilhete novamente para verificar se a entrada ficou registada antes de deixar entrar." });
    }
  }

  function next() {
    busyRef.current = false;
    setState({ kind: "idle" });
  }

  const view = state.kind === "result" ? VIEW[state.result] ?? VIEW.invalid : null;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-black">
        <video ref={videoRef} playsInline muted className={cn("h-full w-full object-cover", camera !== "on" && "hidden")} />
        <canvas ref={canvasRef} className="hidden" />
        {camera === "on" ? <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-hc-red/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" /> : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {camera === "denied" ? (
              <>
                <CameraOff className="size-10 text-hc-red" />
                <p className="text-sm text-white/70">Sem acesso à câmara. Autorize a câmara nas definições do navegador ou introduza o código manualmente.</p>
              </>
            ) : (
              <Button size="lg" onClick={start} disabled={camera === "starting"}>
                {camera === "starting" ? <Loader2 className="animate-spin" /> : <Camera />} Activar câmara
              </Button>
            )}
          </div>
        )}
      </div>

      {state.kind === "checking" ? <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-6"><Loader2 className="animate-spin" /> A verificar…</div> : null}

      {state.kind === "error" ? (
        <div className="space-y-3 rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-5 text-amber-100" role="alert">
          <p className="flex items-center gap-2 font-display text-2xl"><WifiOff /> VALIDAÇÃO NÃO CONCLUÍDA</p>
          <p className="text-sm">{state.message}</p>
          <Button variant="outline" onClick={next}><RotateCcw /> Tentar novamente</Button>
        </div>
      ) : null}

      {(state.kind === "result" || state.kind === "admitting") ? (
        <div className={cn("space-y-4 rounded-2xl border-2 p-5", state.kind === "admitting" ? VIEW.valid.tone : view!.tone)} role="status" aria-live="assertive">
          <div className="flex items-center gap-3">
            {state.kind === "admitting" ? <Loader2 className="size-12 animate-spin" /> : view!.icon}
            <p className="font-display text-3xl">{state.kind === "admitting" ? "A REGISTAR…" : view!.title}</p>
          </div>
          {state.ticket ? (
            <dl className="grid grid-cols-2 gap-2 text-sm text-white">
              {state.ticket.holder ? <><dt className="text-white/50">Nome</dt><dd className="font-semibold">{state.ticket.holder}</dd></> : null}
              {state.ticket.event ? <><dt className="text-white/50">Evento</dt><dd>{state.ticket.event}</dd></> : null}
              {state.ticket.category ? <><dt className="text-white/50">Categoria</dt><dd className="font-semibold">{state.ticket.category}</dd></> : null}
              {state.ticket.number ? <><dt className="text-white/50">N.º do bilhete</dt><dd className="font-mono">{state.ticket.number}</dd></> : null}
              {state.ticket.usedAt ? <><dt className="text-white/50">Entrada</dt><dd>{new Date(state.ticket.usedAt).toLocaleString("pt-PT", { timeZone: "Africa/Maputo" })}</dd></> : null}
            </dl>
          ) : null}
          <div className="flex gap-2">
            {state.kind === "result" && state.result === "valid" ? (
              <Button variant="success" size="lg" className="flex-1" onClick={() => admit(state.payload, state.ticket)}>
                <CheckCircle2 /> Confirmar entrada
              </Button>
            ) : null}
            {state.kind === "result" ? <Button variant="outline" size="lg" onClick={next}>Seguinte</Button> : null}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { busyRef.current = false; void check(manual.trim()); setManual(""); } }}
        className="flex gap-2"
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código do QR (introdução manual)" aria-label="Código do QR" />
        <Button type="submit" variant="outline" disabled={!manual.trim()}>Verificar</Button>
      </form>
      {camera === "on" ? <Button variant="ghost" className="w-full" onClick={stop}><CameraOff /> Desligar câmara</Button> : null}
    </div>
  );
}
