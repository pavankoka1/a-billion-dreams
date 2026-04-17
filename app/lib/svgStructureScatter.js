/**
 * Scatter layout from a **reference SVG** (stipple mask): rasterize, collect bright pixels,
 * optionally split into **left / center / right** buckets (nucleus + wings). No positional jitter
 * when `structureJitterPx` is 0 — clean silhouette.
 * Browser-only (Canvas + Image).
 */

function hash01(s) {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Map particle index to a repeating left / center / right pattern (optional helper; scatter
 * positions use the full SVG mask — zones for motion are derived from sample x in
 * {@link sampleSvgStructureScatter}).
 * @param {number} index
 * @param {[number, number, number]} split — [left, center, right] weights (sum = modulus)
 * @returns {"left"|"center"|"right"}
 */
export function clusterFromIndex(index, split) {
  const sum = split[0] + split[1] + split[2];
  if (sum <= 0) return "center";
  const k = index % sum;
  if (k < split[0]) return "left";
  if (k < split[0] + split[1]) return "center";
  return "right";
}

/**
 * @typedef {{
 *   url: string,
 *   cw: number,
 *   ch: number,
 *   splitZones: boolean,
 *   zoneBands: { leftMax: number, rightMin: number },
 *   xs: Float32Array,
 *   ys: Float32Array,
 *   len: number,
 *   xsL?: Float32Array,
 *   ysL?: Float32Array,
 *   lenL?: number,
 *   xsC?: Float32Array,
 *   ysC?: Float32Array,
 *   lenC?: number,
 *   xsR?: Float32Array,
 *   ysR?: Float32Array,
 *   lenR?: number,
 *   structureJitterPx?: number,
 * }} SvgScatterCache
 */

/** @type {SvgScatterCache | null} */
let cache = null;

const MAX_SAMPLES = 420000;
const MIN_ZONE_PIXELS = 1200;

/**
 * @param {string} publicUrl — e.g. `/grok-scatter-structure.svg`
 * @param {object} [opts]
 * @param {number} [opts.maxRasterSide]
 * @param {number} [opts.lumaMin]
 * @param {{ w: number, h: number }} [opts.excludeBottomRightNorm] — fraction of width/height to clear (logo area)
 * @param {{ leftMax: number, rightMin: number }} [opts.zoneBands] — normalized 0–1 x in raster space
 * @param {number} [opts.structureJitterPx] — extra pixel jitter (keep 0 for crisp structure)
 */
export async function loadSvgStructureForScatter(publicUrl, opts = {}) {
  const maxRasterSide = opts.maxRasterSide ?? 720;
  const lumaMin = opts.lumaMin ?? 42;
  const ex = opts.excludeBottomRightNorm;
  const exW = ex?.w ?? 0;
  const exH = ex?.h ?? 0;
  const leftMax = opts.zoneBands?.leftMax ?? 0.34;
  const rightMin = opts.zoneBands?.rightMin ?? 0.66;

  if (typeof document === "undefined") return null;

  if (cache && cache.url === publicUrl) return cache;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`svg-structure: failed to load ${publicUrl}`));
    img.src = publicUrl;
  });

  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  if (w0 < 2 || h0 < 2) throw new Error("svg-structure: invalid image dimensions");

  const scale = Math.min(1, maxRasterSide / Math.max(w0, h0));
  const cw = Math.max(2, Math.round(w0 * scale));
  const ch = Math.max(2, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("svg-structure: no 2d context");
  ctx.drawImage(img, 0, 0, cw, ch);
  const id = ctx.getImageData(0, 0, cw, ch);
  const d = id.data;

  const xs = [];
  const ys = [];
  const leftX = [];
  const leftY = [];
  const centerX = [];
  const centerY = [];
  const rightX = [];
  const rightY = [];

  for (let y = 0; y < ch; y++) {
    const ny = y / ch;
    for (let x = 0; x < cw; x++) {
      const nx = x / cw;
      if (exW > 0 && exH > 0 && nx >= 1 - exW && ny >= 1 - exH) {
        continue;
      }
      const i = (y * cw + x) * 4;
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (l <= lumaMin) continue;

      xs.push(x);
      ys.push(y);
      if (nx < leftMax) {
        leftX.push(x);
        leftY.push(y);
      } else if (nx > rightMin) {
        rightX.push(x);
        rightY.push(y);
      } else {
        centerX.push(x);
        centerY.push(y);
      }
    }
  }

  let len = xs.length;
  if (len < 500) {
    throw new Error("svg-structure: too few bright pixels — check lumaMin / artwork");
  }

  let splitZones =
    leftX.length >= MIN_ZONE_PIXELS &&
    centerX.length >= MIN_ZONE_PIXELS &&
    rightX.length >= MIN_ZONE_PIXELS;

  if (!splitZones) {
    console.warn(
      "[svgStructureScatter] zone buckets too sparse — using single pool (check artwork bands)"
    );
  }

  function thinPair(ax, ay) {
    let n = ax.length;
    if (n > MAX_SAMPLES) {
      const step = n / MAX_SAMPLES;
      const nx = [];
      const ny = [];
      for (let j = 0; j < MAX_SAMPLES; j++) {
        const k = Math.min(n - 1, Math.floor(j * step));
        nx.push(ax[k]);
        ny.push(ay[k]);
      }
      return {
        xs: new Float32Array(nx),
        ys: new Float32Array(ny),
        len: nx.length,
      };
    }
    return {
      xs: new Float32Array(ax),
      ys: new Float32Array(ay),
      len: n,
    };
  }

  const full = thinPair(xs, ys);

  /** @type {SvgScatterCache} */
  const out = {
    url: publicUrl,
    cw,
    ch,
    splitZones,
    zoneBands: { leftMax, rightMin },
    xs: full.xs,
    ys: full.ys,
    len: full.len,
    structureJitterPx: opts.structureJitterPx ?? 0,
  };

  if (splitZones) {
    const L = thinPair(leftX, leftY);
    const C = thinPair(centerX, centerY);
    const R = thinPair(rightX, rightY);
    out.xsL = L.xs;
    out.ysL = L.ys;
    out.lenL = L.len;
    out.xsC = C.xs;
    out.ysC = C.ys;
    out.lenC = C.len;
    out.xsR = R.xs;
    out.ysR = R.ys;
    out.lenR = R.len;
  }

  cache = out;
  return cache;
}

export function clearSvgStructureCache() {
  cache = null;
}

export function getSvgStructureCache() {
  return cache;
}

function mapContain(nx, ny, innerW, innerH, arSvg) {
  const arV = innerW / innerH;
  let rw;
  let rh;
  let ox;
  let oy;
  if (arV > arSvg) {
    rh = innerH;
    rw = innerH * arSvg;
    ox = (innerW - rw) * 0.5;
    oy = 0;
  } else {
    rw = innerW;
    rh = innerW / arSvg;
    ox = 0;
    oy = (innerH - rh) * 0.5;
  }
  return { rx: ox + nx * rw, ry: oy + ny * rh };
}

/**
 * Samples **one point per particle** from the full stipple mask so the cloud matches the SVG
 * silhouette. `scatterZone` is derived from the sample’s horizontal position (for orchestrated
 * motion), not from particle index — index-based zone pools distorted the shape.
 *
 * @returns {{ rx: number, ry: number, sizeMul: number, alphaMul: number, scatterZone: "left"|"center"|"right" }}
 */
export function sampleSvgStructureScatter(
  innerW,
  innerH,
  particleIndex,
  clusterSpreadFrac
) {
  const c = cache;
  if (!c || c.len < 2) {
    throw new Error("sampleSvgStructureScatter: loadSvgStructureForScatter not called");
  }
  const seed =
    particleIndex * 12.9898 +
    particleIndex * 0.6180339887498949 +
    clusterSpreadFrac * 413.531;
  const u = hash01(seed * 1.313);

  const pickXs = c.xs;
  const pickYs = c.ys;
  const pickLen = c.len;

  const idx = Math.min(pickLen - 1, Math.floor(u * pickLen));
  const nx = pickXs[idx] / c.cw;
  const ny = pickYs[idx] / c.ch;
  const { leftMax, rightMin } = c.zoneBands ?? {
    leftMax: 0.34,
    rightMin: 0.66,
  };
  /** @type {"left"|"center"|"right"} */
  let scatterZone = "center";
  if (nx < leftMax) scatterZone = "left";
  else if (nx > rightMin) scatterZone = "right";
  const arSvg = c.cw / c.ch;
  const { rx: x0, ry: y0 } = mapContain(nx, ny, innerW, innerH, arSvg);

  const jitterPx = c.structureJitterPx ?? 0;
  let rx = x0;
  let ry = y0;
  if (jitterPx > 0) {
    const j = jitterPx;
    rx += (hash01(seed * 3.19) - 0.5) * j * 2;
    ry += (hash01(seed * 4.07) - 0.5) * j * 2;
  }

  rx = Math.min(innerW - 1, Math.max(0, rx));
  ry = Math.min(innerH - 1, Math.max(0, ry));

  return {
    rx,
    ry,
    sizeMul: 1,
    alphaMul: 1,
    scatterZone,
  };
}
