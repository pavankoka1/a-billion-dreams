import { useMemo } from "react";
import { CHAPTER_TARGET_BEATS, STORY_CONFIG } from "@/lib/cricketParticleStory";

/** First fraction of each portrait chapter: scatter only (no silhouette morph yet). */
export const PORTRAIT_SCATTER_PREFIX = 0.275;

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function chapterBandU(k, j) {
  if (j === 0) return null;
  const lo = j - 0.5;
  const hi = j + 0.5;
  if (k < lo || k >= hi) return null;
  return (k - lo) / (hi - lo);
}

/**
 * Derives right-side particle portrait inputs from scroll index `k` and active story chapter.
 * Keeps band math (hold vs morph) in one place so canvas props stay aligned with scroll.
 */
export function useStoryPortraitScroll({
  sliceK,
  storyChapterIndex,
  isFinaleScroll,
  finalePhase,
  /** `clamp(k − (n−1), 0, 1)` on the finale segment — drives scatter-then-form. */
  finaleScrollU = 0,
  /** Upper bound of finale u where particles fill the screen before duo morph (e.g. 0.78). */
  finaleImageScatterEndU = 0.78,
  chapterCount,
  firstImageChapter = STORY_CONFIG.firstImageChapter,
}) {
  const lastChapterIndex = chapterCount - 1;
  const firstImage = firstImageChapter;

  const portraitMode = storyChapterIndex >= firstImage;

  const portraitBandU = useMemo(() => {
    if (!portraitMode) return null;
    const j = storyChapterIndex;
    if (j < firstImage || j >= lastChapterIndex) return null;
    return chapterBandU(sliceK, j);
  }, [portraitMode, storyChapterIndex, firstImage, lastChapterIndex, sliceK]);

  const portraitHoldScatter =
    portraitBandU !== null && portraitBandU < PORTRAIT_SCATTER_PREFIX;

  /** Title / body / fade — no duo target yet. */
  const finaleTextScatterOnly = useMemo(() => {
    if (!isFinaleScroll) return false;
    return finalePhase !== "image";
  }, [isFinaleScroll, finalePhase]);

  /** After copy is gone: full-screen starfield before the duo pulls together. */
  const finaleImageScatterBurst = useMemo(() => {
    if (!isFinaleScroll || finalePhase !== "image") return false;
    return finaleScrollU < finaleImageScatterEndU;
  }, [isFinaleScroll, finalePhase, finaleScrollU, finaleImageScatterEndU]);

  const scatterHold =
    finaleTextScatterOnly || finaleImageScatterBurst || portraitHoldScatter;

  const targetBeatId = useMemo(() => {
    if (!portraitMode) return null;
    if (isFinaleScroll) {
      if (finalePhase !== "image") return null;
      return CHAPTER_TARGET_BEATS[lastChapterIndex] ?? "duo_finale";
    }
    return CHAPTER_TARGET_BEATS[storyChapterIndex] ?? "duo_finale";
  }, [portraitMode, isFinaleScroll, finalePhase, storyChapterIndex, lastChapterIndex]);

  const scatterPrefillT = useMemo(() => {
    if (!portraitHoldScatter || portraitBandU === null) return 0;
    return clamp(portraitBandU / PORTRAIT_SCATTER_PREFIX, 0, 1);
  }, [portraitHoldScatter, portraitBandU]);

  const particleLayout = useMemo(() => {
    if (!portraitMode) return "full";
    if (
      storyChapterIndex >= lastChapterIndex &&
      isFinaleScroll &&
      finalePhase === "image"
    ) {
      return "full";
    }
    if (storyChapterIndex >= lastChapterIndex) return "splitGutters";
    return "splitRight";
  }, [portraitMode, storyChapterIndex, lastChapterIndex, isFinaleScroll, finalePhase]);

  /** Bumps when scroll crosses the portrait hold boundary — optional prop for particle sync. */
  const portraitBandEpoch = useMemo(() => {
    if (portraitBandU === null) return 0;
    return portraitHoldScatter ? 0 : 1;
  }, [portraitBandU, portraitHoldScatter]);

  /** Bumps when finale scroll crosses from full-screen scatter into duo formation. */
  const finaleImageFormEpoch = useMemo(() => {
    if (!isFinaleScroll || finalePhase !== "image") return 0;
    return finaleScrollU >= finaleImageScatterEndU ? 1 : 0;
  }, [isFinaleScroll, finalePhase, finaleScrollU, finaleImageScatterEndU]);

  return {
    portraitMode,
    portraitBandU,
    portraitHoldScatter,
    scatterHold,
    targetBeatId,
    scatterPrefillT,
    particleLayout,
    portraitBandEpoch,
    finaleImageFormEpoch,
    finaleScatterBurst: finaleImageScatterBurst,
  };
}
