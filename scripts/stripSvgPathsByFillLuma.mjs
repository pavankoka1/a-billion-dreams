/**
 * Removes <path> elements whose fill is a light gray / near-white (vector matting).
 * Tuned for traced photos where the backdrop uses lighter fills than the subject.
 *
 * Usage:
 *   node scripts/stripSvgPathsByFillLuma.mjs [public/story-beats/foo.svg] [minLumaAvg]
 * Defaults: sachin-pak-standoff.svg, 228 (0–255 per channel average)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const rel = process.argv[2] ?? join("public", "story-beats", "sachin-pak-standoff.svg");
const minLuma = Number.parseFloat(process.argv[3] ?? "228", 10);
const inputPath = rel.startsWith("/") ? rel : join(root, rel);

function lumaFromHex6(h) {
  if (!h || h.length !== 7 || h[0] !== "#") return null;
  const r = Number.parseInt(h.slice(1, 3), 16);
  const g = Number.parseInt(h.slice(3, 5), 16);
  const b = Number.parseInt(h.slice(5, 7), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return (r + g + b) / 3;
}

let svg = readFileSync(inputPath, "utf8");
let removed = 0;
let kept = 0;

svg = svg.replace(/<path\b[^>]*>/g, (tag) => {
  const m = tag.match(/fill="(#([0-9a-fA-F]{6}))"/i);
  if (!m) {
    kept++;
    return tag;
  }
  const lu = lumaFromHex6(m[1]);
  if (lu === null || lu < minLuma) {
    kept++;
    return tag;
  }
  removed++;
  return "";
});

writeFileSync(inputPath, svg);
console.log(
  `[strip-svg-luma] ${inputPath}: removed ${removed} paths, kept ${kept} (min avg luma ${minLuma})`
);
