import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase/admin";
import { detectFileType, EXT, MAX_PROOF_BYTES, PROOF_TYPES } from "../files";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { hashIp } from "../security";
import { orderTtlMinutes } from "../env";
import type { OrderFull } from "../data/orders";
import { ensureTicketsPdf } from "./tickets";

export async function reportPayment(opts: {
  order: OrderFull;
  method: "mpesa" | "emola";
  payerPhone: string;
  transactionRef: string;
  proof: File | null;
  ip: string;
}) {
  await enforceRateLimit(`report:${hashIp(opts.ip)}`, 8, 600);
  await enforceRateLimit(`report-order:${opts.order.id}`, 5, 3600);

  let proofPath: string | null = null;
  let proofMime: string | null = null;
  const admin = supabaseAdmin();

  if (opts.proof && opts.proof.size > 0) {
    if (opts.proof.size > MAX_PROOF_BYTES) throw new AppError("PROOF_TOO_LARGE");
    const buf = new Uint8Array(await opts.proof.arrayBuffer());
    const type = detectFileType(buf);
    if (!type || !PROOF_TYPES.includes(type)) throw new AppError("PROOF_INVALID_TYPE");
    proofMime = type;
    proofPath = `${opts.order.id}/${randomUUID()}.${EXT[type]}`;
    const { error } = await admin.storage.from("payment-proofs").upload(proofPath, buf, {
      contentType: type,
      upsert: false,
    });
    if (error) throw error;
  }

  const { data, error } = await admin.rpc("report_payment", {
    p_order_id: opts.order.id,
    p_method: opts.method,
    p_payer_phone: opts.payerPhone,
    p_transaction_ref: opts.transactionRef,
    p_proof_path: proofPath,
    p_proof_mime: proofMime,
  });
  if (error) {
    if (proofPath) await admin.storage.from("payment-proofs").remove([proofPath]);
    throw error;
  }
  return data as string;
}

/**
 * Decisão do administrador. A confirmação emite os bilhetes de forma transaccional
 * e idempotente na BD; depois gera/guarda o PDF (operação repetível sem duplicar bilhetes).
 */
export async function reviewPayment(opts: {
  submissionId: string;
  action: "confirm" | "keep_pending" | "reject";
  adminId: string;
  note: string | null;
}) {
  const { data, error } = await supabaseAdmin().rpc("review_payment", {
    p_submission_id: opts.submissionId,
    p_action: opts.action,
    p_admin: opts.adminId,
    p_note: opts.note,
    p_ttl_minutes: orderTtlMinutes(),
  });
  if (error) throw error;
  const row = (data as { order_id: string; order_status: string; tickets_created: number }[])[0];
  let pdfError: string | null = null;
  if (row.order_status === "paid") {
    try {
      await ensureTicketsPdf(row.order_id, opts.adminId);
    } catch (e) {
      console.error("Falha ao gerar PDF", e);
      pdfError = "Pagamento confirmado e bilhetes emitidos, mas o PDF não foi gerado. Use “Gerar PDF novamente”.";
    }
  }
  return { ...row, pdfError };
}

export async function cancelOrder(orderId: string, adminId: string, note: string | null) {
  const { error } = await supabaseAdmin().rpc("cancel_order", { p_order_id: orderId, p_admin: adminId, p_note: note });
  if (error) throw error;
}
