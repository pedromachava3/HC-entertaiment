import { z } from "zod";
import { staffForApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stagingPath } from "@/lib/services/images";
import { isAllowedPosterName, MAX_POSTER_BYTES } from "@/lib/files";
import { json, jsonError, sameOrigin } from "@/lib/http";

const schema = z.object({
  fileName: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_POSTER_BYTES, "A imagem excede 10 MB."),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"], { error: "Formato inválido. Envie JPG, JPEG, PNG ou WebP." }),
});

/** Gera um URL assinado para o navegador enviar o original directamente para o armazenamento privado. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Pedido não autorizado." }, 403);
  const user = await staffForApi("admin");
  if (!user) return json({ error: "Sem permissão." }, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, 422);
  if (!isAllowedPosterName(parsed.data.fileName)) return json({ error: "Formato inválido. Envie JPG, JPEG, PNG ou WebP." }, 422);
  try {
    const path = stagingPath(user.id, parsed.data.fileName);
    const { data, error } = await supabaseAdmin().storage.from("originals").createSignedUploadUrl(path);
    if (error || !data) throw error;
    return json({ path, signedUrl: data.signedUrl });
  } catch (err) {
    return jsonError(err, 500);
  }
}
