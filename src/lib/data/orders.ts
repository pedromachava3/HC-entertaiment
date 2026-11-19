import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { sha256Hex, safeEqual } from "../security";
import type { EventRow, OrderStatus, TicketStatus } from "../types";

export type OrderItem = {
  id: string;
  ticket_type_id: string;
  ticket_type_name: string;
  category: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  sort_order: number;
};

export type Submission = {
  id: string;
  method: "mpesa" | "emola";
  payer_phone: string;
  transaction_ref: string;
  proof_path: string | null;
  proof_mime: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

export type TicketRow = {
  id: string;
  order_id: string;
  ticket_number: string;
  ticket_type_name: string;
  category: string;
  holder_name: string;
  price_cents: number;
  status: TicketStatus;
  used_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  seq: number;
  created_at: string;
};

export type OrderFull = {
  id: string;
  code: string;
  status: OrderStatus;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  payment_method: "mpesa" | "emola";
  total_cents: number;
  expires_at: string | null;
  paid_at: string | null;
  confirmed_by: string | null;
  tickets_issued_at: string | null;
  tickets_pdf_path: string | null;
  delivery_status: "not_sent" | "sent";
  delivered_at: string | null;
  created_at: string;
  access_token_hash: string;
  event: Pick<EventRow, "id" | "name" | "slug" | "event_date" | "start_time" | "venue" | "address" | "city" | "status">;
  order_items: OrderItem[];
  payment_submissions: Submission[];
  tickets: TicketRow[];
};

const SELECT =
  "*, event:events(id, name, slug, event_date, start_time, venue, address, city, status), order_items(*), payment_submissions(*), tickets(*)";

function sortFull(o: OrderFull): OrderFull {
  o.order_items.sort((a, b) => a.sort_order - b.sort_order);
  o.payment_submissions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  o.tickets.sort((a, b) => a.ticket_number.localeCompare(b.ticket_number));
  return o;
}

export async function getOrderById(id: string): Promise<OrderFull | null> {
  const { data, error } = await supabaseAdmin().from("orders").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? sortFull(data as OrderFull) : null;
}

/**
 * Consulta segura para o cliente: exige o código E a chave secreta da encomenda
 * (256 bits, só conhecida por quem fez a compra). Adivinhar o código não basta.
 */
export async function getOrderForCustomer(code: string, accessKey: string | undefined | null): Promise<OrderFull | null> {
  if (!accessKey || !/^HC-\d{4}-\d{6,}$/.test(code) || !/^[A-Za-z0-9_-]{20,100}$/.test(accessKey)) return null;
  const { data, error } = await supabaseAdmin().from("orders").select(SELECT).eq("code", code).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = data as OrderFull;
  if (!safeEqual(order.access_token_hash, sha256Hex(accessKey))) return null;
  return sortFull(order);
}

/** Remove campos internos antes de enviar dados para o navegador. */
export function publicOrderView(o: OrderFull) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { access_token_hash, confirmed_by, ...rest } = o;
  return {
    ...rest,
    payment_submissions: o.payment_submissions.map((s) => ({
      id: s.id,
      method: s.method,
      transaction_ref: s.transaction_ref,
      status: s.status,
      created_at: s.created_at,
      has_proof: Boolean(s.proof_path),
    })),
    tickets: o.tickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      ticket_type_name: t.ticket_type_name,
      category: t.category,
      holder_name: t.holder_name,
      status: t.status,
    })),
  };
}
export type PublicOrderView = ReturnType<typeof publicOrderView>;
