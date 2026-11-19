import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processPoster } from "@/lib/images";

describe("processamento de cartazes", () => {
  it("preserva proporções, corrige orientação EXIF e gera WebP + miniatura", async () => {
    // imagem 1000x1500 gravada "deitada" (1500x1000) com EXIF orientation=6 (rodar 90°)
    const raw = await sharp({ create: { width: 1500, height: 1000, channels: 3, background: "#123456" } })
      .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const out = await processPoster(raw);
    expect(out.width).toBe(1000);
    expect(out.height).toBe(1500);
    const meta = await sharp(out.display).metadata();
    expect(meta.format).toBe("webp");
    const thumb = await sharp(out.thumb).metadata();
    expect(thumb.width).toBe(640);
    expect(Math.round((thumb.height! / thumb.width!) * 100)).toBe(150);
  });
  it("não amplia imagens pequenas", async () => {
    const small = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#000" } }).png().toBuffer();
    const out = await processPoster(small);
    expect(out.width).toBe(300);
  });
  it("rejeita ficheiros corrompidos", async () => {
    await expect(processPoster(Buffer.from("isto não é uma imagem"))).rejects.toThrow();
  });
});
