// Gera as versões web dos cartazes iniciais (mesmas regras do upload: orientação corrigida,
// proporções preservadas, WebP 1600px + miniatura 640px). Os originais ficam intactos em seed/posters.
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

const SRC = "seed/posters";
const OUT = "public/posters";
const manifest = [];
for (const file of readdirSync(SRC).filter((f) => /\.(webp|jpe?g|png)$/i.test(f)).sort()) {
  const slug = basename(file).replace(/\.[^.]+$/, "");
  const date = file.slice(0, 10);
  const input = join(SRC, file);
  mkdirSync(join(OUT, slug), { recursive: true });
  const display = await sharp(input).rotate().resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
  writeFileSync(join(OUT, slug, "display.webp"), display.data);
  await sharp(input).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(OUT, slug, "thumb.webp"));
  manifest.push({ slug, date, original: input, width: display.info.width, height: display.info.height, size: statSync(input).size });
}
writeFileSync("seed/posters-manifest.json", JSON.stringify(manifest, null, 2));
console.log(manifest);
