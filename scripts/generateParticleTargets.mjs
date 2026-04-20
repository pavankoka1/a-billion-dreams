/**
 * Precomputes public/particle-targets.json (v2: multiple story beats) using the same sampling
 * code as the app (bundled for the browser).
 *
 * Manifest: public/story-beats.manifest.json maps beat ids → SVG or PNG paths under public/.
 * PNG beats are stippled from alpha (transparent cutouts). Missing assets fall back to public/target.svg (logged).
 *
 * Run after changing SVGs or app/config/particlePortrait.config.js particleCount:
 *   npm run generate:particles
 *
 * Requires: devDependencies esbuild, puppeteer
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cacheDir = join(root, "scripts/.cache");

mkdirSync(cacheDir, { recursive: true });

const samplerPath = join(cacheDir, "sampler.js");

await esbuild.build({
  entryPoints: [join(root, "app/lib/particleSvgSample.js")],
  bundle: true,
  format: "iife",
  globalName: "ParticleSvgSample",
  outfile: samplerPath,
  platform: "browser",
});

const { particlePortraitConfig } = await import(
  new URL("../app/config/particlePortrait.config.js", import.meta.url).href
);

const particleCount = particlePortraitConfig.particleCount;

const manifestPath = join(root, "public/story-beats.manifest.json");
const fallbackSvgPath = join(root, "public/target.svg");

let manifest = {
  defaultBeat: "duo_finale",
  beats: { duo_finale: "target.svg" },
};
if (existsSync(manifestPath)) {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(
  `<!DOCTYPE html><html><body><div id="root" style="position:fixed;left:0;top:0;width:1168px;height:880px"></div></body></html>`,
  { waitUntil: "domcontentloaded" }
);
await page.addScriptTag({ path: samplerPath });

const beats = {};

/**
 * Manifest entries may be either `"path.ext"` (back-compat) or
 * `{ src: "path.ext", excludeRects: [{nx0, ny0, nx1, ny1}] }`. Exclude rects
 * let us guarantee dead zones (e.g. watermark corner) stay empty even when a
 * few stray source paths survive SVG cleaning.
 */
for (const [beatId, entry] of Object.entries(manifest.beats)) {
  const relPath = typeof entry === "string" ? entry : entry.src;
  const excludeRects = typeof entry === "string" ? [] : (entry.excludeRects ?? []);
  const oversample = excludeRects.length > 0 ? 1.25 : 1;

  let absPath = join(root, "public", relPath);
  let usePng = relPath.toLowerCase().endsWith(".png");
  if (!existsSync(absPath)) {
    console.warn(
      `[generate:particles] Missing "${relPath}" — using target.svg for beat "${beatId}"`
    );
    absPath = fallbackSvgPath;
    usePng = false;
  }

  const requestedCount = Math.ceil(particleCount * oversample);

  let data;

  if (usePng) {
    const buf = readFileSync(absPath);
    const base64 = buf.toString("base64");
    data = await page.evaluate(
      (payload) => {
        const { dataUrl, count, w, h } = payload;
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("2d context"));
              return;
            }
            ctx.clearRect(0, 0, w, h);
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;
            const scale = Math.min(w / iw, h / ih);
            const dw = iw * scale;
            const dh = ih * scale;
            const ox = (w - dw) / 2;
            const oy = (h - dh) / 2;
            ctx.drawImage(img, ox, oy, dw, dh);
            const out = globalThis.ParticleSvgSample.samplePointsFromRasterCanvas(
              canvas,
              count,
              { svgW: w, svgH: h }
            );
            resolve(out);
          };
          img.onerror = () => reject(new Error("image load"));
          img.src = dataUrl;
        });
      },
      {
        dataUrl: `data:image/png;base64,${base64}`,
        count: requestedCount,
        w: 1168,
        h: 880,
      }
    );
  } else {
    const svgText = readFileSync(absPath, "utf8");

    data = await page.evaluate(
      (payload) => {
        const { svgText: text, count } = payload;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const el = doc.documentElement;
        const host = document.getElementById("root");
        host.innerHTML = "";
        host.appendChild(document.importNode(el, true));
        const svgNode = host.querySelector("svg");
        return globalThis.ParticleSvgSample.samplePointsFromSvgRoot(svgNode, count);
      },
      { svgText, count: requestedCount }
    );
  }

  const insideAnyExclude = (nx, ny) => {
    for (const r of excludeRects) {
      if (nx >= r.nx0 && nx <= r.nx1 && ny >= r.ny0 && ny <= r.ny1) return true;
    }
    return false;
  };

  const coords = [];
  let dropped = 0;
  for (let i = 0; i < data.nxny.length && coords.length / 2 < particleCount; i++) {
    const { nx, ny } = data.nxny[i];
    if (insideAnyExclude(nx, ny)) {
      dropped++;
      continue;
    }
    coords.push(nx, ny);
  }
  while (coords.length / 2 < particleCount && coords.length > 0) {
    const j = Math.floor(Math.random() * (coords.length / 2)) * 2;
    coords.push(coords[j], coords[j + 1]);
  }

  beats[beatId] = {
    coords,
    svgW: data.svgW,
    svgH: data.svgH,
  };

  console.log(
    `[generate:particles] Beat "${beatId}": ${coords.length / 2} pts, ${usePng ? "PNG" : "SVG"} ${data.svgW}×${data.svgH}${
      excludeRects.length > 0 ? ` (excluded ${dropped}/${data.nxny.length} samples in ${excludeRects.length} dead zones)` : ""
    }`
  );
}

await browser.close();

const defaultBeat =
  manifest.defaultBeat && beats[manifest.defaultBeat]
    ? manifest.defaultBeat
    : Object.keys(beats)[0];

const first = beats[defaultBeat];
const out = {
  v: 2,
  particleCount,
  defaultBeat,
  svgW: first.svgW,
  svgH: first.svgH,
  beats,
};

writeFileSync(join(root, "public/particle-targets.json"), JSON.stringify(out));
const sizeKb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(1);
console.log(
  `Wrote public/particle-targets.json (v2, ${Object.keys(beats).length} beats, ~${sizeKb} KB)`
);
