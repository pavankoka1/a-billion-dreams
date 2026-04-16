/**
 * Particle portrait — density, dot size, and **dot colors** (all RGB 0–1).
 *
 * Rendering uses WebGL2 point sprites. Target positions load from `public/particle-targets.json`
 * (v2 = multiple story beats via `public/story-beats.manifest.json`; run `npm run generate:particles`)
 * or fall back to IndexedDB / localStorage / live SVG sample (slow).
 *
 * Radii are in CSS pixels (shader point diameter = 2 × radius). Large `particleCount` costs CPU per frame.
 */

/** Default story beat dots — purple-blue accent (matches earlier react-rerender styling). */
export const particleThemeColorRgb = [184 / 255, 184 / 255, 187 / 255];

/**
 * Opening section + fixed header “A Billion Dreams” — matches `text-zinc-500` (#71717a).
 * Change this to retint opening / hero dots without touching components.
 */
export const openingHeaderDotColorRgb = [113 / 255, 113 / 255, 122 / 255];

/** Canvas clear — `--bg-primary` */
export const particleBackgroundRgb = [10 / 255, 10 / 255, 15 / 255];

export const particlePortraitConfig = {
  /** Total dots sampling the SVG outlines */
  particleCount: 200000,

  /** Dot “radius” (half diameter) when the portrait is shown */
  portraitDotRadius: 0.0001,

  /** Dot “radius” in the scattered starfield */
  scatterDotRadius: 0.1,

  /**
   * Story: nucleus → silhouette morph duration when no per-call override is passed.
   * Slightly long so the settle feels smooth, not rushed.
   */
  storyChapterToImageMs: 4000,

  /**
   * Finale duo pull-in — shorter and punchier than chapter beats for a stronger close.
   */
  storyFinaleToImageMs: 2900,
};
