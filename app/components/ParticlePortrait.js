"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  particleBackgroundRgb,
  particlePortraitConfig,
  particleThemeColorRgb,
} from "@/config/particlePortrait.config";
import { initWebGLParticles } from "@/lib/particleWebglRenderer";
import {
  CHAPTER_TARGET_BEATS,
  STORY_CONFIG,
} from "@/lib/cricketParticleStory";
import { layoutTarget } from "@/lib/particleSvgSample";
import {
  loadParticleTargets,
  loadParticleStoryTargets,
} from "@/lib/particleTargetsLoader";

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t) {
  return t * t * t;
}

/** Symmetric — gentle acceleration and deceleration (elegant chapter morphs). */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Strong ease-out — moves quickly then snaps into place (exciting finale). */
function easeOutQuint(t) {
  return 1 - (1 - t) ** 5;
}

/** Softer than cubic — slow start, smooth end. */
function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2;
}

function easeToImageByMode(easeMode, rawT) {
  switch (easeMode) {
    case "easeInCubic":
      return easeInCubic(rawT);
    case "easeInOutCubic":
      return easeInOutCubic(rawT);
    case "easeInOutQuart":
      return easeInOutQuart(rawT);
    case "easeOutQuint":
      return easeOutQuint(rawT);
    case "easeOutCubic":
    default:
      return easeOutCubic(rawT);
  }
}

/** Irregular “nucleus” cloud (not a ring/circle): biased toward center with random clumping. */
function nucleusOffset2D(spreadX, spreadY) {
  const u =
    (Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random()) /
      6 -
    0.5;
  const v =
    (Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random()) /
      6 -
    0.5;
  const warp = 0.55 + Math.random() * 0.65;
  return { dx: u * 2 * spreadX * warp, dy: v * 2 * spreadY * warp };
}

function randomNucleusNear(cx, cy, spreadX, spreadY) {
  const { dx, dy } = nucleusOffset2D(spreadX, spreadY);
  return { rx: cx + dx, ry: cy + dy };
}

/** Right pane: dense irregular cloud around the pane’s center (not circular). */
function randomScatterSplitRight(innerW, innerH) {
  const left = innerW * 0.5;
  const w = innerW - left;
  const cx = left + w * 0.5;
  const cy = innerH * (0.42 + Math.random() * 0.16);
  const spread = Math.min(w, innerH) * (0.1 + Math.random() * 0.06);
  return randomNucleusNear(cx, cy, spread, spread * (0.85 + Math.random() * 0.2));
}

/** Finale gutters: two separate nuclei (left strip / right strip), never one blob on the right. */
function randomScatterSplitGutters(innerW, innerH) {
  const gap = 0.38;
  const gutterW = innerW * (1 - gap) * 0.5;
  const leftCx = gutterW * 0.5;
  const rightCx = innerW - gutterW * 0.5;
  const cy = innerH * (0.38 + Math.random() * 0.24);
  const spread = Math.min(gutterW, innerH) * (0.09 + Math.random() * 0.05);
  const useLeft = Math.random() < 0.5;
  const cx = useLeft ? leftCx : rightCx;
  return randomNucleusNear(cx, cy, spread, spread * (0.9 + Math.random() * 0.15));
}

function randomScatterPoint(innerW, innerH, layout = "full") {
  if (layout === "splitRight") {
    return randomScatterSplitRight(innerW, innerH);
  }
  if (layout === "splitSides") {
    const w2 = innerW * 0.5;
    const left = Math.random() < 0.5;
    return {
      rx: left ? Math.random() * w2 : w2 + Math.random() * w2,
      ry: Math.random() * innerH,
    };
  }
  if (layout === "splitGutters") {
    return randomScatterSplitGutters(innerW, innerH);
  }
  return {
    rx: Math.random() * innerW,
    ry: Math.random() * innerH,
  };
}

function layoutXOffset(innerW, layout) {
  return layout === "splitRight" ? innerW * 0.25 : 0;
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
  /** Bumps scatter re-seed when the story portrait chapter changes. */
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
  /** Synced in RAF — when chapter/layout changes, re-seed split scatter once phase is `scatter`. */
  const scatterLayoutKeyAppliedRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [hint, setHint] = useState(true);

  useEffect(() => {
    onReadyStateChange?.(status);
  }, [status, onReadyStateChange]);

  useEffect(() => {
    if (!storyMode) scatterLayoutKeyAppliedRef.current = null;
  }, [storyMode]);

  /** RAF loop mounts once — keep latest visual props here to avoid stale closures */
  const visualRef = useRef({
    scatterAlphaScale,
    particleColorRgb,
    backgroundRgb,
    scrollY: 0,
    _lastScrollY: 0,
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

    const innerW = window.innerWidth;
    const innerH = window.innerHeight;
    const dpr = dprRef.current;
    const s = stateRef.current;
    const { particles, phase, animStart, duration } = s;
    const n = particles.length;
    if (n === 0) return;

    const lw = s.layoutSvgW ?? 1168;
    const lh = s.layoutSvgH ?? 880;

    const elapsed = timeMs - animStart;
    const rawT =
      phase === "scatter" || phase === "image"
        ? 1
        : Math.min(1, elapsed / duration);
    const easeMode = visualRef.current.storyToImageEase ?? "easeInOutCubic";
    const t =
      phase === "toImage"
        ? easeToImageByMode(easeMode, rawT)
        : easeOutCubic(rawT);

    const {
      scatterAlphaScale: sas,
      particleColorRgb: pcr,
      backgroundRgb: bgr,
      particleLayout: playout,
    } = visualRef.current;
    const ox = layoutXOffset(innerW, playout || "full");
    const portraitPhase = phase === "image" || phase === "toImage";
    const scatterPulse = 0.62 + 0.28 * Math.sin(timeMs * 0.0009);
    const alpha = portraitPhase ? 1 : scatterPulse * sas;

    const pointDiameterPx = portraitPhase
      ? particlePortraitConfig.portraitDotRadius * 2
      : particlePortraitConfig.scatterDotRadius * 2;

    // Story split layouts + finale full-screen burst: re-seed on chapter/layout change.
    if (phase === "scatter") {
      const layoutNow = playout || "full";
      const sm = visualRef.current.storyMode;
      const burst = visualRef.current.finaleScatterBurst;
      const needsReseed =
        sm &&
        (layoutNow === "splitRight" ||
          layoutNow === "splitGutters" ||
          (layoutNow === "full" && burst));
      if (needsReseed) {
        const pk = visualRef.current.portraitStoryKey ?? 0;
        const scatterKey = burst ? `finale-burst|${pk}|full` : `${pk}|${layoutNow}`;
        if (scatterLayoutKeyAppliedRef.current !== scatterKey) {
          scatterLayoutKeyAppliedRef.current = scatterKey;
          for (let i = 0; i < n; i++) {
            const p = particles[i];
            const sc = randomScatterPoint(innerW, innerH, layoutNow);
            p.rx = sc.rx;
            p.ry = sc.ry;
            p.x = sc.rx;
            p.y = sc.ry;
            p.sx = sc.rx;
            p.sy = sc.ry;
          }
          visualRef.current._lastScrollY = visualRef.current.scrollY ?? 0;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      let x = p.x;
      let y = p.y;

      if (phase === "toImage") {
        const end = layoutTarget(p.nx, p.ny, innerW, innerH, lw, lh);
        x = p.sx + (end.x + ox - p.sx) * t;
        y = p.sy + (end.y - p.sy) * t;
        p.x = x;
        p.y = y;
      } else if (phase === "toScatter") {
        x = p.sx + (p.rx - p.sx) * t;
        y = p.sy + (p.ry - p.sy) * t;
        p.x = x;
        p.y = y;
      } else if (phase === "scatter") {
        const layoutNow = playout || "full";
        const sm = visualRef.current.storyMode;
        const storySplitRight = sm && layoutNow === "splitRight";
        const storySplitGutters = sm && layoutNow === "splitGutters";

        if (storySplitRight || storySplitGutters) {
          const sy = visualRef.current.scrollY ?? 0;
          const lastSy = visualRef.current._lastScrollY ?? sy;
          const dSy = sy - lastSy;
          visualRef.current._lastScrollY = sy;

          const oxPull = layoutXOffset(innerW, "splitRight");
          const prefill = storySplitRight
            ? Math.min(1, Math.max(0, visualRef.current.scatterPrefillT ?? 0))
            : 0;

          if (prefill > 0.004) {
            const end = layoutTarget(p.nx, p.ny, innerW, innerH, lw, lh);
            const ease = prefill * prefill * (1.4 - prefill * 0.35);
            const step = 0.055 + ease * 0.32;
            p.x += (end.x + oxPull - p.x) * step;
            p.y += (end.y - p.y) * step;
            p.rx = p.x;
            p.ry = p.y;
          }

          if (!visualRef.current.finaleScatterBurst && Math.abs(dSy) > 0.06) {
            const mag = Math.min(Math.sqrt(Math.abs(dSy)) * 0.38, 4.2);
            const jx = Math.sin(p.seed * 2.618 + sy * 0.002);
            const jy = Math.cos(p.seed * 1.902 + sy * 0.002);
            p.x += jx * mag * (storySplitGutters ? 0.48 : 0.52);
            p.y += jy * mag * 0.4;
            p.rx = p.x;
            p.ry = p.y;
          }
          x = p.x;
          y = p.y;
        } else {
          const burst = visualRef.current.finaleScatterBurst;
          const wobble = burst ? 0.12 : 0.35;
          x += Math.sin(timeMs * 0.0007 + p.seed) * wobble;
          y += Math.cos(timeMs * 0.00055 + p.seed * 1.3) * wobble;
        }
      } else if (phase === "image") {
        const end = layoutTarget(p.nx, p.ny, innerW, innerH, lw, lh);
        p.x = end.x + ox;
        p.y = end.y;
        x = p.x;
        y = p.y;
      }

      positions[i * 2] = x;
      positions[i * 2 + 1] = y;
    }

    gl.clearColor(bgr[0], bgr[1], bgr[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderer.draw(positions, n, [innerW, innerH], dpr, pointDiameterPx, alpha, pcr);

    if (phase === "toImage" && rawT >= 1) {
      s.phase = "image";
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const end = layoutTarget(p.nx, p.ny, innerW, innerH, lw, lh);
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

  const beginImageTransitionFromCurrent = useCallback(() => {
    const s = stateRef.current;
    if (s.particles.length === 0) return;
    // Entering a new chapter from the previous image runs beginScatter first (phase → toScatter).
    // If scroll crosses the morph threshold before that animation finishes, we must not bail out:
    // the story effect does not re-run on scrollY, so the silhouette would never start (alternating chapters).
    if (s.phase === "toScatter") {
      for (let i = 0; i < s.particles.length; i++) {
        const p = s.particles[i];
        p.x = p.rx;
        p.y = p.ry;
      }
      s.phase = "scatter";
    }
    const now = performance.now();
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];
      p.sx = p.x;
      p.sy = p.y;
    }
    s.phase = "toImage";
    const dur = visualRef.current.storyToImageDurationMs;
    const storyDefault = particlePortraitConfig.storyChapterToImageMs ?? 4000;
    s.duration =
      typeof dur === "number" && dur > 0
        ? dur
        : visualRef.current.storyMode
          ? storyDefault
          : 2600;
    s.animStart = now;
  }, []);

  const beginPortraitTransition = useCallback((allowInterrupt) => {
    const s = stateRef.current;
    const { particles, phase } = s;
    if (particles.length === 0) return;
    if (phase === "toImage" || phase === "toScatter") return;
    if (!allowInterrupt && phase !== "scatter") return;
    beginImageTransitionFromCurrent();
  }, [beginImageTransitionFromCurrent]);

  const beginScatterTransition = useCallback((allowInterrupt) => {
    const s = stateRef.current;
    const innerW = window.innerWidth;
    const innerH = window.innerHeight;
    const { particles, phase } = s;
    if (particles.length === 0) return;
    if (phase === "scatter" || phase === "toScatter") return;
    if (!allowInterrupt && phase !== "image") return;
    const now = performance.now();
    const layout = visualRef.current.particleLayout || "full";
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.sx = p.x;
      p.sy = p.y;
      const sc = randomScatterPoint(innerW, innerH, layout);
      p.rx = sc.rx;
      p.ry = sc.ry;
    }
    s.phase = "toScatter";
    s.animStart = now;
  }, []);

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
        const count = particlePortraitConfig.particleCount;
        let nxny;
        if (storyMode) {
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
          nxny = seedNxny;
          stateRef.current.layoutSvgW = seedMeta.svgW;
          stateRef.current.layoutSvgH = seedMeta.svgH;
        } else {
          const single = await loadParticleTargets(count);
          if (cancelled) return;
          nxny = single.nxny;
          stateRef.current.layoutSvgW = single.svgW;
          stateRef.current.layoutSvgH = single.svgH;
          beatsRef.current = null;
          metaRef.current = null;
        }
        if (cancelled) return;

        if (nxny.length === 0) {
          setStatus("error");
          return;
        }

        positionsRef.current = new Float32Array(nxny.length * 2);

        const innerW = window.innerWidth;
        const innerH = window.innerHeight;
        const particles = [];
        for (let i = 0; i < nxny.length; i++) {
          const { nx, ny } = nxny[i];
          const sc = randomScatterPoint(innerW, innerH, "full");
          particles.push({
            nx,
            ny,
            x: sc.rx,
            y: sc.ry,
            rx: sc.rx,
            ry: sc.ry,
            sx: sc.rx,
            sy: sc.ry,
            seed: Math.random() * Math.PI * 2,
          });
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
            backgroundRgb[1] * 255
          )}, ${Math.round(backgroundRgb[2] * 255)})`,
        }}
      />
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-sans text-sm text-white/50">
          Loading particle targets…
        </div>
      )}
      {status === "webgl-error" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-sans text-sm text-amber-200/95">
          WebGL2 is required for particle rendering. Enable hardware acceleration or update your browser,
          then reload.
        </div>
      )}
      {status === "error" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-sans text-sm text-red-300/90">
          Could not load particle data. Check <code className="mx-1">public/target.svg</code> and{" "}
          <code className="mx-1">app/config/particlePortrait.config.js</code>, or run{" "}
          <code className="mx-1">npm run generate:particles</code>.
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
