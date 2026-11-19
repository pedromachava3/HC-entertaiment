import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import jsQR from "jsqr";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { createTicketPayload, verifyTicketPayload } from "@/lib/tickets/qr-token";
import { generateTicketsPdf } from "@/lib/tickets/pdf";
import { detectFileType } from "@/lib/files";

const SECRET = "teste-segredo-com-pelo-menos-32-caracteres!!";

describe("QR Code seguro", () => {
  it("assina e verifica, sem dados pessoais", () => {
    const id = randomUUID();
    const p = createTicketPayload(id, SECRET);
    expect(p).toMatch(/^HC1\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{22}$/);
    expect(verifyTicketPayload(p, SECRET)).toBe(id);
  });
  it("rejeita QR adulterados ou forjados", () => {
    const id = randomUUID();
    const p = createTicketPayload(id, SECRET);
    const other = randomUUID();
    expect(verifyTicketPayload(p.replace(id, other), SECRET)).toBeNull();
    expect(verifyTicketPayload(`HC1.${other}.AAAAAAAAAAAAAAAAAAAAAA`, SECRET)).toBeNull();
    expect(verifyTicketPayload(p, "outro-segredo-com-mais-de-32-caracteres-xx")).toBeNull();
    expect(verifyTicketPayload("Nome: João, VIP", SECRET)).toBeNull();
    expect(verifyTicketPayload("", SECRET)).toBeNull();
  });
  it("gera QR únicos por bilhete", () => {
    const set = new Set(Array.from({ length: 200 }, () => createTicketPayload(randomUUID(), SECRET)));
    expect(set.size).toBe(200);
  });
  it("o QR gerado é legível (ida e volta)", async () => {
    const p = createTicketPayload(randomUUID(), SECRET);
    const png = await QRCode.toBuffer(p, { errorCorrectionLevel: "M", margin: 1, width: 400 });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(p);
  });
});

describe("PDF dos bilhetes", () => {
  it("gera uma página por bilhete (2 Normais + 1 VIP)", async () => {
    const tickets = ["normal", "normal", "vip"].map((c, i) => ({
      ticketNumber: `HC-2026-000001-0${i + 1}`,
      holderName: "Maria Joana Cossa",
      category: c,
      ticketTypeName: c === "vip" ? "VIP" : "Normal",
      priceCents: c === "vip" ? 70000 : 30000,
      qrPayload: createTicketPayload(randomUUID(), SECRET),
    }));
    const bytes = await generateTicketsPdf({
      orderCode: "HC-2026-000001",
      event: { name: "Good Vibes at Summer", eventDate: "2026-12-12", startTime: "14:00:00", venue: "Antigo Nozava", address: "Belo Horizonte", city: null },
      tickets,
    });
    expect(detectFileType(bytes)).toBe("application/pdf");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getTitle()).toContain("HC-2026-000001");
  });
  it("suporta caracteres fora do WinAnsi sem falhar", async () => {
    const bytes = await generateTicketsPdf({
      orderCode: "HC-2026-000002",
      event: { name: "Festa 🎉 Ção", eventDate: "2026-12-12", startTime: null, venue: null, address: null, city: null },
      tickets: [{ ticketNumber: "HC-2026-000002-01", holderName: "Zé 😀 Ñandú", category: "normal", ticketTypeName: "Normal", priceCents: 30000, qrPayload: "HC1.x.y" }],
    });
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("detecção do tipo real de ficheiro", () => {
  it("identifica pelos bytes, não pela extensão", async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#f00" } }).png().toBuffer();
    const jpg = await sharp(png).jpeg().toBuffer();
    const webp = await sharp(png).webp().toBuffer();
    expect(detectFileType(png)).toBe("image/png");
    expect(detectFileType(jpg)).toBe("image/jpeg");
    expect(detectFileType(webp)).toBe("image/webp");
    expect(detectFileType(Buffer.from("<?php echo 'x'; ?>........"))).toBeNull();
    expect(detectFileType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
  });
});
