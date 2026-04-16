/** Natural size of artwork (must match target.svg width/height) */
export const SVG_W = 1168;
export const SVG_H = 880;

export const BACKGROUND_FILL = "#276aa6";

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
 * @param {SVGSVGElement} svgEl — must be attached to the document for getBBox / path metrics
 * @param {number} count
 * @returns {{ nxny: { nx: number; ny: number }[]; svgW: number; svgH: number }}
 */
export function samplePointsFromSvgRoot(svgEl, count) {
  const svgW = Number.parseFloat(svgEl.getAttribute("width")) || SVG_W;
  const svgH = Number.parseFloat(svgEl.getAttribute("height")) || SVG_H;
  const svgArea = svgW * svgH;

  const paths = [...svgEl.querySelectorAll("path")];
  const items = [];

  for (const path of paths) {
    const fill = normalizeFill(path.getAttribute("fill") || "");
    if (fill === BACKGROUND_FILL) {
      continue;
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

    const len = path.getTotalLength();
    if (len < 0.5) {
      continue;
    }

    items.push({ path, length: len });
  }

  if (items.length === 0) {
    return { nxny: [], svgW, svgH };
  }

  const totalLen = items.reduce((s, it) => s + it.length, 0);
  const cum = [];
  let c = 0;
  for (const it of items) {
    c += it.length;
    cum.push(c);
  }

  const nxny = [];
  const rand = Math.random;

  for (let k = 0; k < count; k++) {
    const r = rand() * totalLen;
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
    const prev = idx > 0 ? cum[idx - 1] : 0;
    const along = Math.min(items[idx].length - 1e-6, Math.max(0, r - prev));
    const { path } = items[idx];
    const { x, y } = pointOnPathInSvgSpace(path, along);
    nxny.push({
      nx: x / svgW,
      ny: y / svgH,
    });
  }

  return { nxny, svgW, svgH };
}

/**
 * Map normalized outline coords to CSS pixels (letterboxed).
 * @param {number} svgW - source artwork width (defaults to shared portrait size)
 * @param {number} svgH - source artwork height
 */
export function layoutTarget(nx, ny, innerW, innerH, svgW = SVG_W, svgH = SVG_H) {
  const scale = Math.min(innerW / svgW, innerH / svgH);
  const drawW = svgW * scale;
  const drawH = svgH * scale;
  const ox = (innerW - drawW) / 2;
  const oy = (innerH - drawH) / 2;
  return {
    x: ox + nx * drawW,
    y: oy + ny * drawH,
  };
}
