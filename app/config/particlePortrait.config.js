/**
 * Sachin / Kohli story — WebGL2 point sprites. Targets: `public/particle-targets.json` (v2 beats).
 */

/** Default beat dots (non–portrait-mode chapters if any). */
export const particleThemeColorRgb = [184 / 255, 184 / 255, 187 / 255];

/** Portrait scatter — dim, near canvas bg. */
export const scatterAmbientParticleColorRgb = [62 / 255, 64 / 255, 72 / 255];

/** Opening header line. */
export const openingHeaderDotColorRgb = [113 / 255, 113 / 255, 122 / 255];

/** Canvas clear — `--bg-primary` */
export const particleBackgroundRgb = [10 / 255, 10 / 255, 15 / 255];

export const particlePortraitConfig = {
  particleCount: 200000,

  portraitDotRadius: 0.0001,

  scatterDotRadius: 0.0045,
  scatterPerParticleAlpha: 0.42,
  scatterGlobalAlpha: 0.32,

  /** `flowRibbon` — central ring + two Bézier arms + curl noise (GIF-like). `svgStructure` — mask from SVG. */
  scatterLayoutPreset: "flowRibbon",

  /** Used when `scatterLayoutPreset` is not `flowRibbon`. */
  scatterMotionPreset: "orchestrated",

  /**
   * Scroll drives a **smoothed** time multiplier only (no raw velocity → no jerks).
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
  storyFinaleToImageMs: 2900,
  chapterMorphStaggerSpread: 0.42,

  openingScatterAlpha: 1,
  particlesFormImageOnlyInFinale: true,

  /** Softer overlap reads closer to smoke / mist (matches reference GIF). */
  scatterAdditiveBlend: true,
};
