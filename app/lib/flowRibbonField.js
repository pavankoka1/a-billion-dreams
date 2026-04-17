/**
 * Flow-ribbon scatter: central torus-like ring + two cubic-Bézier arms + layered “curl-ish” noise.
 * Designed to read like dense mist / sand flowing along paths (2D WebGL points).
 */

function hash01(s) {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t2 * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

function cubicTangent(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const dx =
    3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
  const dy =
    3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function zoneFromX(x, innerW, leftMax, rightMin) {
  const nx = x / innerW;
  if (nx < leftMax) return "left";
  if (nx > rightMin) return "right";
  return "center";
}

/**
 * @param {object} cfg — merged with defaults from caller
 */
function getBezierFrames(innerW, innerH, cfg) {
  const cx = innerW * 0.5;
  const cy = innerH * 0.5;
  const WH = Math.min(innerW, innerH);
  const attach = WH * (cfg.flowRibbonCoreAttach ?? 0.07);
  /** Offsets from canvas center for L1,L2,L3 (WH-relative): [L1x,L1y, L2x,L2y, L3x,L3y]. */
  const leftArm =
    cfg.flowRibbonLeftArm ?? [-0.05, -0.02, -0.2, -0.16, -0.48, -0.38];
  const rightArm =
    cfg.flowRibbonRightArm ?? [0.05, 0.02, 0.2, 0.16, 0.48, 0.38];
  const L0 = { x: cx - attach, y: cy - WH * 0.02 };
  const L1 = { x: cx + WH * leftArm[0], y: cy + WH * leftArm[1] };
  const L2 = { x: cx + WH * leftArm[2], y: cy + WH * leftArm[3] };
  const L3 = { x: cx + WH * leftArm[4], y: cy + WH * leftArm[5] };
  const R0 = { x: cx + attach, y: cy + WH * 0.02 };
  const R1 = { x: cx + WH * rightArm[0], y: cy + WH * rightArm[1] };
  const R2 = { x: cx + WH * rightArm[2], y: cy + WH * rightArm[3] };
  const R3 = { x: cx + WH * rightArm[4], y: cy + WH * rightArm[5] };
  return { cx, cy, WH, L0, L1, L2, L3, R0, R1, R2, R3 };
}

/**
 * Base position (no turbulence) at time `timeMs`.
 * @param {0|1|2} flowRegion — ring | left ribbon | right ribbon
 */
export function evalFlowRibbonBase(
  flowRegion,
  flowU,
  flowV,
  innerW,
  innerH,
  timeMs,
  cfg
) {
  const tSec = timeMs * 0.001;
  const f = getBezierFrames(innerW, innerH, cfg);
  const { cx, cy, WH } = f;
  const rMean = WH * (cfg.flowRibbonRingMeanNorm ?? 0.11);
  const rBand = WH * (cfg.flowRibbonRingThicknessNorm ?? 0.044);
  const rot = tSec * (cfg.flowRibbonRotateSpeed ?? 0.42);

  if (flowRegion === 0) {
    let theta = flowU * Math.PI * 2 + flowV * 0.4;
    theta += rot;
    const r = rMean + (flowV - 0.5) * 2 * rBand;
    const wobble = Math.sin(tSec * 1.1 + theta * 3) * WH * 0.008;
    return {
      x: cx + Math.cos(theta) * r + wobble * Math.cos(theta + 1.2),
      y: cy + Math.sin(theta) * r + wobble * Math.sin(theta + 1.2),
    };
  }

  const flowSpeed = cfg.flowRibbonFlowSpeed ?? 0.055;
  const uWave =
    (cfg.flowRibbonRibbonMeander ?? 0.07) *
    Math.sin(tSec * 0.62 + flowV * 9.1 + flowU * 4);
  let tAlong = flowU + tSec * flowSpeed + uWave;
  tAlong -= Math.floor(tAlong);

  const ribW =
    WH *
    (cfg.flowRibbonRibbonWidthNorm ?? 0.052) *
    (0.35 + 0.65 * flowV) *
    (0.25 + 0.75 * Math.sin(Math.PI * tAlong));

  const p0 = flowRegion === 1 ? f.L0 : f.R0;
  const p1 = flowRegion === 1 ? f.L1 : f.R1;
  const p2 = flowRegion === 1 ? f.L2 : f.R2;
  const p3 = flowRegion === 1 ? f.L3 : f.R3;

  const pt = cubicBezier(p0, p1, p2, p3, tAlong);
  const tan = cubicTangent(p0, p1, p2, p3, tAlong);
  const nx = -tan.y;
  const ny = tan.x;
  const side = (flowV - 0.5) * 2;
  return {
    x: pt.x + nx * ribW * side,
    y: pt.y + ny * ribW * side,
  };
}

/**
 * Layered pseudo-curl offset (cheap — no 3D grid).
 */
export function flowRibbonTurbulence(px, py, seed, timeMs, cfg) {
  const t = timeMs * 0.001 * (cfg.flowRibbonNoiseTimeScale ?? 1);
  const s = cfg.flowRibbonNoiseScale ?? 0.0072;
  const x = px * s;
  const y = py * s;
  const ph = seed * 6.28318;

  let dx = 0;
  let dy = 0;
  const oct = [
    { kx: 1.9, ky: 2.2, w: 1, sp: 0.41 },
    { kx: 3.4, ky: 1.6, w: 0.55, sp: 0.52 },
    { kx: 5.2, ky: 4.1, w: 0.28, sp: 0.38 },
  ];
  for (let o = 0; o < oct.length; o++) {
    const u = oct[o];
    dx +=
      u.w *
      Math.sin(x * u.kx + y * u.ky + t * u.sp + ph);
    dy +=
      u.w *
      Math.cos(y * u.kx - x * u.ky + t * (u.sp * 0.92) + ph * 1.3);
  }
  const cx = Math.sin(y * 2.4 + t * 0.55 + ph) * Math.cos(x * 1.8 - t * 0.4);
  const cy = -Math.cos(x * 2.1 + t * 0.48 + ph * 0.7) * Math.sin(y * 2 + t * 0.5);
  return {
    x: dx * 0.42 + cx * 0.58,
    y: dy * 0.42 + cy * 0.58,
  };
}

/**
 * @returns {{ rx: number, ry: number, scatterZone: string, flowRegion: number, flowU: number, flowV: number, sizeMul: number, alphaMul: number }}
 */
export function seedFlowRibbonParticle(innerW, innerH, particleIndex, clusterSpreadFrac, cfg) {
  const h0 = hash01(particleIndex * 19.13 + clusterSpreadFrac * 401.2);
  const h1 = hash01(particleIndex * 47.71 + 13.9);
  const h2 = hash01(particleIndex * 91.3 + clusterSpreadFrac * 211.7);

  const ringShare = cfg.flowRibbonRingShare ?? 0.28;
  let flowRegion;
  if (h0 < ringShare) flowRegion = 0;
  else if (h0 < 0.5 + ringShare * 0.5) flowRegion = 1;
  else flowRegion = 2;

  const flowU = h1;
  const flowV = h2;

  const base = evalFlowRibbonBase(flowRegion, flowU, flowV, innerW, innerH, 0, cfg);
  const zb = cfg.scatterZoneBands ?? { leftMax: 0.34, rightMin: 0.66 };
  const scatterZone = zoneFromX(base.x, innerW, zb.leftMax, zb.rightMin);

  const turb = flowRibbonTurbulence(base.x, base.y, particleIndex * 0.01, 0, cfg);
  const WH = Math.min(innerW, innerH);
  const nAmp = WH * (cfg.flowRibbonNoiseAmp ?? 0.068);
  const rx = base.x + turb.x * nAmp;
  const ry = base.y + turb.y * nAmp;

  const alphaJitter = 0.65 + 0.55 * hash01(particleIndex * 8.31 + 2.1);
  const sizeJitter = 0.85 + 0.35 * hash01(particleIndex * 5.77 + 1.4);

  return {
    rx,
    ry,
    scatterZone,
    flowRegion,
    flowU,
    flowV,
    sizeMul: sizeJitter,
    alphaMul: alphaJitter,
  };
}

/**
 * Updates p.x / p.y from flow ribbon field + turbulence.
 */
/**
 * @param {number} scrollPaceMul — pre-smoothed 1.0 … ~1.5; scales animation time only (no amplitude kick).
 */
export function flowRibbonMotionStep(p, innerW, innerH, timeMs, scrollPaceMul, cfg) {
  const pace = Math.max(
    cfg.scatterScrollPaceMinMul ?? 1,
    Math.min(
      cfg.scatterScrollPaceMaxMul ?? 1.5,
      scrollPaceMul ?? 1
    )
  );
  const tScaled = timeMs * pace;

  const base = evalFlowRibbonBase(
    p.flowRegion,
    p.flowU,
    p.flowV,
    innerW,
    innerH,
    tScaled,
    cfg
  );
  const turb = flowRibbonTurbulence(
    base.x,
    base.y,
    p.seed ?? 0,
    tScaled,
    cfg
  );
  const WH = Math.min(innerW, innerH);
  const nAmp = WH * (cfg.flowRibbonNoiseAmp ?? 0.068);

  p.structX = base.x;
  p.structY = base.y;
  p.x = base.x + turb.x * nAmp;
  p.y = base.y + turb.y * nAmp;
}
