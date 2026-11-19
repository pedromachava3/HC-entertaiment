"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Input } from "@/components/ui/primitives";

const MAX = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function putWithProgress(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha no envio (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Falha de ligação durante o envio."));
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

export function PosterUploader({
  eventId,
  kind,
  replaceImageId,
  label = "Carregar cartaz",
  withTitle = false,
}: {
  eventId: string | null;
  kind: "poster" | "gallery";
  replaceImageId?: string | null;
  label?: string;
  withTitle?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | null) {
    setError(null);
    setDone(false);
    if (!f) return;
    if (!TYPES.includes(f.type) || !/\.(jpe?g|png|webp)$/i.test(f.name)) {
      setError("Formato inválido. Envie JPG, JPEG, PNG ou WebP.");
      return;
    }
    if (f.size > MAX) {
      setError("A imagem excede 10 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      setStage("A preparar…");
      const sign = await fetch("/api/admin/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, size: file.size, mime: file.type }),
      });
      const s = await sign.json();
      if (!sign.ok) throw new Error(s.error ?? "Não foi possível iniciar o envio.");
      setStage("A enviar…");
      await putWithProgress(s.signedUrl, file, setProgress);
      setStage("A validar e optimizar…");
      const done = await fetch("/api/admin/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: s.path, eventId, kind, title: title || null, replaceImageId: replaceImageId ?? null }),
      });
      const d = await done.json();
      if (!done.ok) throw new Error(d.error ?? "Falha ao processar a imagem.");
      setDone(true);
      setFile(null);
      setPreview(null);
      setTitle("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setProgress(null);
      setStage("");
    }
  }

  return (
    <div className="space-y-3">
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 p-6 text-center text-sm text-white/70 transition hover:border-hc-red/60"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        {preview ? (
          <img src={preview} alt="Pré-visualização" className="max-h-64 w-auto rounded-lg object-contain" />
        ) : (
          <>
            {replaceImageId ? <RefreshCw className="size-6 text-hc-red" /> : <ImagePlus className="size-6 text-hc-red" />}
            <span className="font-semibold">{label}</span>
            <span className="text-xs text-white/40">JPG, JPEG, PNG ou WebP · até 10 MB · arraste ou clique</span>
          </>
        )}
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </label>
      {withTitle && file ? <Input placeholder="Título (opcional)" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /> : null}
      {progress !== null ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-hc-red transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-white/50">{stage} {stage === "A enviar…" ? `${progress}%` : ""}</p>
        </div>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">Imagem carregada e optimizada. O original foi preservado.</Alert> : null}
      {file && progress === null ? (
        <div className="flex gap-2">
          <Button onClick={upload}><ImagePlus /> Enviar</Button>
          <Button variant="ghost" onClick={() => { setFile(null); setPreview(null); }}>Cancelar</Button>
        </div>
      ) : progress !== null ? <Loader2 className="size-5 animate-spin text-hc-red" /> : null}
    </div>
  );
}
