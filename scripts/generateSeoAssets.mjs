/**
 * Generates the SEO / favicon / share-card asset set from SVG sources.
 *
 *   app/icon.svg              (committed; primary scalable icon auto-picked by Next.js)
 *   app/apple-icon.png        — 180×180, iOS / iPadOS home-screen (auto-picked)
 *   app/opengraph-image.png   — 1200×630, Facebook / LinkedIn / general OG card (auto-picked)
 *   app/twitter-image.png     — 1200×630, Twitter summary_large_image card (auto-picked)
 *   public/icon-192.png       — 192×192, referenced from app/manifest.js (PWA)
 *   public/icon-512.png       — 512×512, referenced from app/manifest.js (PWA)
 *
 * The 192 / 512 PNGs are intentionally placed in `public/` so Next.js does not
 * auto-emit duplicate `<link rel="icon">` tags (which it does for any file
 * matching `app/icon*.png`). They are only referenced via the web manifest.
 *
 * Run after design tweaks to `app/icon.svg` or the OG layout in this file:
 *   npm run generate:seo
 *
 * Uses the already-installed `sharp` dep (see package.json).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const APP_DIR = join(root, "app");
const PUBLIC_DIR = join(root, "public");
const ICON_SVG = resolve(APP_DIR, "icon.svg");

const BG = "#0a0a0f";
const TEXT_PRIMARY = "#f4f4f8";
const TEXT_SECONDARY = "#a1a1aa";
const ACCENT_PURPLE = "#667eea";
const ACCENT_CYAN = "#4facfe";

/**
 * Build the Open Graph / Twitter share-card as an SVG. We draw:
 *   • a subtle radial halo (cyan→purple) behind the title
 *   • a scatter of dots echoing the app's particle aesthetic
 *   • the title in italic serif + subtitle + kicker
 * Rendered by sharp via librsvg; only system + bundled fonts are available,
 * so we use a serif/sans-serif font-stack that's safe on the render host.
 */
function buildOgSvg({ width = 1200, height = 630 } = {}) {
  const rng = (() => {
    // Deterministic PRNG so regenerating the asset is byte-stable.
    let s = 0x13371337;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  })();

  const dots = [];
  const totalDots = 220;
  for (let i = 0; i < totalDots; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const r = 0.8 + rng() * 2.6;
    const a = 0.18 + rng() * 0.55;
    dots.push({ x, y, r, a });
  }

  const haloCx = width * 0.3;
  const haloCy = height * 0.48;

  const dotElems = dots
    .map(
      (d) =>
        `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(2)}" fill="#e4e4e7" fill-opacity="${d.a.toFixed(2)}"/>`,
    )
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="halo" cx="${haloCx}" cy="${haloCy}" r="${height * 0.7}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${ACCENT_CYAN}" stop-opacity="0.30"/>
      <stop offset="40%" stop-color="${ACCENT_PURPLE}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${ACCENT_CYAN}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${ACCENT_CYAN}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${ACCENT_PURPLE}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="${BG}"/>
  <rect width="${width}" height="${height}" fill="url(#halo)"/>

  <g>
    ${dotElems}
  </g>

  <g font-family="'Lora','Georgia','Times New Roman',serif">
    <text x="80" y="214" font-size="34" font-weight="500" letter-spacing="6" fill="${TEXT_SECONDARY}" font-family="'Geist','Inter','Helvetica Neue',Arial,sans-serif">A   PARTICLE   PORTRAIT</text>
    <text x="80" y="346" font-size="108" font-style="italic" font-weight="500" fill="${TEXT_PRIMARY}">A Billion Dreams</text>
    <line x1="80" y1="396" x2="560" y2="396" stroke="url(#rule)" stroke-width="3" stroke-linecap="round"/>
    <text x="80" y="462" font-size="30" fill="${TEXT_SECONDARY}" font-family="'Geist','Inter','Helvetica Neue',Arial,sans-serif">A scroll-driven story where light gathers into a portrait —</text>
    <text x="80" y="504" font-size="30" fill="${TEXT_SECONDARY}" font-family="'Geist','Inter','Helvetica Neue',Arial,sans-serif">continuity, memory, and the crease between two lifetimes.</text>
    <text x="80" y="586" font-size="24" letter-spacing="8" fill="${ACCENT_CYAN}" font-family="'Geist','Inter','Helvetica Neue',Arial,sans-serif">WAIT  ·  STRIKE  ·  ROAR  ·  CARRY</text>
  </g>

  <g transform="translate(${width - 110}, ${height / 2})">
    <circle cx="0" cy="0" r="260" fill="${ACCENT_PURPLE}" fill-opacity="0.05"/>
    <circle cx="0" cy="0" r="190" fill="${ACCENT_CYAN}" fill-opacity="0.07"/>
    <g fill="#e4e4e7">
      <circle cx="0" cy="-190" r="5"/>
      <circle cx="95" cy="-164" r="4"/>
      <circle cx="164" cy="-95" r="5"/>
      <circle cx="190" cy="0" r="5.5"/>
      <circle cx="164" cy="95" r="5"/>
      <circle cx="95" cy="164" r="4"/>
      <circle cx="0" cy="190" r="5"/>
      <circle cx="-95" cy="164" r="4"/>
      <circle cx="-164" cy="95" r="5"/>
      <circle cx="-190" cy="0" r="6"/>
      <circle cx="-164" cy="-95" r="5"/>
      <circle cx="-95" cy="-164" r="4"/>
    </g>
    <g fill="#a1a1aa">
      <circle cx="0" cy="-100" r="3"/>
      <circle cx="70" cy="-70" r="2.5"/>
      <circle cx="100" cy="0" r="3"/>
      <circle cx="70" cy="70" r="2.5"/>
      <circle cx="0" cy="100" r="3"/>
      <circle cx="-70" cy="70" r="2.5"/>
      <circle cx="-100" cy="0" r="3"/>
      <circle cx="-70" cy="-70" r="2.5"/>
    </g>
    <circle cx="0" cy="0" r="40" fill="#ffffff" fill-opacity="0.92"/>
    <circle cx="0" cy="0" r="12" fill="#ffffff"/>
  </g>
</svg>`;
}

async function svgToPng(svgBuf, width, height, outPath) {
  await sharp(svgBuf, { density: 384 })
    .resize(width, height, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  const iconSvg = readFileSync(ICON_SVG);

  const tasks = [
    { size: 180, out: join(APP_DIR, "apple-icon.png") },
    { size: 192, out: join(PUBLIC_DIR, "icon-192.png") },
    { size: 512, out: join(PUBLIC_DIR, "icon-512.png") },
  ];

  for (const { size, out } of tasks) {
    await svgToPng(iconSvg, size, size, out);
    console.log(`[seo] wrote ${out} (${size}×${size})`);
  }

  const ogSvg = Buffer.from(buildOgSvg({ width: 1200, height: 630 }), "utf8");

  const ogPng = join(APP_DIR, "opengraph-image.png");
  await svgToPng(ogSvg, 1200, 630, ogPng);
  console.log(`[seo] wrote ${ogPng} (1200×630)`);

  const twPng = join(APP_DIR, "twitter-image.png");
  await svgToPng(ogSvg, 1200, 630, twPng);
  console.log(`[seo] wrote ${twPng} (1200×630)`);

  console.log("[seo] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
