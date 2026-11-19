import { z } from "zod";
import { staffForApi } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyTicketPayload } from "@/lib/tickets/qr-token";
import { enforceRateLimit } from "@/lib/rate-limit";
import { json, jsonError, sameOrigin } from "@/lib/http";

const schema = z.object({ payload: z.string().min(1).max(200), action: z.enum(["lookup", "admit"]) });

/**
 * Validação de entrada (funcionários autenticados).
 * 1) a assinatura do QR é verificada no servidor; 2) o bilhete tem de existir na BD;
 * 3) a entrada é registada com UPDATE atómico (sem dupla validação).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Pedido não autorizado." }, 403);
  const staff = await staffForApi("staff");
  if (!staff) return json({ error: "Sessão expirada. Entre novamente." }, 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ result: "invalid" });

  try {
    await enforceRateLimit(`validate:${staff.id}`, 120, 60);
    const ticketId = verifyTicketPayload(parsed.data.payload);
    const admin = supabaseAdmin();
    if (!ticketId) {
      await admin.from("ticket_validation_logs").insert({ staff_id: staff.id, action: parsed.data.action, result: "invalid" });
      return json({ result: "invalid" });
    }
    if (parsed.data.action === "lookup") {
      const { data, error } = await admin.rpc("lookup_ticket", { p_ticket_id: ticketId, p_staff: staff.id });
      if (error) throw error;
      const r = (data as Record<string, unknown>[])[0];
      return json({
        result: r.result,
        ticket: r.result === "invalid" ? null : {
          number: r.ticket_number, holder: r.holder_name, event: r.event_name, eventDate: r.event_date,
          category: r.ticket_type_name, usedAt: r.used_at,
        },
      });
    }
    const { data, error } = await admin.rpc("admit_ticket", { p_ticket_id: ticketId, p_staff: staff.id });
    if (error) throw error;
    const r = (data as Record<string, unknown>[])[0];
    return json({ result: r.result, ticket: { number: r.ticket_number, usedAt: r.used_at } });
  } catch (err) {
    return jsonError(err, 500);
  }
}
