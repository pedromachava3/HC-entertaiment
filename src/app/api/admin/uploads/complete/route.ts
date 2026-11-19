import { revalidatePath } from "next/cache";
import { z } from "zod";
import { staffForApi } from "@/lib/auth";
import { finalizePosterUpload } from "@/lib/services/images";
import { json, jsonError, sameOrigin } from "@/lib/http";

const schema = z.object({
  path: z.string().min(10).max(300),
  eventId: z.uuid().nullable(),
  kind: z.enum(["poster", "gallery"]),
  title: z.string().trim().max(150).nullable().optional(),
  replaceImageId: z.uuid().nullable().optional(),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Pedido não autorizado." }, 403);
  const user = await staffForApi("admin");
  if (!user) return json({ error: "Sem permissão." }, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Dados inválidos." }, 422);
  try {
    const img = await finalizePosterUpload({
      stagingPath: parsed.data.path,
      userId: user.id,
      eventId: parsed.data.eventId,
      kind: parsed.data.kind,
      title: parsed.data.title ?? null,
      replaceImageId: parsed.data.replaceImageId ?? null,
    });
    revalidatePath("/", "layout");
    return json({ ok: true, image: img });
  } catch (err) {
    return jsonError(err, 422);
  }
}
