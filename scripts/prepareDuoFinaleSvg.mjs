/**
 * One-off preprocessor for the duo-finale SVG reference (Sachin + Virat, jerseys).
 *
 *   Input  : Grok-traced SVG at canvas-native 1168×880.
 *   Output : public/target.svg — same SVG with the "◇ Grok" watermark paths stripped.
 *
 * Strategy:
 *   The Grok watermark sits beside Virat's glove in the bottom-right corner.
 *   The diamond icon has teal + tan halo fills whose translate/anchor attributes
 *   don't always sit inside the logo bbox (tracer places the transform at the
 *   path's local origin, but the `d` data can extend far from it). Translate-only
 *   filtering therefore leaves diamond "halo" fragments behind.
 *
 *   So we do the rigorous thing: open the SVG in Puppeteer, walk every <path>,
 *   ask the browser for `getBBox()` in SVG user-space, and drop every path whose
 *   real bbox is fully inside a watermark rectangle we define on the canvas.
 *   Subject paths (glove, jersey shadow, cricket bat) sit to the left of that
 *   rectangle, so they're untouched.
 *
 * Usage:
 *   node scripts/prepareDuoFinaleSvg.mjs [inputSvg] [outputSvg]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEFAULT_INPUT =
  "/Users/pavankurmarao.k/Downloads/grok-image-b0c30781-0e92-4e46-911e-dcf2b6a7ffeb.svg";
const DEFAULT_OUTPUT = join(root, "public/target.svg");

/**
 * Watermark rect in SVG coords (1168×880). Logo is strictly inside this region.
 * (Virat's glove paints across x ≈ 770–1040, so we can't cut the whole corner —
 * we instead score each path by how much of ITS bbox falls inside this rect,
 * and only kill paths that live mostly inside the watermark.)
 */
const WATERMARK_RECT = { x0: 955, y0: 720, x1: 1168, y1: 880 };

/**
 * If ≥ this fraction of a path's bbox area lies inside `WATERMARK_RECT`, it's
 * treated as a logo fragment. Glove paths that span the glove + watermark area
 * have most of their bbox on the glove side, so they stay below the threshold
 * and are preserved.
 */
const MIN_WATERMARK_OVERLAP = 0.55;

async function main() {
  const inputPath = resolve(process.argv[2] ?? DEFAULT_INPUT);
  const outputPath = resolve(process.argv[3] ?? DEFAULT_OUTPUT);

  const svgText = readFileSync(inputPath, "utf8");

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(
    `<!DOCTYPE html><html><body><div id="root" style="position:fixed;left:0;top:0;width:1168px;height:880px;"></div></body></html>`,
    { waitUntil: "domcontentloaded" },
  );

  const bboxes = await page.evaluate((text) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const host = document.getElementById("root");
    host.innerHTML = "";
    host.appendChild(document.importNode(doc.documentElement, true));
    const svgNode = host.querySelector("svg");
    const paths = [...svgNode.querySelectorAll("path")];

    /** Convert a path's local bbox into parent SVG user-space via the path's CTM. */
    const toSvgSpace = (path, b) => {
      const ctm = path.getCTM();
      if (!ctm) return { x: b.x, y: b.y, w: b.width, h: b.height };
      const svg = path.ownerSVGElement;
      const pt = svg.createSVGPoint();
      const corners = [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([lx, ly]) => {
        pt.x = lx;
        pt.y = ly;
        const m = pt.matrixTransform(ctm);
        return { x: m.x, y: m.y };
      });
      const xs = corners.map((c) => c.x);
      const ys = corners.map((c) => c.y);
      const minX = Math.min.apply(null, xs);
      const maxX = Math.max.apply(null, xs);
      const minY = Math.min.apply(null, ys);
      const maxY = Math.max.apply(null, ys);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    };

    return paths.map((p, i) => {
      let bbox = null;
      try {
        const local = p.getBBox();
        bbox = toSvgSpace(p, local);
      } catch {
        bbox = null;
      }
      return { i, bbox };
    });
  }, svgText);

  await browser.close();

  const doomed = new Set();
  for (const { i, bbox } of bboxes) {
    if (!bbox) continue;
    const { x, y, w, h } = bbox;
    const area = Math.max(1, w * h);
    const ix0 = Math.max(x, WATERMARK_RECT.x0);
    const iy0 = Math.max(y, WATERMARK_RECT.y0);
    const ix1 = Math.min(x + w, WATERMARK_RECT.x1);
    const iy1 = Math.min(y + h, WATERMARK_RECT.y1);
    if (ix1 <= ix0 || iy1 <= iy0) continue;
    const overlapArea = (ix1 - ix0) * (iy1 - iy0);
    if (overlapArea / area >= MIN_WATERMARK_OVERLAP) {
      doomed.add(i);
    }
  }

  const pathRe = /<path\b[^>]*\/>/g;
  let idx = 0;
  let removed = 0;
  const cleaned = svgText.replace(pathRe, (match) => {
    const myIdx = idx++;
    if (doomed.has(myIdx)) {
      removed++;
      return "";
    }
    return match;
  });

  writeFileSync(outputPath, cleaned);

  console.log(
    `[prepareDuoFinaleSvg] ${inputPath}\n` +
      `  watermark rect (SVG units): ${JSON.stringify(WATERMARK_RECT)}\n` +
      `  overlap threshold: ≥ ${(MIN_WATERMARK_OVERLAP * 100).toFixed(0)}% of path bbox inside rect\n` +
      `  paths scanned: ${bboxes.length}\n` +
      `  paths removed: ${removed}\n` +
      `  → ${outputPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
