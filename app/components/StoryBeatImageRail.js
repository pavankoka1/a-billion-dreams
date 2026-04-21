"use client";

import { particlePortraitConfig } from "@/config/particlePortrait.config";
import {
  CHAPTER_TARGET_BEATS,
  STORY_CHAPTER_VISUAL_SRC,
  STORY_CONFIG,
} from "@/lib/cricketParticleStory";

/**
 * Clip path vs scroll `reveal` ∈ [0,1]. `rem = 1 - reveal` = how much “mystery” remains.
 */
function storyBeatRailClipPath(rem, mode, topInsetMaxPct) {
  const r = Math.max(0, Math.min(1, rem));
  if (mode === "none") return "none";
  if (mode === "curtain") {
    const side = r * 50;
    return `inset(0 ${side}% 0 ${side}%)`;
  }
  if (mode === "gate") {
    const v = r * 50;
    return `inset(${v}% 0 ${v}% 0)`;
  }
  return `inset(${r * topInsetMaxPct}% 0 0 0)`;
}

/**
 * Chapter band progress from scroll index `k` (same geometry as `useStoryPortraitScroll` / copy opacity).
 * Lets the rail track scroll even if `portraitBandU` from the hook is null during edge frames.
 */
function scrollBandU(k, chapterIndex) {
  if (chapterIndex == null || chapterIndex < 1) return null;
  const lo = chapterIndex - 0.5;
  const hi = chapterIndex + 0.5;
  if (k < lo || k >= hi) return null;
  return (k - lo) / (hi - lo);
}

function railRevealPreset(cfg, beatId) {
  const defaults = {
    clipMode: cfg.storyBeatRailRevealClipMode ?? "curtain",
    topInsetMaxPct: cfg.storyBeatRailRevealTopInsetMaxPct ?? 28,
    blurMaxPx: cfg.storyBeatRailRevealBlurMaxPx ?? 0,
    brightnessMin: cfg.storyBeatRailRevealBrightnessMin ?? 1,
    scaleMin: cfg.storyBeatRailRevealScaleMin ?? 1,
    completeU: cfg.storyBeatRailRevealCompleteU ?? 1,
    driftMax: cfg.storyBeatRailRevealDriftMax ?? 4,
    opacityOnly: false,
  };
  const o = cfg.storyBeatRailRevealByBeat?.[beatId];
  return o ? { ...defaults, ...o } : defaults;
}

/**
 * Right column: chapter artwork above the particle canvas (stage z-index > .story-canvas).
 * Reveal: clip + blur/brightness/scale vs scroll — per-beat presets in `particlePortrait.config.js`.
 */
export default function StoryBeatImageRail({
  storyChapterIndex,
  portraitBandU,
  /** Document scroll index `k` (same as `slice.k` in CricketParticleStory) — drives band `u` for reveal. */
  storyScrollK,
  copyOpacity,
  reducedMotion,
}) {
  const first = STORY_CONFIG.firstImageChapter;
  const beatId = CHAPTER_TARGET_BEATS[storyChapterIndex];
  const src =
    beatId && storyChapterIndex < CHAPTER_TARGET_BEATS.length - 1
      ? STORY_CHAPTER_VISUAL_SRC[beatId]
      : null;

  if (!src || storyChapterIndex < first) return null;

  const rawU = Number.isFinite(storyScrollK)
    ? (scrollBandU(storyScrollK, storyChapterIndex) ?? portraitBandU)
    : portraitBandU;
  const u =
    rawU === null || rawU === undefined ? 0.55 : Math.min(1, Math.max(0, rawU));

  const cfg = particlePortraitConfig;
  const p = railRevealPreset(cfg, beatId);

  /** Stretch first `completeU` of the chapter band so the image finishes sharp earlier (then holds). */
  const completeU = Math.min(1, Math.max(0.06, p.completeU ?? 1));
  const uScaled = completeU >= 0.999 ? u : Math.min(1, u / completeU);
  const revealVis = reducedMotion ? 1 : 0.08 + 0.92 * uScaled * uScaled;

  const rem = 1 - revealVis;
  const opacityOnly = p.opacityOnly === true || reducedMotion;

  const clipPath = opacityOnly
    ? "none"
    : storyBeatRailClipPath(rem, p.clipMode, p.topInsetMaxPct);

  const blurPx = opacityOnly ? 0 : rem * p.blurMaxPx;
  const brightness = opacityOnly
    ? 1
    : p.brightnessMin + (1 - p.brightnessMin) * revealVis;
  const breathe = opacityOnly ? 0 : 0.028 * Math.sin(revealVis * Math.PI);
  const baseScale = opacityOnly ? 1 : p.scaleMin + (1 - p.scaleMin) * revealVis;
  const scale = baseScale * (1 + breathe);
  const drift = opacityOnly ? 0 : (1 - revealVis) * p.driftMax;

  const filterParts = [];
  if (!opacityOnly && blurPx >= 0.05) {
    filterParts.push(`blur(${blurPx}px)`);
  }
  if (!opacityOnly && Math.abs(brightness - 1) > 0.001) {
    filterParts.push(`brightness(${brightness})`);
  }
  const filter = filterParts.length > 0 ? filterParts.join(" ") : undefined;
  const isPakStandoff = beatId === "sachin_pak_standoff";

  /**
   * Beats that render with the cinematic vignette frame.
   *
   * Structure — a **single transformed element** (`__vignette-reveal`) holds every scroll-linked
   * style (clipPath, filter, scale, drift%). Img and overlay sit inside it with no transforms of
   * their own, so browsers can't sub-pixel-drift two siblings against each other — the mask is
   * guaranteed in lockstep with the photo.
   *
   *   <wrap>                 -- sizing, opacity, optional px drift
   *     <reveal>             -- scroll-linked clipPath / filter / scale / drift%
   *       <img/>             -- no inline transforms
   *       <overlay/>         -- only the vignette intensity var
   */
  const useVignetteFrame =
    isPakStandoff || beatId === "sachin_drive" || beatId === "kohli_carry";

  /** Pak: subtle Y drift (px) from scroll — layered on the wrap, not the reveal element. */
  const pakDriftPx =
    opacityOnly && isPakStandoff && !reducedMotion ? (1 - revealVis) * 16 : 0;

  const baseTransform = opacityOnly
    ? undefined
    : `translate3d(0, ${drift}%, 0) scale(${scale})`;

  const opacity = Math.min(1, (copyOpacity ?? 1) * (0.5 + 0.5 * revealVis));

  const vignetteBase = cfg.storyBeatRailVignetteIntensity ?? 1;
  const vignetteIntensity = Math.max(
    0,
    beatId === "kohli_carry" ? vignetteBase * 0.5 : vignetteBase,
  );

  /** Non-vignette beats: the img keeps carrying everything (legacy path, untouched). */
  const legacyImgStyle = {
    opacity,
    clipPath,
    filter,
    transform: baseTransform,
  };

  /** Vignette beats: every reveal style moves to the inner `__vignette-reveal` element. */
  const revealStyle = useVignetteFrame
    ? { clipPath, filter, transform: baseTransform }
    : undefined;

  /** Wrap: sizing + opacity + pak px drift. Stays static in scale so it matches the img box. */
  const wrapStyle = useVignetteFrame
    ? {
        opacity,
        transform:
          pakDriftPx > 0.25
            ? `translate3d(0, ${pakDriftPx}px, 0)`
            : undefined,
        willChange: "opacity, transform",
      }
    : undefined;

  const overlayStyle = useVignetteFrame
    ? { "--vignette-intensity": vignetteIntensity }
    : undefined;

  const imgProps = {
    src,
    className: `story-beat-rail__img story-beat-rail__img--beat-${beatId}`,
    style: useVignetteFrame ? undefined : legacyImgStyle,
    draggable: false,
  };

  return (
    <div className="story-beat-rail" aria-hidden>
      {useVignetteFrame ? (
        <div
          key={beatId}
          className={`story-beat-rail__vignette-wrap story-beat-rail__vignette-wrap--beat-${beatId}`}
          style={wrapStyle}
        >
          <div
            className="story-beat-rail__vignette-reveal"
            style={revealStyle}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local artwork from /public */}
            <img alt="" {...imgProps} />
            <div
              className="story-beat-rail__vignette-overlay"
              style={overlayStyle}
              aria-hidden
            />
          </div>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- local artwork from /public */
        <img key={beatId} alt="" {...imgProps} />
      )}
    </div>
  );
}
