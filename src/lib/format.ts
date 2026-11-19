import { COMPANY } from "./config";

/** 130000 cêntimos -> "1.300 MT" */
export function formatMZN(cents: number | bigint): string {
  const value = Number(cents) / 100;
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping: "always",
  }).format(value);
  // pt-PT usa espaço fino como separador de milhares; usamos ponto (prática local).
  return `${formatted.replace(/\s| | /g, ".")} MT`;
}

/** Valor sem o sufixo, para mensagens: 130000 -> "1.300" */
export function formatAmount(cents: number | bigint): string {
  return formatMZN(cents).replace(/ MT$/, "");
}

/** "2026-12-12" -> "12/12/2026" (data civil, sem conversões de fuso) */
export function formatDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/** "2026-12-12" -> "Sábado, 12 de Dezembro de 2026" */
export function formatDateLong(isoDate: string, withWeekday = true): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const base = `${d} de ${MONTHS[m - 1]} de ${y}`;
  return withWeekday ? `${WEEKDAYS[wd]}, ${base}` : base;
}

export function monthShort(isoDate: string): string {
  const m = Number(isoDate.slice(5, 7));
  return MONTHS[m - 1].slice(0, 3).toUpperCase();
}

/** "14:00:00" -> "14h00" */
export function formatTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, mm] = time.split(":");
  return `${h}h${mm}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: COMPANY.timezone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Data de hoje no fuso de Moçambique, "AAAA-MM-DD". */
export function todayInMaputo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Instante de início do evento (Africa/Maputo = UTC+2, sem horário de Verão). */
export function eventStartInstant(eventDate: string, startTime: string | null): Date {
  const t = startTime ?? "00:00:00";
  return new Date(`${eventDate}T${t.length === 5 ? `${t}:00` : t}+02:00`);
}
