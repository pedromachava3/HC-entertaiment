"use client";
import { useTransition } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteImageAction, toggleGalleryAction } from "@/app/admin/actions";

export function GalleryItemActions({ id, visible, isPoster }: { id: string; visible: boolean; isPoster: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await toggleGalleryAction(id, !visible); })} aria-label={visible ? "Ocultar da galeria" : "Mostrar na galeria"}>
        {visible ? <Eye /> : <EyeOff />}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => {
        if (confirm(isPoster ? "Esta imagem é o cartaz principal de um evento. Eliminar mesmo assim?" : "Eliminar esta imagem (incluindo o original)?")) start(async () => { await deleteImageAction(id); });
      }} aria-label="Eliminar">
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
