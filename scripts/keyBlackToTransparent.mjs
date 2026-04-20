/**
 * Makes solid / near-black pixels transparent (portrait PNGs keyed on black).
 *
 * Usage: node scripts/keyBlackToTransparent.mjs public/story-beats/sachin-young.png
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/keyBlackToTransparent.mjs <png-path>");
  process.exit(1);
}

const abs = arg.startsWith("/") ? arg : join(root, arg);

/** Max RGB channel — below this reads as keyed black backdrop. */
const RGB_MAX = 46;
/** Mean RGB — dark mat only. */
const LUMA_MAX = 40;

const buf = await sharp(abs).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = buf;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const mx = Math.max(r, g, b);
  const lu = (r + g + b) / 3;
  if (mx <= RGB_MAX && lu <= LUMA_MAX) {
    data[i + 3] = 0;
  }
}

const out = await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(abs, out);
console.log(`[key-black] ${abs} (${info.width}×${info.height}) — keyed black → transparent`);
