export type EventStatus = "draft" | "published" | "ongoing" | "completed" | "cancelled";
export type SalesStatus = "open" | "closed";
export type OrderStatus = "pending_payment" | "payment_reported" | "paid" | "expired" | "cancelled";
export type TicketStatus = "valid" | "used" | "cancelled";

export type ImageRow = {
  id: string;
  event_id: string | null;
  kind: "poster" | "gallery";
  title: string | null;
  original_path: string;
  display_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  show_in_gallery: boolean;
  sort_order: number;
  created_at: string;
};

export type TicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  category: "normal" | "vip" | "other";
  description: string | null;
  price_cents: number;
  quantity_total: number;
  quantity_reserved: number;
  quantity_sold: number;
  max_per_order: number;
  is_active: boolean;
  sort_order: number;
};

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  lineup: string[];
  door_info: string | null;
  poster_image_id: string | null;
  status: EventStatus;
  sales_status: SalesStatus;
  is_archived: boolean;
  max_tickets_per_order: number;
  created_at: string;
  updated_at: string;
};

export type EventWithRelations = EventRow & {
  poster: ImageRow | null;
  ticket_types: TicketTypeRow[];
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  ongoing: "A decorrer",
  completed: "Realizado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Aguarda pagamento",
  payment_reported: "Pagamento comunicado — em verificação",
  paid: "Pagamento confirmado — bilhetes gerados",
  expired: "Expirada",
  cancelled: "Cancelada",
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  valid: "Válido",
  used: "Utilizado",
  cancelled: "Cancelado",
};

export function availableOf(t: Pick<TicketTypeRow, "quantity_total" | "quantity_reserved" | "quantity_sold">) {
  return Math.max(0, t.quantity_total - t.quantity_reserved - t.quantity_sold);
}

export function orderStatusTone(s: OrderStatus): "green" | "amber" | "white" | "grey" {
  return s === "paid" ? "green" : s === "payment_reported" ? "amber" : s === "pending_payment" ? "white" : "grey";
}
