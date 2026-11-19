import { staffForApi } from "@/lib/auth";
import { downloadTicketsPdf } from "@/lib/services/tickets";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { json, jsonError } from "@/lib/http";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/orders/[id]/pdf">) {
  const user = await staffForApi("admin");
  if (!user) return json({ error: "Sem permissão." }, 403);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Inválido." }, 400);
  const inline = new URL(req.url).searchParams.get("ver") === "1";
  try {
    const { bytes, filename } = await downloadTicketsPdf(id);
    if (!inline) {
      await supabaseAdmin().from("ticket_delivery_logs").insert({ order_id: id, actor_id: user.id, action: "pdf_downloaded" });
    }
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return jsonError(err, 409);
  }
}
