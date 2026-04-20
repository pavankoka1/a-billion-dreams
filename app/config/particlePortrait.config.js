/**
 * Sachin / Kohli story — WebGL2 point sprites. Targets: `public/particle-targets.json` (v2 beats).
 */

/** Default beat dots (non–portrait-mode chapters if any). */
export const particleThemeColorRgb = [204 / 255, 204 / 255, 207 / 255];

/** Portrait scatter — dim, near canvas bg. */
export const scatterAmbientParticleColorRgb = [62 / 255, 64 / 255, 72 / 255];

/** Opening header line. */
export const openingHeaderDotColorRgb = [113 / 255, 113 / 255, 122 / 255];

/** Canvas clear — `--bg-primary` */
export const particleBackgroundRgb = [10 / 255, 10 / 255, 15 / 255];

export const particlePortraitConfig = {
  particleCount: 200000,

  portraitDotRadius: 0.01,

  scatterDotRadius: 0.0045,
  scatterPerParticleAlpha: 0.42,
  scatterGlobalAlpha: 0.32,

  /** `flowRibbon` — central ring + two Bézier arms + curl noise (GIF-like). `svgStructure` — mask from SVG. */
  scatterLayoutPreset: "flowRibbon",

  /** Used when `scatterLayoutPreset` is not `flowRibbon`. */
  scatterMotionPreset: "orchestrated",

  /**
   * When true, scatter motion is **wall-clock only**: scroll does not change animation pace or wing phase.
   * Story chapters and the finale duo morph still follow scroll (`CricketParticleStory` / `useStoryPortraitScroll`).
   */
  scatterAutonomousTimeOnly: true,

  /**
   * Scroll drives a **smoothed** time multiplier only (no raw velocity → no jerks).
   * Used only when `scatterAutonomousTimeOnly` is false.
   * Capped input → two low-passes → intensity → lerp `scatterScrollPaceMinMul` … `scatterScrollPaceMaxMul`.
   */
  scatterScrollInputCapPx: 44,
  scatterScrollFastRetain: 0.88,
  scatterScrollSlowRetain: 0.974,
  scatterScrollPaceRefPx: 36,
  scatterScrollPaceMinMul: 1,
  scatterScrollPaceMaxMul: 1.5,
  scatterScrollPaceLerpUp: 0.15,
  scatterScrollPaceLerpDown: 0.06,

  scatterScrollPhaseScale: 0.0032,

  /** With `scatterAutonomousTimeOnly` + orchestrated motion: emulates scroll-pixel drift for wing phase (px/ms). */
  scatterAutonomousPhaseEmuPerMs: 0.028,

  scatterWingVertAmp: 0.048,
  scatterWingFreq: 0.6,
  scatterWingPhaseSplit: 0.38,
  scatterNucleusBreathAmp: 0.0085,

  /** Flow-ribbon field (see `app/lib/flowRibbonField.js`). */
  flowRibbonRingShare: 0.28,
  flowRibbonRingMeanNorm: 0.11,
  flowRibbonRingThicknessNorm: 0.044,
  flowRibbonRotateSpeed: 0.42,
  flowRibbonFlowSpeed: 0.055,
  flowRibbonRibbonWidthNorm: 0.052,
  flowRibbonRibbonMeander: 0.07,
  flowRibbonNoiseAmp: 0.078,
  flowRibbonNoiseScale: 0.0072,
  flowRibbonNoiseTimeScale: 1.05,
  flowRibbonCoreAttach: 0.07,

  scatterExcludeBottomRightNorm: { w: 0.28, h: 0.22 },
  scatterZoneBands: { leftMax: 0.34, rightMin: 0.66 },
  scatterStructureJitterPx: 0,

  portraitLayoutZoom: 1,

  scatterStructureSvg: "/grok-scatter-structure.svg",
  scatterStructureMaxRasterSide: 720,
  scatterStructureLumaMin: 40,

  storyChapterToImageMs: 4000,

  /** Duo Virat & Sachin — morph length from flat scatter → final portrait. */
  storyFinaleToImageMs: 1400,

  /**
   * When `true`, the duo morph is an elegant per-particle travel: random (not radial) stagger so no
   * silhouette-wipe is visible, a perpendicular Bézier-style arc for graceful crossing paths, and a
   * smooth S-curve ease. The transition is intriguing but **never** forms an intermediate structure.
   */
  finaleMorphDirect: true,

  /** Max delay before a particle starts travelling, as a fraction of total duration. */
  finaleMorphStaggerSpread: 0.32,

  /** Perpendicular arc amplitude, as a fraction of min(innerW, innerH). */
  finaleMorphArcScale: 0.055,

  /** Transition length for the "uniform flat scatter" re-seed tween (ms). */
  finaleFlatScatterInMs: 900,

  /** Legacy non-direct morph path (unused when `finaleMorphDirect` is on). */
  finaleMorphRadialWeight: 0.72,
  finaleMorphRadialMaxFrac: 0.52,
  finaleMorphBreatheScale: 1.38,
  finaleMorphSwirlNorm: 0.0025,

  chapterMorphStaggerSpread: 0.42,

  /**
   * `StoryBeatImageRail` defaults (merged with `storyBeatRailRevealByBeat[beatId]`).
   * Blur + brightness + mask; **clipMode**: `curtain` | `gate` | `top` | `none`.
   */
  storyBeatRailRevealClipMode: "curtain",
  storyBeatRailRevealTopInsetMaxPct: 28,
  storyBeatRailRevealBlurMaxPx: 11,
  storyBeatRailRevealBrightnessMin: 0.5,
  storyBeatRailRevealScaleMin: 0.93,
  /** Max vertical drift % at low reveal (`(1 − reveal) * driftMax`). */
  storyBeatRailRevealDriftMax: 4,

  /**
   * When `portraitBandU` reaches this fraction (0–1), the **image** is fully revealed (clip/blur/scale done).
   * Later scroll in the same chapter keeps the picture sharp so readers can study it (e.g. 0.65–0.72).
   */
  storyBeatRailRevealCompleteU: 0.68,

  /**
   * Master multiplier for the `#0a0a0f` edge vignette on vignette-framed beats
   * (`sachin_pak_standoff`, `sachin_drive`). Piped into the `--vignette-intensity` CSS var
   * consumed by `.story-beat-rail__vignette-overlay` — scales every alpha in the gradient +
   * inset box-shadow stack.
   *
   *   1.0  → current baseline
   *   <1   → softer / lighter frame
   *   >1   → heavier / more cinematic (clamp at ~1.6 — alphas cap at 1.0 anyway)
   */
  storyBeatRailVignetteIntensity: 1.5,

  /**
   * Per beat id (`CHAPTER_TARGET_BEATS`): partial overrides. Omitted keys use defaults above.
   * Set `opacityOnly: true` to skip clip/blur/brightness/scale/drift — only scroll-linked opacity (see `StoryBeatImageRail`).
   */
  storyBeatRailRevealByBeat: {
    sachin_struggle: {
      clipMode: "curtain",
      completeU: 0.66,
      blurMaxPx: 12,
      brightnessMin: 0.48,
    },
    sachin_drive: {
      clipMode: "gate",
      completeU: 0.64,
      blurMaxPx: 9,
      scaleMin: 0.91,
    },
    /** No clip / blur / scale / drift — avoids mask+GPU fringe “white lines” on scroll; opacity still follows scroll. */
    sachin_pak_standoff: {
      opacityOnly: true,
      completeU: 0.7,
    },
    kohli_fire: {
      clipMode: "curtain",
      completeU: 0.65,
      blurMaxPx: 14,
      brightnessMin: 0.44,
    },
    kohli_carry: {
      clipMode: "gate",
      completeU: 0.67,
      blurMaxPx: 8,
      driftMax: 3,
    },
  },

  openingScatterAlpha: 1,
  particlesFormImageOnlyInFinale: true,

  /** Softer overlap reads closer to smoke / mist (matches reference GIF). */
  scatterAdditiveBlend: true,
};
