/**
 * Normaliza números de telefone para o formato E.164.
 * Aceita formatos moçambicanos comuns: "84 542 5186", "845425186",
 * "258845425186", "+258 84 542 5186". Números internacionais devem ter "+".
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // Moçambique: móveis com 9 dígitos começando por 82–87
  if (/^8[2-7]\d{7}$/.test(digits)) return `+258${digits}`;
  if (/^2588[2-7]\d{7}$/.test(digits)) return `+${digits}`;
  if (/^002588[2-7]\d{7}$/.test(digits)) return `+${digits.slice(2)}`;

  if (trimmed.startsWith("+") && /^\d{8,15}$/.test(digits)) {
    if (digits.startsWith("258") && !/^2588[2-7]\d{7}$/.test(digits)) return null;
    return `+${digits}`;
  }
  return null;
}

/** "+258845425186" -> "+258 84 542 5186" */
export function formatPhone(e164: string): string {
  const m = /^\+258(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+258 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Número para wa.me (apenas dígitos, sem "+"). */
export function waDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
