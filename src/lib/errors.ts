/** Tradução das mensagens-código lançadas pelas funções da base de dados. */
const MESSAGES: Record<string, string> = {
  EVENT_NOT_FOUND: "Evento não encontrado.",
  EVENT_NOT_ON_SALE: "As vendas para este evento não estão abertas.",
  EMPTY_ORDER: "Seleccione pelo menos um bilhete.",
  DUPLICATE_ITEM: "Categorias de bilhetes repetidas.",
  INVALID_QUANTITY: "Quantidade inválida.",
  TICKET_TYPE_NOT_FOUND: "Categoria de bilhete indisponível.",
  MAX_PER_TYPE_EXCEEDED: "Excedeu o número máximo de bilhetes desta categoria por encomenda.",
  MAX_PER_ORDER_EXCEEDED: "Excedeu o número máximo de bilhetes por encomenda.",
  SOLD_OUT: "Não há bilhetes suficientes disponíveis nesta categoria.",
  IDEMPOTENCY_CONFLICT: "Pedido duplicado. Actualize a página e tente novamente.",
  ORDER_NOT_FOUND: "Encomenda não encontrada.",
  ORDER_EXPIRED: "O prazo de pagamento desta encomenda expirou. Faça uma nova encomenda.",
  ORDER_CLOSED: "Esta encomenda já não aceita pagamentos.",
  ALREADY_PAID: "Esta encomenda já está paga.",
  ALREADY_REPORTED: "Já comunicou um pagamento que está em verificação.",
  DUPLICATE_REFERENCE: "Esta referência de transacção já foi utilizada.",
  FORBIDDEN: "Sem permissão para esta operação.",
  INVALID_ACTION: "Acção inválida.",
  INVALID_STATE: "Esta operação não é possível no estado actual.",
  SUBMISSION_NOT_FOUND: "Comunicação de pagamento não encontrada.",
  REASON_REQUIRED: "Indique o motivo.",
  TICKET_NOT_FOUND: "Bilhete não encontrado.",
  INVALID_TTL: "Configuração de prazo inválida.",
  PROOF_TOO_LARGE: "O comprovativo excede 4 MB.",
  PROOF_INVALID_TYPE: "Comprovativo inválido. Envie JPG, PNG ou PDF.",
  IMAGE_TOO_LARGE: "A imagem excede 10 MB.",
  IMAGE_INVALID_TYPE: "Formato inválido. Envie JPG, JPEG, PNG ou WebP.",
  INVALID_IMAGE: "Não foi possível ler a imagem. O ficheiro pode estar corrompido.",
  SUPABASE_NOT_CONFIGURED: "O sistema ainda não está configurado.",
  PAYSUITE_ERROR: "O serviço de pagamento não respondeu. Tente novamente ou use a transferência manual.",
  PAYSUITE_NOT_CONFIGURED: "O pagamento automático ainda não está disponível.",
  RATE_LIMITED: "Demasiados pedidos. Aguarde um momento e tente novamente.",
};

export class AppError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export function errorCode(err: unknown): string {
  if (err instanceof AppError) return err.code;
  const msg = typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = /\b([A-Z][A-Z_]{3,})\b/.exec(msg);
  return m && MESSAGES[m[1]] ? m[1] : "UNKNOWN";
}

export function errorMessage(err: unknown): string {
  return MESSAGES[errorCode(err)] ?? "Ocorreu um erro inesperado. Tente novamente.";
}
