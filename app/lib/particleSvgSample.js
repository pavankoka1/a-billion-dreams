/** Natural size of artwork (must match target.svg width/height) */
export const SVG_W = 1168;
export const SVG_H = 880;

export const BACKGROUND_FILL = "#276aa6";

/** Traced-photo backdrops often use light gray fills; skip so stipples match the subject only. */
export const LIGHT_BACKDROP_FILL_LUMA_MIN = 228;

function fillIsLightBackdrop(fillAttr) {
  const f = normalizeFill(fillAttr);
  if (!f.startsWith("#") || f.length !== 7) return false;
  const r = Number.parseInt(f.slice(1, 3), 16);
  const g = Number.parseInt(f.slice(3, 5), 16);
  const b = Number.parseInt(f.slice(5, 7), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return false;
  return (r + g + b) / 3 >= LIGHT_BACKDROP_FILL_LUMA_MIN;
}

/**
 * Returns chroma (max-min of RGB) for a hex fill, or null if not a parseable
 * hex color. Near-black (#000-#202020) is treated as "has structure" and
 * returns a sentinel high chroma so text / number strokes (which are usually
 * dark-neutral) are not filtered by the gray-haze chroma cut.
 */
function fillChroma(fillAttr) {
  const f = normalizeFill(fillAttr);
  if (!f.startsWith("#") || f.length !== 7) return null;
  const r = Number.parseInt(f.slice(1, 3), 16);
  const g = Number.parseInt(f.slice(3, 5), 16);
  const b = Number.parseInt(f.slice(5, 7), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  const lum = (r + g + b) / 3;
  if (lum <= 48) return 999;
  return Math.max(r, g, b) - Math.min(r, g, b);
}

export function pointOnPathInSvgSpace(path, distanceAlong) {
  const svg = path.ownerSVGElement;
  const raw = path.getPointAtLength(distanceAlong);
  if (!svg) {
    return { x: raw.x, y: raw.y };
  }
  const pt = svg.createSVGPoint();
  pt.x = raw.x;
  pt.y = raw.y;
  const ctm = path.getCTM();
  if (!ctm) {
    return { x: raw.x, y: raw.y };
  }
  const mapped = pt.matrixTransform(ctm);
  return { x: mapped.x, y: mapped.y };
}

function normalizeFill(fillAttr) {
  if (!fillAttr) return "";
  const s = fillAttr.trim().toLowerCase();
  if (s.startsWith("#") && s.length === 4) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return s;
}

/**
 * Minimum bbox area (svg-units²) for a path to contribute particles. Values below
 * this are almost always raster-tracer noise fragments (e.g. stray 3–6 px blobs
 * from anti-aliased edges) that otherwise soak up sample budget and look speckly.
 *
 * The duo-finale SVG (Grok trace) has ~2900/4700 paths below area 200; pushing
 * to 400 removes most of those while preserving digits / letter strokes (which
 * are typically 10×50 ≈ 500-area rectangles) and helmet-grille segments.
 */
export const DEFAULT_MIN_PATH_BBOX_AREA = 400;

/**
 * Minimum path length (svg-units) for a path to contribute particles. Very short
 * outlines are almost always tracer hairlines; filtering them keeps dots on the
 * major structural curves (jerseys, numbers, helmets, flag panels).
 */
export const DEFAULT_MIN_PATH_LENGTH = 32;

/**
 * Minimum chroma (max(RGB) − min(RGB)) for a path's fill. Paths painted in
 * near-neutral mid-grays (≈ shadow midtones from the tracer's posterisation)
 * form a visual "haze" between real structural shapes — filtering them greatly
 * cleans up the dot field without erasing number / letter strokes, which tend
 * to be deeply saturated or dark-saturated rather than neutral gray.
 * Set to 0 to disable the chroma filter.
 */
export const DEFAULT_MIN_PATH_CHROMA = 18;

/**
 * @param {SVGSVGElement} svgEl — must be attached to the document for getBBox / path metrics
 * @param {number} count
 * @param {{ minBboxArea?: number, minPathLength?: number, weight?: "length" | "area" }} [opts]
 * @returns {{ nxny: { nx: number; ny: number }[]; svgW: number; svgH: number }}
 */
export function samplePointsFromSvgRoot(svgEl, count, opts = {}) {
  const svgW = Number.parseFloat(svgEl.getAttribute("width")) || SVG_W;
  const svgH = Number.parseFloat(svgEl.getAttribute("height")) || SVG_H;
  const svgArea = svgW * svgH;

  const minBboxArea = opts.minBboxArea ?? DEFAULT_MIN_PATH_BBOX_AREA;
  const minPathLength = opts.minPathLength ?? DEFAULT_MIN_PATH_LENGTH;
  const minChroma = opts.minChroma ?? DEFAULT_MIN_PATH_CHROMA;
  /**
   * "length" keeps the classic outline aesthetic (uniform dot density along each curve).
   * "area" biases more particles toward big structural fills (jerseys, flag, numbers) and
   * is visibly cleaner for heavily-traced SVGs with thousands of fragments.
   */
  const weightMode = opts.weight ?? "area";

  const paths = [...svgEl.querySelectorAll("path")];
  const items = [];

  for (const path of paths) {
    const fill = normalizeFill(path.getAttribute("fill") || "");
    if (fill === BACKGROUND_FILL) {
      continue;
    }
    if (fillIsLightBackdrop(path.getAttribute("fill"))) {
      continue;
    }

    if (minChroma > 0) {
      const chroma = fillChroma(path.getAttribute("fill"));
      if (chroma !== null && chroma < minChroma) {
        continue;
      }
    }

    let bboxArea = 0;
    try {
      const b = path.getBBox();
      bboxArea = b.width * b.height;
    } catch {
      bboxArea = 0;
    }
    if (bboxArea > 0.92 * svgArea) {
      continue;
    }
    if (bboxArea < minBboxArea) {
      continue;
    }

    const len = path.getTotalLength();
    if (len < minPathLength) {
      continue;
    }

    const weight = weightMode === "area" ? Math.sqrt(bboxArea) * len : len;
    items.push({ path, length: len, weight });
  }

  if (items.length === 0) {
    return { nxny: [], svgW, svgH };
  }

  const totalWeight = items.reduce((s, it) => s + it.weight, 0);
  const cum = [];
  let c = 0;
  for (const it of items) {
    c += it.weight;
    cum.push(c);
  }

  const nxny = [];
  const rand = Math.random;

  for (let k = 0; k < count; k++) {
    const r = rand() * totalWeight;
    let lo = 0;
    let hi = cum.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= r) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const idx = lo;
    const { path, length } = items[idx];
    const along = rand() * Math.max(0, length - 1e-6);
    const { x, y } = pointOnPathInSvgSpace(path, along);
    nxny.push({
      nx: x / svgW,
      ny: y / svgH,
    });
  }

  return { nxny, svgW, svgH };
}

/**
 * Sample stipple points from a raster silhouette (e.g. transparent PNG) drawn on a canvas.
 * Uses rejection sampling on opaque / non-background pixels (alpha + optional luminance).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} count
 * @param {{ svgW?: number, svgH?: number, minAlpha?: number, maxLuma?: number }} [opts]
 */
export function samplePointsFromRasterCanvas(canvas, count, opts = {}) {
  const svgW = opts.svgW ?? canvas.width;
  const svgH = opts.svgH ?? canvas.height;
  const minAlpha = opts.minAlpha ?? 72;
  /** Skip only near-white opaque pixels (e.g. JPEG matting); 255 = alpha-only silhouette. */
  const maxLuma = opts.maxLuma ?? 255;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { nxny: [], svgW, svgH };
  }
  const data = ctx.getImageData(0, 0, svgW, svgH).data;
  const rand = Math.random;

  const hit = (x, y) => {
    if (x < 0 || y < 0 || x >= svgW || y >= svgH) return false;
    const i = (Math.floor(y) * svgW + Math.floor(x)) * 4;
    const a = data[i + 3];
    if (a < minAlpha) return false;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma <= maxLuma;
  };

  const nxny = [];
  let attempts = 0;
  const maxAttempts = Math.max(count * 250, count + 100000);

  while (nxny.length < count && attempts < maxAttempts) {
    attempts++;
    const x = rand() * svgW;
    const y = rand() * svgH;
    if (!hit(x, y)) continue;
    nxny.push({
      nx: x / svgW,
      ny: y / svgH,
    });
  }

  while (nxny.length < count && nxny.length > 0) {
    const j = Math.floor(rand() * nxny.length);
    nxny.push({ ...nxny[j] });
  }

  return { nxny, svgW, svgH };
}

/**
 * Map normalized outline coords to CSS pixels (letterboxed).
 * @param {number} svgW - source artwork width (defaults to shared portrait size)
 * @param {number} svgH - source artwork height
 * @param {number} layoutZoom — >1 zooms artwork in the viewport (slight crop, “closer” illusion)
 */
export function layoutTarget(
  nx,
  ny,
  innerW,
  innerH,
  svgW = SVG_W,
  svgH = SVG_H,
  layoutZoom = 1
) {
  const base = Math.min(innerW / svgW, innerH / svgH);
  const scale = base * layoutZoom;
  const drawW = svgW * scale;
  const drawH = svgH * scale;
  const ox = (innerW - drawW) / 2;
  const oy = (innerH - drawH) / 2;
  return {
    x: ox + nx * drawW,
    y: oy + ny * drawH,
  };
}
