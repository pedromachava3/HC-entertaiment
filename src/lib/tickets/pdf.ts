import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { HC_LOGO_PNG_BASE64 } from "./logo-data";
import { formatDateLong, formatMZN, formatTime } from "../format";

export type PdfTicket = {
  ticketNumber: string;
  holderName: string;
  category: string; // normal | vip | other
  ticketTypeName: string;
  priceCents: number;
  qrPayload: string;
};

export type PdfEvent = {
  name: string;
  eventDate: string; // AAAA-MM-DD
  startTime: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
};

const BLACK = rgb(8 / 255, 8 / 255, 8 / 255);
const RED = rgb(1, 16 / 255, 16 / 255);
const WHITE = rgb(1, 1, 1);
const GREY = rgb(170 / 255, 170 / 255, 170 / 255);
const DARK = rgb(23 / 255, 23 / 255, 23 / 255);

// Formato vertical, pensado para o ecrã do telemóvel (≈ 9:16).
const W = 396;
const H = 720;
const M = 28;

/** As fontes padrão do PDF usam WinAnsi: substitui caracteres não suportados. */
function safe(font: PDFFont, text: string): string {
  const ok = (c: string) => {
    try {
      font.widthOfTextAtSize(c, 10);
      return true;
    } catch {
      return false;
    }
  };
  let out = "";
  for (const ch of text.normalize("NFC")) {
    if (ok(ch)) {
      out += ch;
      continue;
    }
    const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    out += base && ok(base) ? base : "?";
  }
  return out.replace(/\?{2,}/g, "?");
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number, maxLines = 3): string[] {
  const words = safe(font, text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
    return kept.map((l) => safe(font, l));
  }
  return lines;
}

function roundedRect(page: PDFPage, x: number, y: number, w: number, h: number, r: number, color = WHITE) {
  // drawSvgPath usa coordenadas com origem no topo (y invertido) a partir de (x, y)
  const path = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(path, { x, y: y + h, color });
}

function categoryLabel(category: string, typeName: string) {
  if (category === "vip") return "VIP";
  if (category === "normal") return "NORMAL";
  return typeName.toUpperCase();
}

export async function generateTicketsPdf(opts: {
  event: PdfEvent;
  orderCode: string;
  tickets: PdfTicket[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bilhetes ${opts.orderCode} — HC Entertainment`);
  doc.setAuthor("HC Entertainment");
  doc.setSubject(opts.event.name);
  doc.setProducer("HC Entertainment");
  doc.setCreator("HC Entertainment — Plataforma de Bilhética");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Buffer.from(HC_LOGO_PNG_BASE64, "base64"));

  const total = opts.tickets.length;
  for (let i = 0; i < total; i++) {
    const t = opts.tickets[i];
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLACK });
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: RED });

    // Cabeçalho com logótipo original sobre fundo branco (preserva as cores do logótipo).
    const logoH = 46;
    const logoW = (logo.width / logo.height) * logoH;
    roundedRect(page, M, H - 30 - logoH - 12, logoW + 16, logoH + 12, 8);
    page.drawImage(logo, { x: M + 8, y: H - 30 - logoH - 6, width: logoW, height: logoH });

    page.drawText("HC ENTERTAINMENT", {
      x: M + logoW + 30, y: H - 50, size: 12, font: bold, color: WHITE,
    });
    page.drawText(safe(regular, "A FESTA COMEÇA AQUI."), {
      x: M + logoW + 30, y: H - 66, size: 9, font: regular, color: RED,
    });
    page.drawText(`BILHETE ${i + 1}/${total}`, {
      x: M + logoW + 30, y: H - 82, size: 8, font: regular, color: GREY,
    });

    // Nome do evento
    let y = H - 130;
    for (const line of wrap(bold, opts.event.name.toUpperCase(), 22, W - 2 * M, 2)) {
      page.drawText(line, { x: M, y, size: 22, font: bold, color: WHITE });
      y -= 26;
    }

    // Categoria
    const cat = safe(bold, categoryLabel(t.category, t.ticketTypeName));
    const catW = bold.widthOfTextAtSize(cat, 11) + 20;
    roundedRect(page, M, y - 8, catW, 22, 4, t.category === "vip" ? RED : DARK);
    page.drawText(cat, { x: M + 10, y: y - 1, size: 11, font: bold, color: WHITE });
    const price = formatMZN(t.priceCents);
    page.drawText(price, {
      x: W - M - bold.widthOfTextAtSize(price, 13), y: y - 1, size: 13, font: bold, color: WHITE,
    });
    y -= 38;

    // Detalhes
    const time = formatTime(opts.event.startTime);
    const place = [opts.event.venue, opts.event.address, opts.event.city].filter(Boolean).join(", ");
    const rows: [string, string][] = [
      ["DATA", formatDateLong(opts.event.eventDate)],
      ["HORA", time ?? "A definir"],
      ["LOCAL", place || "A definir"],
      ["TITULAR", t.holderName],
    ];
    for (const [label, value] of rows) {
      page.drawText(label, { x: M, y, size: 7.5, font: bold, color: GREY });
      y -= 13;
      const lines = wrap(regular, value, 11, W - 2 * M, 2);
      for (const l of lines) {
        page.drawText(l, { x: M, y, size: 11, font: regular, color: WHITE });
        y -= 14;
      }
      y -= 6;
    }

    // Linha picotada
    y -= 2;
    for (let x = M; x < W - M; x += 8) {
      page.drawLine({ start: { x, y }, end: { x: x + 4, y }, thickness: 1, color: GREY, opacity: 0.6 });
    }

    // QR Code em destaque
    const qrSize = Math.min(210, y - 110);
    const qrPng = await QRCode.toBuffer(t.qrPayload, {
      type: "png", errorCorrectionLevel: "M", margin: 1, width: 600,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    const qr = await doc.embedPng(qrPng);
    const qrX = (W - qrSize) / 2;
    const qrY = y - 16 - qrSize;
    roundedRect(page, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
    page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const num = safe(bold, t.ticketNumber);
    page.drawText(num, {
      x: (W - bold.widthOfTextAtSize(num, 13)) / 2, y: qrY - 32, size: 13, font: bold, color: WHITE,
    });
    const hint = safe(regular, "Apresente este QR Code à entrada. Válido para uma única entrada.");
    page.drawText(hint, {
      x: (W - regular.widthOfTextAtSize(hint, 8)) / 2, y: qrY - 48, size: 8, font: regular, color: GREY,
    });

    page.drawRectangle({ x: 0, y: 0, width: W, height: 30, color: DARK });
    const foot = safe(regular, `Encomenda ${opts.orderCode}  ·  Não partilhe este bilhete`);
    page.drawText(foot, { x: M, y: 11, size: 8, font: regular, color: GREY });
    page.drawRectangle({ x: 0, y: 30, width: W, height: 2, color: RED });
  }

  return doc.save();
}
