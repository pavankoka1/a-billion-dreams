/**
 * Precomputes public/particle-targets.json (v2: multiple story beats) using the same sampling
 * code as the app (bundled for the browser).
 *
 * Manifest: public/story-beats.manifest.json maps beat ids → SVG paths under public/.
 * Missing SVGs fall back to public/target.svg (logged).
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

for (const [beatId, relPath] of Object.entries(manifest.beats)) {
  let absPath = join(root, "public", relPath);
  if (!existsSync(absPath)) {
    console.warn(
      `[generate:particles] Missing "${relPath}" — using target.svg for beat "${beatId}"`
    );
    absPath = fallbackSvgPath;
  }
  const svgText = readFileSync(absPath, "utf8");

  const data = await page.evaluate(
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
    { svgText, count: particleCount }
  );

  const coords = [];
  for (let i = 0; i < data.nxny.length; i++) {
    coords.push(data.nxny[i].nx, data.nxny[i].ny);
  }

  beats[beatId] = {
    coords,
    svgW: data.svgW,
    svgH: data.svgH,
  };

  console.log(
    `[generate:particles] Beat "${beatId}": ${coords.length / 2} pts, SVG ${data.svgW}×${data.svgH}`
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
