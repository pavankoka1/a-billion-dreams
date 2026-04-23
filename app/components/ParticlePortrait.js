"use client";

import {
  particleBackgroundRgb,
  particlePortraitConfig,
  particleThemeColorRgb,
} from "@/config/particlePortrait.config";
import { CHAPTER_TARGET_BEATS, STORY_CONFIG } from "@/lib/cricketParticleStory";
import {
  flowRibbonMotionStep,
  seedFlowRibbonParticle,
} from "@/lib/flowRibbonField";
import { layoutTarget } from "@/lib/particleSvgSample";
import { loadParticleStoryTargets } from "@/lib/particleTargetsLoader";
import { initWebGLParticles } from "@/lib/particleWebglRenderer";
import {
  getSvgStructureCache,
  loadSvgStructureForScatter,
  sampleSvgStructureScatter,
} from "@/lib/svgStructureScatter";
import { useCallback, useEffect, useRef, useState } from "react";

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInQuad(t) {
  return t * t;
}

/** Symmetric — gentle acceleration and deceleration (elegant chapter morphs). */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Strong ease-out — moves quickly then snaps into place (exciting finale). */
function easeOutQuint(t) {
  return 1 - (1 - t) ** 5;
}

/** Smooth S-curve — staggered chapter cascade and per-particle u along the chord in duo finale. */
function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
}

/** Softer than cubic — slow start, smooth end. */
function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2;
}

function easingFunc(t) {
  return Math.pow(t, 0.25);
}

/**
 * Duo finale master clock: soft anticipation, long convergence, crisp final crystallization.
 */
function easeFinalePortrait(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const breathe = 0.17;
  const settle = 0.11;
  if (t < breathe) {
    const u = t / breathe;
    return u * u * 0.055;
  }
  if (t > 1 - settle) {
    const u = (t - (1 - settle)) / settle;
    return 0.93 + easeOutQuint(u) * 0.07;
  }
  const u = (t - breathe) / (1 - breathe - settle);
  return 0.055 + easeInOutQuint(u) * 0.875;
}

function easeToImageByMode(easeMode, rawT) {
  return easingFunc(rawT);
  switch (easeMode) {
    case "easeInQuad":
      return easeInQuad(rawT);
    case "easeInCubic":
      return easeInQuad(rawT);
    case "easeInOutCubic":
      return easeInOutCubic(rawT);
    case "easeInOutQuart":
      return easeInOutQuart(rawT);
    case "easeOutQuint":
      return easeOutQuint(rawT);
    case "easeFinalePortrait":
      return easeFinalePortrait(rawT);
    case "easeOutCubic":
    default:
      return easeOutCubic(rawT);
  }
}

/**
 * Sachin/Kohli story scatter — one sample per particle from the full SVG stipple (literal silhouette).
 * Wing/center labels come from each sample’s x-position for orchestrated motion only.
 */
function sampleStoryScatter(
  innerW,
  innerH,
  particleIndex,
  clusterSpreadFrac = 0,
) {
  if (!getSvgStructureCache()) {
    throw new Error("ParticlePortrait: SVG scatter mask not loaded");
  }
  return sampleSvgStructureScatter(
    innerW,
    innerH,
    particleIndex,
    clusterSpreadFrac,
  );
}

/**
 * Scroll-aware “orchestration”: wings move vertically in counterphase; nucleus breathes slightly.
 * Positions are **structural anchor + offset**.
 * `wingPhaseBase` is document scroll Y, or a time-derived value when `scatterAutonomousTimeOnly` is on.
 */
function orchestratedScatterMotionStep(
  p,
  innerW,
  innerH,
  timeMs,
  scrollPaceMul,
  wingPhaseBase,
  cfg,
) {
  const WH = Math.min(innerW, innerH);
  const pace = Math.max(
    cfg.scatterScrollPaceMinMul ?? 1,
    Math.min(cfg.scatterScrollPaceMaxMul ?? 1.5, scrollPaceMul ?? 1),
  );
  const t = timeMs * 0.001 * pace;
  const phase = wingPhaseBase * (cfg.scatterScrollPhaseScale ?? 0.0032);

  const wingAmp = WH * (cfg.scatterWingVertAmp ?? 0.048);
  const wingFreq = cfg.scatterWingFreq ?? 0.6;
  const nuc = WH * (cfg.scatterNucleusBreathAmp ?? 0.0085);
  const splitPh = cfg.scatterWingPhaseSplit ?? 0.38;

  const sx = p.structX ?? p.x;
  const sy = p.structY ?? p.y;
  let ox = 0;
  let oy = 0;
  const z = p.scatterZone;
  if (z === "left") {
    oy = wingAmp * Math.sin(t * wingFreq + phase);
  } else if (z === "right") {
    oy = -wingAmp * Math.sin(t * wingFreq * 1.03 + phase + splitPh);
  } else {
    ox = nuc * Math.sin(t * 0.28 + p.seed * 1.07);
    oy = nuc * 0.88 * Math.cos(t * 0.25 + p.seed * 0.85);
  }

  p.x = sx + ox;
  p.y = sy + oy;
  p.vx = 0;
  p.vy = 0;
}

function clampScatterXY(x, y, innerW, innerH, pad) {
  return {
    x: Math.min(innerW - pad, Math.max(pad, x)),
    y: Math.min(innerH - pad, Math.max(pad, y)),
  };
}

/**
 * Inset from canvas edges (CSS px) so the full point sprite stays inside the framebuffer.
 * Matches `particleWebglRenderer`: gl_PointSize = min(256, max(1, diameterCss * dpr)).
 */
function scatterCanvasEdgePad(pointDiameterCssPx, dpr) {
  const sz = Math.min(256, Math.max(1, pointDiameterCssPx * dpr));
  const halfDevPx = sz * 0.5;
  return Math.max(2, halfDevPx / dpr + 0.5);
}

function applyBeatToState(s, nxny, meta) {
  const n = s.particles.length;
  for (let i = 0; i < n; i++) {
    s.particles[i].nx = nxny[i].nx;
    s.particles[i].ny = nxny[i].ny;
  }
  s.layoutSvgW = meta.svgW;
  s.layoutSvgH = meta.svgH;
}

export default function ParticlePortrait({
  storyMode = false,
  /** When true, dots form story silhouettes; when false, starfield (opening chapters). */
  portraitMode = false,
  /** Key in `particle-targets.json` v2 `beats` — which pose / image to morph toward */
  targetBeatId = null,
  /** 0–1: throttles scatter-phase visibility (story intro = very few “stars”) */
  scatterAlphaScale = 1,
  particleColorRgb = particleThemeColorRgb,
  backgroundRgb = particleBackgroundRgb,
  /** full | splitRight | splitSides | splitGutters — splitGutters = side strips only (center kept clear) */
  particleLayout = "full",
  /** When true in story portrait mode, stay in scatter (no beat morph) — e.g. finale text phase */
  scatterOnly = false,
  /** Document scroll Y — drives scatter jitter only while scrolling (story + splitRight). */
  scrollY = 0,
  /** 0–1 while in portrait “hold” band — lerp scatter toward the upcoming silhouette (splitRight). */
  scatterPrefillT = 0,
  /** Story chapter index — silhouette / layout sync only; scatter field is not re-seeded on change. */
  portraitStoryKey = 0,
  /** 0 = in scatter hold band, 1 = past hold — helps sync when crossing ~30% scroll within a chapter. */
  portraitBandEpoch = 0,
  /** 0 = finale full-screen scatter band, 1 = scroll into duo formation. */
  finaleImageFormEpoch = 0,
  /** True while finale dots fill the viewport before the duo morph. */
  finaleScatterBurst = false,
  /** Easing for silhouette morph — story defaults to ease-in-out for elegance. */
  storyToImageEase = "easeInOutCubic",
  /** Override morph duration (ms); story default from `particlePortraitConfig`. */
  storyToImageDurationMs,
  /**
   * When true, duo finale uses the single synchronized morph (ease/duration from props).
   * When false in story mode, chapter beats use a staggered cascade instead.
   */
  finaleFormMorph = false,
  /**
   * Optional scroll-scrub progress for `toImage` in [0,1].
   * When provided, morphing follows scroll distance instead of wall-clock time.
   */
  scrollMorphProgress = null,
  /**
   * Mid-story (before finale scroll): no silhouette morph — flowing “living canvas” motion only.
   */
  storyAmbientOnly = false,
  /**
   * Finale flat scatter: replace the ribbon/ring structure with uniform-random dots spread across
   * the whole viewport. When this flips on, particles re-seed (via a smooth `toScatter` tween) so
   * the next image morph pulls them directly from that uniform field into the duo portrait.
   */
  finaleFlatScatter = false,
  /** 0–1 strength for ambient drift (ramps through scroll prefix, then full). */
  verseAmbientIntensity = 1,
  /** 0–1 document scroll — drives graceful field drift (section-independent). */
  storyScrollProgress = 0,
  /** Called when loading / ready / error — for page-level loader */
  onReadyStateChange,
} = {}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const glRef = useRef(null);
  const rendererRef = useRef(null);
  const positionsRef = useRef(null);
  const dprRef = useRef(1);
  const stateRef = useRef({
    particles: [],
    phase: "scatter",
    animStart: 0,
    duration: particlePortraitConfig.storyChapterToImageMs ?? 4000,
    layoutSvgW: 1168,
    layoutSvgH: 880,
  });
  const beatsRef = useRef(null);
  const metaRef = useRef(null);
  const defaultBeatRef = useRef("duo_finale");
  const lastStoryVisualRef = useRef({ portrait: false, beat: null });
  const beginImageTransitionFromCurrentRef = useRef(
    /** @type {(opts?: { durationMs?: number }) => void} */ (() => {}),
  );
  const [status, setStatus] = useState("loading");
  const [hint, setHint] = useState(true);

  useEffect(() => {
    onReadyStateChange?.(status);
  }, [status, onReadyStateChange]);

  /** RAF loop mounts once — keep latest visual props here to avoid stale closures */
  const visualRef = useRef({
    scatterAlphaScale,
    particleColorRgb,
    backgroundRgb,
    scrollY: 0,
    _lastScrollY: 0,
    _scrollVelFast: 0,
    _scrollVelSlow: 0,
    _scrollPaceMul: 1,
    storyMode: false,
    scatterPrefillT: 0,
  });
  visualRef.current.scatterAlphaScale = scatterAlphaScale;
  visualRef.current.particleColorRgb = particleColorRgb;
  visualRef.current.backgroundRgb = backgroundRgb;
  visualRef.current.particleLayout = particleLayout;
  visualRef.current.scrollY = scrollY;
  visualRef.current.storyMode = storyMode;
  visualRef.current.scatterPrefillT = scatterPrefillT;
  visualRef.current.portraitStoryKey = portraitStoryKey;
  visualRef.current.finaleScatterBurst = finaleScatterBurst;
  visualRef.current.storyToImageEase = storyToImageEase;
  visualRef.current.storyToImageDurationMs = storyToImageDurationMs ?? null;
  visualRef.current.finaleFormMorph = finaleFormMorph;
  visualRef.current.scrollMorphProgress = scrollMorphProgress;
  visualRef.current.storyAmbientOnly = storyAmbientOnly;
  visualRef.current.finaleFlatScatter = finaleFlatScatter;
  visualRef.current.verseAmbientIntensity = verseAmbientIntensity;
  visualRef.current.storyScrollProgress = storyScrollProgress;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const gl = glRef.current;
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const drawFrame = useCallback((timeMs) => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const renderer = rendererRef.current;
    const positions = positionsRef.current;
    if (!canvas || !gl || !renderer || !positions) return;

    const innerW = canvas.clientWidth || window.innerWidth;
    const innerH = canvas.clientHeight || window.innerHeight;
    const dpr = dprRef.current;
    const s = stateRef.current;
    const { particles } = s;
    let { phase, animStart, duration } = s;
    const n = particles.length;
    if (n === 0) return;

    const syFrame = visualRef.current.scrollY ?? 0;
    const cfgScroll = particlePortraitConfig;
    const autonomousScatter = cfgScroll.scatterAutonomousTimeOnly === true;

    let scrollPaceMul = 1;
    if (!autonomousScatter) {
      const prevSy = visualRef.current._lastScrollY ?? syFrame;
      const dScrollFrame = syFrame - prevSy;
      visualRef.current._lastScrollY = syFrame;

      const cap = cfgScroll.scatterScrollInputCapPx ?? 44;
      const inst = Math.min(Math.abs(dScrollFrame), cap);
      const rf = cfgScroll.scatterScrollFastRetain ?? 0.88;
      const rs = cfgScroll.scatterScrollSlowRetain ?? 0.974;
      const vf = (visualRef.current._scrollVelFast ?? 0) * rf + inst * (1 - rf);
      const vs = (visualRef.current._scrollVelSlow ?? 0) * rs + vf * (1 - rs);
      visualRef.current._scrollVelFast = vf;
      visualRef.current._scrollVelSlow = vs;

      const refPx = cfgScroll.scatterScrollPaceRefPx ?? 36;
      const minM = cfgScroll.scatterScrollPaceMinMul ?? 1;
      const maxM = cfgScroll.scatterScrollPaceMaxMul ?? 1.5;
      const intensity = Math.min(1, vs / Math.max(1e-6, refPx));
      const targetMul = minM + (maxM - minM) * intensity;
      const curMul = visualRef.current._scrollPaceMul ?? 1;
      const alphaUp = cfgScroll.scatterScrollPaceLerpUp ?? 0.15;
      const alphaDn = cfgScroll.scatterScrollPaceLerpDown ?? 0.06;
      const a = targetMul > curMul ? alphaUp : alphaDn;
      visualRef.current._scrollPaceMul = curMul + (targetMul - curMul) * a;

      scrollPaceMul = visualRef.current._scrollPaceMul;
    } else {
      visualRef.current._lastScrollY = syFrame;
      visualRef.current._scrollPaceMul = 1;
    }

    const wingPhaseBase = autonomousScatter
      ? timeMs * (cfgScroll.scatterAutonomousPhaseEmuPerMs ?? 0.028)
      : syFrame;

    ({ phase, animStart, duration } = s);

    const lw = s.layoutSvgW ?? 1168;
    const lh = s.layoutSvgH ?? 880;

    const elapsed = timeMs - animStart;
    const scrollT = visualRef.current.scrollMorphProgress;
    const hasScrollMorphT =
      typeof scrollT === "number" && Number.isFinite(scrollT);
    const rawT =
      phase === "scatter" || phase === "image"
        ? 1
        : phase === "toImage" && hasScrollMorphT
          ? Math.min(1, Math.max(0, scrollT))
          : Math.min(1, elapsed / duration);
    const easeMode = visualRef.current.storyToImageEase ?? "easeInCubic";
    const t =
      phase === "toImage"
        ? easeToImageByMode(easeMode, rawT)
        : easeOutCubic(rawT);

    const {
      scatterAlphaScale: sas,
      particleColorRgb: pcr,
      backgroundRgb: bgr,
    } = visualRef.current;
    const ox = 0;
    const portraitPhase = phase === "image" || phase === "toImage";
    const scatterBaseAlpha = particlePortraitConfig.scatterGlobalAlpha ?? 0.3;
    const alpha = portraitPhase ? 1 : scatterBaseAlpha * sas;

    const pointDiameterPx = portraitPhase
      ? particlePortraitConfig.portraitDotRadius * 2
      : particlePortraitConfig.scatterDotRadius * 2;

    const layoutZoom = particlePortraitConfig.portraitLayoutZoom ?? 1;

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      let x = p.x;
      let y = p.y;

      if (phase === "toImage") {
        const end = layoutTarget(
          p.nx,
          p.ny,
          innerW,
          innerH,
          lw,
          lh,
          layoutZoom,
        );
        const dx = end.x + ox - p.sx;
        const dy = end.y - p.sy;
        x = p.sx + dx * t;
        y = p.sy + dy * t;
        p.x = x;
        p.y = y;
      } else if (phase === "toScatter") {
        x = p.sx + (p.rx - p.sx) * t;
        y = p.sy + (p.ry - p.sy) * t;
        const toScPad = scatterCanvasEdgePad(pointDiameterPx, dpr);
        const cl0 = clampScatterXY(x, y, innerW, innerH, toScPad);
        x = cl0.x;
        y = cl0.y;
        p.x = x;
        p.y = y;
      } else if (phase === "scatter") {
        /** Finale flat scatter overrides the ribbon preset — uniform field, orchestrated breathe only. */
        const flatScatter = visualRef.current.finaleFlatScatter === true;
        const flowRibbon =
          !flatScatter &&
          (particlePortraitConfig.scatterLayoutPreset === "flowRibbon" ||
            particlePortraitConfig.scatterMotionPreset === "flowRibbon");
        if (flowRibbon) {
          flowRibbonMotionStep(
            p,
            innerW,
            innerH,
            timeMs,
            scrollPaceMul,
            particlePortraitConfig,
          );
        } else {
          orchestratedScatterMotionStep(
            p,
            innerW,
            innerH,
            timeMs,
            scrollPaceMul,
            wingPhaseBase,
            particlePortraitConfig,
          );
        }
        const padSc = scatterCanvasEdgePad(pointDiameterPx, dpr);
        const clsc = clampScatterXY(p.x, p.y, innerW, innerH, padSc);
        p.x = clsc.x;
        p.y = clsc.y;
        p.rx = p.x;
        p.ry = p.y;
        x = p.x;
        y = p.y;
      } else if (phase === "image") {
        const end = layoutTarget(
          p.nx,
          p.ny,
          innerW,
          innerH,
          lw,
          lh,
          layoutZoom,
        );
        p.x = end.x + ox;
        p.y = end.y;
        x = p.x;
        y = p.y;
      }

      const o = i * 4;
      positions[o] = x;
      positions[o + 1] = y;
      if (portraitPhase) {
        positions[o + 2] = 1;
        positions[o + 3] = 1;
      } else {
        positions[o + 2] = p.scatterSize ?? 1;
        positions[o + 3] = p.scatterAlpha ?? 1;
      }
    }

    gl.clearColor(bgr[0], bgr[1], bgr[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const scatterBlend =
      particlePortraitConfig.scatterAdditiveBlend !== false
        ? "additive"
        : "normal";
    renderer.draw(
      positions,
      n,
      [innerW, innerH],
      dpr,
      pointDiameterPx,
      alpha,
      pcr,
      {
        blend: portraitPhase ? "normal" : scatterBlend,
        useParticleStyle: !portraitPhase,
      },
    );

    if (phase === "toImage" && rawT >= 1 && !hasScrollMorphT) {
      s.phase = "image";
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const end = layoutTarget(
          p.nx,
          p.ny,
          innerW,
          innerH,
          lw,
          lh,
          particlePortraitConfig.portraitLayoutZoom ?? 1,
        );
        p.x = end.x + ox;
        p.y = end.y;
      }
    }
    if (phase === "toScatter" && rawT >= 1) {
      s.phase = "scatter";
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.x = p.rx;
        p.y = p.ry;
      }
    }
  }, []);

  const beginImageTransitionFromCurrent = useCallback((opts) => {
    const s = stateRef.current;
    if (s.particles.length === 0) return;
    // Entering a new chapter from the previous image runs beginScatter first (phase → toScatter).
    // If scroll crosses the morph threshold before that animation finishes, we must not bail out:
    // the story effect does not re-run on scrollY, so the silhouette would never start (alternating chapters).
    if (s.phase === "toScatter") {
      // Preserve current in-flight positions so finale entry does not "pop" to rx/ry
      // right before the portrait morph begins.
      s.phase = "scatter";
    }
    const now = performance.now();
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];
      p.sx = p.x;
      p.sy = p.y;
    }
    s.phase = "toImage";
    const fromProp = visualRef.current.storyToImageDurationMs;
    const storyDefault = particlePortraitConfig.storyChapterToImageMs ?? 4000;
    const overrideDur =
      opts &&
      typeof opts === "object" &&
      typeof opts.durationMs === "number" &&
      opts.durationMs > 0
        ? opts.durationMs
        : null;
    s.duration =
      overrideDur ??
      (typeof fromProp === "number" && fromProp > 0
        ? fromProp
        : visualRef.current.storyMode
          ? storyDefault
          : 2600);
    s.animStart = now;
  }, []);

  beginImageTransitionFromCurrentRef.current = beginImageTransitionFromCurrent;

  const beginPortraitTransition = useCallback(
    (allowInterrupt) => {
      const s = stateRef.current;
      const { particles, phase } = s;
      if (particles.length === 0) return;
      if (phase === "toImage" || phase === "toScatter") return;
      if (!allowInterrupt && phase !== "scatter") return;
      beginImageTransitionFromCurrent();
    },
    [beginImageTransitionFromCurrent],
  );

  const beginScatterTransition = useCallback((allowInterrupt, opts) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    const innerW = canvas?.clientWidth || window.innerWidth;
    const innerH = canvas?.clientHeight || window.innerHeight;
    const { particles, phase } = s;
    const forceReseed = opts?.forceReseed === true;
    const forceFlatScatter = opts?.forceFlatScatter === true;
    const instant = opts?.instant === true;
    const useFlatScatter =
      forceFlatScatter || visualRef.current.finaleFlatScatter === true;
    if (particles.length === 0) return;
    if (!forceReseed && (phase === "scatter" || phase === "toScatter")) return;
    if (!forceReseed && !allowInterrupt && phase !== "image") return;
    const now = performance.now();
    const dpr = dprRef.current;
    const scatterD = particlePortraitConfig.scatterDotRadius * 2;
    const pad = scatterCanvasEdgePad(scatterD, dpr);
    const seedK = particlePortraitConfig.cohesiveClusterSpread ?? 0.01;
    const flowRibbon =
      particlePortraitConfig.scatterLayoutPreset === "flowRibbon" ||
      particlePortraitConfig.scatterMotionPreset === "flowRibbon";
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.sx = p.x;
      p.sy = p.y;
      if (useFlatScatter) {
        const rx = pad + Math.random() * Math.max(1, innerW - pad * 2);
        const ry = pad + Math.random() * Math.max(1, innerH - pad * 2);
        p.rx = rx;
        p.ry = ry;
        p.structX = rx;
        p.structY = ry;
        p.scatterSize = 1;
        p.scatterAlpha = particlePortraitConfig.scatterPerParticleAlpha ?? 1;
        p.scatterZone = undefined;
        p.flowRegion = undefined;
        p.flowU = 0;
        p.flowV = 0;
      } else if (flowRibbon) {
        const sc = seedFlowRibbonParticle(
          innerW,
          innerH,
          i,
          seedK,
          particlePortraitConfig,
        );
        const cl = clampScatterXY(sc.rx, sc.ry, innerW, innerH, pad);
        p.rx = cl.x;
        p.ry = cl.y;
        p.structX = cl.x;
        p.structY = cl.y;
        p.flowRegion = sc.flowRegion;
        p.flowU = sc.flowU;
        p.flowV = sc.flowV;
        p.scatterSize = sc.sizeMul ?? 1;
        p.scatterAlpha =
          (sc.alphaMul ?? 1) *
          (particlePortraitConfig.scatterPerParticleAlpha ?? 1);
        p.scatterZone = sc.scatterZone;
      } else if (getSvgStructureCache()) {
        const sc = sampleStoryScatter(innerW, innerH, i, seedK);
        const cl = clampScatterXY(sc.rx, sc.ry, innerW, innerH, pad);
        p.rx = cl.x;
        p.ry = cl.y;
        p.structX = cl.x;
        p.structY = cl.y;
        p.scatterSize = sc.sizeMul ?? 1;
        p.scatterAlpha =
          (sc.alphaMul ?? 1) *
          (particlePortraitConfig.scatterPerParticleAlpha ?? 1);
        p.scatterZone = sc.scatterZone;
      } else {
        const cl = clampScatterXY(p.x, p.y, innerW, innerH, pad);
        p.rx = cl.x;
        p.ry = cl.y;
        p.structX = cl.x;
        p.structY = cl.y;
        p.scatterSize = 1;
        p.scatterAlpha = 1;
        p.scatterZone = undefined;
      }
    }
    if (instant) {
      s.phase = "scatter";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = p.rx;
        p.y = p.ry;
      }
      return;
    }
    s.phase = "toScatter";
    s.animStart = now;
    if (useFlatScatter) {
      s.duration = particlePortraitConfig.finaleFlatScatterInMs ?? 900;
    }
  }, []);

  /**
   * Re-seed all particles to uniform-random positions (no ring, no arms). Particles tween from
   * their current positions to these new uniform homes via `toScatter`, so the handoff reads as a
   * dissolve — not a teleport. Subsequent `toImage` starts from this flat field.
   */
  const beginFlatScatterTransition = useCallback((instant = false) => {
    beginScatterTransition(true, {
      forceReseed: true,
      forceFlatScatter: true,
      instant,
    });
  }, [beginScatterTransition]);

  /**
   * Once the user reaches finale flat scatter at least once, keep the story in free-form
   * scatter while scrubbing up/down (never restore ring/ribbon structures).
   */
  const flatScatterArmedRef = useRef(false);
  useEffect(() => {
    if (status !== "ready") return;
    if (finaleFlatScatter) {
      const instantOnEnter =
        particlePortraitConfig.finaleFlatScatterInstantOnEnter !== false;
      beginFlatScatterTransition(instantOnEnter);
      flatScatterArmedRef.current = true;
    } else if (flatScatterArmedRef.current) {
      beginScatterTransition(true, { forceReseed: true });
      flatScatterArmedRef.current = false;
    }
  }, [
    finaleFlatScatter,
    status,
    beginFlatScatterTransition,
    beginScatterTransition,
  ]);

  useEffect(() => {
    if (!storyMode || status !== "ready") return;
    const s = stateRef.current;
    const beats = beatsRef.current;
    const meta = metaRef.current;
    if (!beats || !meta) return;

    if (!portraitMode) {
      if (s.phase === "image" || s.phase === "toImage") {
        beginScatterTransition(true);
      }
      lastStoryVisualRef.current = { portrait: false, beat: null };
      return;
    }

    if (storyAmbientOnly) {
      const finaleImageOnly =
        particlePortraitConfig.particlesFormImageOnlyInFinale === true;
      const noMidStorySilhouettes =
        finaleImageOnly || particlePortraitConfig.ambientSlowFormCycle !== true;
      if (
        noMidStorySilhouettes &&
        (s.phase === "image" || s.phase === "toImage")
      ) {
        beginScatterTransition(true);
      }
      lastStoryVisualRef.current = { portrait: true, beat: null };
      return;
    }

    if (scatterOnly) {
      if (s.phase === "image" || s.phase === "toImage") {
        beginScatterTransition(true);
      }
      if (targetBeatId) {
        const hid = targetBeatId;
        const nxny = beats[hid];
        const hm = meta[hid];
        if (nxny?.length && hm) {
          applyBeatToState(s, nxny, hm);
          lastStoryVisualRef.current = { portrait: true, beat: hid };
        }
      }
      return;
    }

    if (!targetBeatId) {
      if (s.phase === "image" || s.phase === "toImage") {
        beginScatterTransition(true);
      }
      lastStoryVisualRef.current = { portrait: true, beat: null };
      return;
    }

    const id = targetBeatId;
    const nxny = beats[id];
    const m = meta[id];
    if (!nxny?.length || !m) return;

    // While morphing, only skip if we're still targeting the same beat; if the story chapter
    // changes mid-transition, retarget nx/ny and restart from current particle positions.
    if (
      (s.phase === "toImage" || s.phase === "image") &&
      lastStoryVisualRef.current.beat === id
    ) {
      return;
    }

    applyBeatToState(s, nxny, m);
    lastStoryVisualRef.current = { portrait: true, beat: id };
    beginImageTransitionFromCurrent();
  }, [
    storyMode,
    status,
    portraitMode,
    portraitStoryKey,
    targetBeatId,
    beginImageTransitionFromCurrent,
    beginScatterTransition,
    scatterOnly,
    portraitBandEpoch,
    finaleImageFormEpoch,
    storyAmbientOnly,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = initWebGLParticles(canvas);
    if (!init) {
      setStatus("webgl-error");
      return undefined;
    }
    glRef.current = init.gl;
    rendererRef.current = init.renderer;

    resizeCanvas();

    let cancelled = false;

    (async () => {
      try {
        if (!storyMode) {
          if (!cancelled) setStatus("error");
          return;
        }

        const count = particlePortraitConfig.particleCount;
        const data = await loadParticleStoryTargets(count);
        if (cancelled) return;
        beatsRef.current = data.beats;
        metaRef.current = data.meta;
        defaultBeatRef.current = data.defaultBeat;
        const seedKey =
          CHAPTER_TARGET_BEATS[STORY_CONFIG.firstImageChapter] ||
          data.defaultBeat;
        const seedNxny = data.beats[seedKey] || data.beats[data.defaultBeat];
        const seedMeta = data.meta[seedKey] || data.meta[data.defaultBeat];
        if (!seedNxny?.length) {
          setStatus("error");
          return;
        }
        const nxny = seedNxny;
        stateRef.current.layoutSvgW = seedMeta.svgW;
        stateRef.current.layoutSvgH = seedMeta.svgH;

        if (cancelled) return;

        const flowRibbon =
          particlePortraitConfig.scatterLayoutPreset === "flowRibbon" ||
          particlePortraitConfig.scatterMotionPreset === "flowRibbon";

        if (!flowRibbon) {
          try {
            await loadSvgStructureForScatter(
              particlePortraitConfig.scatterStructureSvg ??
                "/grok-scatter-structure.svg",
              {
                maxRasterSide:
                  particlePortraitConfig.scatterStructureMaxRasterSide ?? 720,
                lumaMin: particlePortraitConfig.scatterStructureLumaMin ?? 40,
                excludeBottomRightNorm:
                  particlePortraitConfig.scatterExcludeBottomRightNorm,
                zoneBands: particlePortraitConfig.scatterZoneBands,
                structureJitterPx:
                  particlePortraitConfig.scatterStructureJitterPx ?? 0,
              },
            );
          } catch (err) {
            console.warn(
              "[ParticlePortrait] SVG scatter mask load failed",
              err,
            );
          }
          if (!getSvgStructureCache()) {
            if (!cancelled) setStatus("error");
            return;
          }
        }

        positionsRef.current = new Float32Array(nxny.length * 4);

        const cw = canvasRef.current?.clientWidth ?? canvas.clientWidth;
        const ch = canvasRef.current?.clientHeight ?? canvas.clientHeight;
        const innerW = cw || window.innerWidth;
        const innerH = ch || window.innerHeight;
        const seedFlatScatter = visualRef.current.finaleFlatScatter === true;
        const scatterD = particlePortraitConfig.scatterDotRadius * 2;
        const scatterPad = scatterCanvasEdgePad(scatterD, dprRef.current);
        const particles = [];
        const seedCluster =
          particlePortraitConfig.cohesiveClusterSpread ?? 0.01;
        const buf = positionsRef.current;
        for (let i = 0; i < nxny.length; i++) {
          const { nx, ny } = nxny[i];
          let sc;
          if (seedFlatScatter) {
            const rx =
              scatterPad + Math.random() * Math.max(1, innerW - scatterPad * 2);
            const ry =
              scatterPad + Math.random() * Math.max(1, innerH - scatterPad * 2);
            sc = {
              rx,
              ry,
              scatterZone: undefined,
              flowRegion: undefined,
              flowU: 0,
              flowV: 0,
              sizeMul: 1,
              alphaMul: 1,
            };
          } else if (flowRibbon) {
            sc = seedFlowRibbonParticle(
              innerW,
              innerH,
              i,
              seedCluster,
              particlePortraitConfig,
            );
          } else {
            sc = sampleStoryScatter(innerW, innerH, i, seedCluster);
          }
          const sz = sc.sizeMul ?? 1;
          const sa =
            (sc.alphaMul ?? 1) *
            (particlePortraitConfig.scatterPerParticleAlpha ?? 1);
          const pt = {
            nx,
            ny,
            x: sc.rx,
            y: sc.ry,
            rx: sc.rx,
            ry: sc.ry,
            sx: sc.rx,
            sy: sc.ry,
            structX: sc.rx,
            structY: sc.ry,
            vx: 0,
            vy: 0,
            seed: Math.random() * Math.PI * 2,
            scatterSize: sz,
            scatterAlpha: sa,
            scatterZone: sc.scatterZone,
          };
          if (flowRibbon) {
            pt.flowRegion = sc.flowRegion;
            pt.flowU = sc.flowU;
            pt.flowV = sc.flowV;
          }
          particles.push(pt);
          const o = i * 4;
          buf[o] = sc.rx;
          buf[o + 1] = sc.ry;
          buf[o + 2] = sz;
          buf[o + 3] = sa;
        }
        stateRef.current.particles = particles;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    const loop = (timeMs) => {
      drawFrame(timeMs);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onResize = () => {
      resizeCanvas();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
      glRef.current = null;
      positionsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const handlePointerDown = useCallback(() => {
    if (storyMode) return;
    setHint(false);
    const s = stateRef.current;
    const { phase } = s;
    if (s.particles.length === 0) return;
    if (phase === "toImage" || phase === "toScatter") return;
    if (phase === "scatter") beginPortraitTransition(false);
    else if (phase === "image") beginScatterTransition(false);
  }, [storyMode, beginPortraitTransition, beginScatterTransition]);

  return (
    <div
      className={`fixed inset-0 touch-none select-none ${storyMode ? "pointer-events-none cursor-default" : "cursor-pointer"}`}
      onPointerDown={handlePointerDown}
      role="presentation"
      aria-label={
        storyMode
          ? "Particle portrait behind the story; scroll to reveal"
          : "Particle starfield; tap to form image"
      }
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{
          background: `rgb(${Math.round(backgroundRgb[0] * 255)}, ${Math.round(
            backgroundRgb[1] * 255,
          )}, ${Math.round(backgroundRgb[2] * 255)})`,
        }}
      />
      {status === "loading" && !storyMode && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans text-sm text-white/50">
          Loading particle targets…
        </div>
      )}
      {status === "webgl-error" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-sans text-sm text-amber-200/95">
          WebGL2 is required for particle rendering. Enable hardware
          acceleration or update your browser, then reload.
        </div>
      )}
      {status === "error" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-sans text-sm text-red-300/90">
          Could not load particle data. Check{" "}
          <code className="mx-1">public/target.svg</code> and{" "}
          <code className="mx-1">app/config/particlePortrait.config.js</code>,
          or run <code className="mx-1">npm run generate:particles</code>.
        </div>
      )}
      {status === "ready" && hint && !storyMode && (
        <div className="pointer-events-none absolute bottom-10 left-0 right-0 text-center font-sans text-sm tracking-wide text-white/45">
          Tap anywhere — WebGL particles (cached targets when available)
        </div>
      )}
    </div>
  );
}
