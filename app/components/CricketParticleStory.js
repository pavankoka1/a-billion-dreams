"use client";

import {
  openingHeaderDotColorRgb,
  particleBackgroundRgb,
  particlePortraitConfig,
  particleThemeColorRgb,
  scatterAmbientParticleColorRgb,
} from "@/config/particlePortrait.config";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PORTRAIT_SCATTER_PREFIX,
  useStoryPortraitScroll,
} from "../hooks/useStoryPortraitScroll";
import {
  STORY_CHAPTER_VISUAL_SRC,
  STORY_CONFIG,
  storyChapters,
} from "../lib/cricketParticleStory";
import ParticlePortrait from "./ParticlePortrait";
import StoryBeatImageRail from "./StoryBeatImageRail";
import StoryLoadingOverlay from "./StoryLoadingOverlay";
import StoryWatcherProgress from "./StoryWatcherProgress";

/**
 * Within each chapter’s scroll band, `u` ∈ [0, 1] is split sequentially (must sum to 1):
 * 1) fade in — opacity 0→1, words frozen
 * 2) words — opacity 1, word-by-word progress
 * 3) fade out — opacity 1→0, words complete
 */
const SCROLL_FADE_IN = 0.12;
const SCROLL_WORDS = 0.58;
const SCROLL_FADE_OUT = 0.3;

/** Opening: full-opacity “land” band before scroll-driven phases begin. */
const OPENING_LANDING_K = 0.035;

/**
 * Finale scroll (u = k − (n−1), k ≥ n−1):
 * - 0 → morphStart: text animates while particles stay scattered behind it
 * - morphStart → 1: scroll-scrubbed duo morph progression
 */
/** Text opacity 0→1 from u=0 → `FADEIN_END` (matches regular chapters' fade-in feel). */
const FINALE_U_MORPH_START = Math.min(
  0.95,
  Math.max(0.05, particlePortraitConfig.storyFinaleMorphStartU ?? 0.2),
);
const FINALE_U_FADEIN_END = Math.min(0.08, FINALE_U_MORPH_START * 0.35);
/** Word color head 0→w over `[FADEIN_END, WORDS_END]` — all finale words lit well before the morph. */
const FINALE_U_WORDS_END = Math.max(
  FINALE_U_FADEIN_END + 0.01,
  FINALE_U_MORPH_START * 0.8,
);
/** Text begins fading out here so the scatter has the stage long before the morph. */
const FINALE_U_HOLD_END = FINALE_U_WORDS_END;
/** Copy fully faded — from here until the morph trigger, only the full-page scatter is on screen. */
const FINALE_U_TEXT_OUT_END = FINALE_U_MORPH_START;
/**
 * Morph trigger: particles start forming the duo after text window completes.
 */
const FINALE_U_IMAGE_SCATTER_END = FINALE_U_MORPH_START;
/** Finale chapter starts rendering (fade-in pre-roll) at `k = n - 1 - PRE_ROLL` so there's no blank gap. */
const FINALE_PRE_ROLL_K = 0.5;

/** Extra document height so the finale image phase has room (nothing after the portrait). */
const STORY_SPACER_EXTRA_VH = 140;

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

/** Opacity from phased `u` ∈ [0, 1]. */
function phasedOpacity(u, reduced) {
  if (reduced) return 1;
  const a = SCROLL_FADE_IN;
  const b = SCROLL_WORDS;
  if (u <= a) return clamp(u / a, 0, 1);
  if (u <= a + b) return 1;
  const fo = SCROLL_FADE_OUT;
  return clamp(1 - (u - a - b) / fo, 0, 1);
}

/** Word “head” (0…w) from phased `u`; words only advance in the middle segment. */
function phasedWordHead(u, w, reduced) {
  if (reduced) return 1e9;
  const a = SCROLL_FADE_IN;
  const b = SCROLL_WORDS;
  if (u <= a) return 0;
  if (u <= a + b) return clamp((u - a) / b, 0, 1) * w;
  return w;
}

/**
 * Per-chapter opacity in scroll index `k` (0…n across the document).
 * `chapterIndex` is the **story** chapter (finale is gated so it only applies once k ≥ n−1).
 */
function chapterCopyOpacity(k, chapterIndex, n, reduced, isFinaleScroll) {
  if (reduced) return 1;
  const j = chapterIndex;
  if (j === 0) {
    if (k < 0 || k >= 0.5) return 0;
    if (k <= OPENING_LANDING_K) return 1;
    const u = (k - OPENING_LANDING_K) / (0.5 - OPENING_LANDING_K);
    /** Already at full opacity on the land — skip phased fade-in to avoid a flicker when scroll starts. */
    const openFadeStart = SCROLL_FADE_IN + SCROLL_WORDS;
    if (u <= openFadeStart) return 1;
    return clamp(1 - (u - openFadeStart) / SCROLL_FADE_OUT, 0, 1);
  }
  if (j === n - 1) {
    if (isFinaleScroll) {
      const uF = clamp(k - (n - 1), 0, 1);
      /** Pre-roll (k < n−1) already took copy to 1 — hold through words + scatter. */
      if (uF < FINALE_U_HOLD_END) return 1;
      if (uF < FINALE_U_TEXT_OUT_END) {
        return clamp(
          1 -
            (uF - FINALE_U_HOLD_END) /
              (FINALE_U_TEXT_OUT_END - FINALE_U_HOLD_END),
          0,
          1,
        );
      }
      return 0;
    }
    /** Pre-roll: fade copy in across the quarter-chapter before finale scroll begins (no blank gap). */
    const preLo = n - 1 - FINALE_PRE_ROLL_K;
    if (k < preLo) return 0;
    return clamp((k - preLo) / FINALE_PRE_ROLL_K, 0, 1);
  }
  const lo = j - 0.5;
  const hi = j + 0.5;
  if (k < lo || k >= hi) return 0;
  const u = (k - lo) / (hi - lo);
  return phasedOpacity(u, reduced);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function useScrollMetrics() {
  const [scrollY, setScrollY] = useState(() =>
    typeof window !== "undefined" ? window.scrollY : 0,
  );
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 1,
  );
  const [docMax, setDocMax] = useState(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return 1;
    }
    const el = document.documentElement;
    return Math.max(1, el.scrollHeight - window.innerHeight);
  });

  const update = () => {
    setScrollY(window.scrollY);
    setViewportH(Math.max(1, window.innerHeight));
    const el = document.documentElement;
    setDocMax(Math.max(1, el.scrollHeight - window.innerHeight));
  };

  useEffect(() => {
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const el = document.documentElement;
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    const raf = requestAnimationFrame(() => update());
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollProgress = docMax > 0 ? clamp(scrollY / docMax, 0, 1) : 0;
  return { scrollY, scrollProgress, docMax, viewportH };
}

function wordColor(wordIndex, head, reduced) {
  if (reduced) return "var(--text-primary)";
  const t = head - wordIndex;
  if (t >= 0.85) return "var(--text-primary)";
  if (t >= 0.35) return "var(--text-muted)";
  return "var(--text-dim)";
}

function countScrollWords(ch) {
  let n = 0;
  for (const line of ch.lines) {
    n += line.trim().split(/\s+/).filter(Boolean).length;
  }
  if (ch.hint) n += ch.hint.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, n);
}

function countFinaleBodyWords(ch) {
  let n = 0;
  for (const line of ch.lines) {
    n += line.trim().split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, n);
}

function LitChapter({
  chapter,
  head,
  reduced,
  isFinale,
  landingEntranceOn = false,
}) {
  let wi = 0;
  const spanWord = (w, key) => {
    const i = wi;
    wi += 1;
    return (
      <span
        key={key}
        className="story-lit-word"
        style={{ color: wordColor(i, head, reduced) }}
      >
        {w}
      </span>
    );
  };

  const lineWords = (line, lineKey) => {
    const parts = line.split(/(\s+)/);
    return parts.map((part, j) => {
      if (/^\s+$/.test(part)) {
        return (
          <span key={`${lineKey}-s-${j}`} className="story-lit-space">
            {part}
          </span>
        );
      }
      return spanWord(part, `${lineKey}-w-${j}`);
    });
  };

  if (isFinale) {
    let fwi = 0;
    const fSpan = (w, key) => {
      const i = fwi;
      fwi += 1;
      return (
        <span
          key={key}
          className="story-lit-word"
          style={{ color: wordColor(i, head, reduced) }}
        >
          {w}
        </span>
      );
    };
    const fLine = (line, lineKey) => {
      const parts = line.split(/(\s+)/);
      return parts.map((part, j) => {
        if (/^\s+$/.test(part)) {
          return (
            <span key={`${lineKey}-s-${j}`} className="story-lit-space">
              {part}
            </span>
          );
        }
        return fSpan(part, `${lineKey}-w-${j}`);
      });
    };

    return (
      <div className="story-lit-finale text-center">
        {chapter.kicker ? (
          <p className="story-flip-kicker story-flip-kicker--finale story-finale-title-word">
            {fLine(chapter.kicker, "fk")}
          </p>
        ) : null}
        {chapter.title ? (
          <h2 className="story-flip-title story-flip-title--finale">
            {fLine(chapter.title, "ft")}
          </h2>
        ) : null}
        <div className="story-flip-lines story-flip-lines--block">
          {chapter.lines.map((line, i) => (
            <p
              key={`${chapter.id}-L${i}`}
              className="story-flip-line story-flip-line--finale"
              style={{ ["--fi"]: i }}
            >
              {fLine(line, `fl-${i}`)}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const opening = chapter.id === "opening";

  return (
    <div
      className={`story-lit-body text-left${
        opening
          ? ` story-lit-body--opening story-opening-landing${landingEntranceOn ? " story-opening-landing--entrance-on" : ""}`
          : ""
      }`}
    >
      {chapter.kicker ? (
        <p className="story-flip-kicker story-flip-kicker--static">
          {chapter.kicker}
        </p>
      ) : null}
      {chapter.title ? (
        <h2 className="story-flip-title story-flip-title--static">
          {chapter.title}
        </h2>
      ) : null}
      <div className="story-flip-lines story-flip-lines--block">
        {chapter.lines.map((line, i) => (
          <p key={`${chapter.id}-line-${i}`} className="story-flip-line">
            {lineWords(line, `L${i}`)}
          </p>
        ))}
      </div>
      {chapter.hint ? (
        <p className="story-flip-hint">{lineWords(chapter.hint, "h")}</p>
      ) : null}
    </div>
  );
}

export default function CricketParticleStory() {
  const { scrollY, scrollProgress, docMax, viewportH } = useScrollMetrics();
  const prefersReducedMotion = usePrefersReducedMotion();
  const firstImage = STORY_CONFIG.firstImageChapter;
  const n = storyChapters.length;
  const lastChapterIndex = n - 1;

  const [assetsReady, setAssetsReady] = useState(false);
  const [openingEntranceOn, setOpeningEntranceOn] = useState(false);
  const handleParticleStatus = useCallback((status) => {
    if (status === "ready") setAssetsReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const warmup = () => {
      if (cancelled || typeof window === "undefined") return;

      const imageUrls = Object.values(STORY_CHAPTER_VISUAL_SRC).filter(Boolean);
      for (const src of imageUrls) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }

      const staticAssets = [
        "/particle-targets.json",
        "/story-beats.manifest.json",
        "/target.svg",
        "/grok-scatter-structure.svg",
      ];
      for (const url of staticAssets) {
        fetch(url, { cache: "force-cache" }).catch(() => {});
      }
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warmup, { timeout: 1800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const t = window.setTimeout(warmup, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!assetsReady) {
      setOpeningEntranceOn(false);
      return;
    }
    if (prefersReducedMotion) {
      setOpeningEntranceOn(true);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpeningEntranceOn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [assetsReady, prefersReducedMotion]);

  /**
   * Scroll index `k` ∈ [0, n] tied to **actual** document scroll (`docMax`), not `vh` × constants.
   * That keeps chapters, copy opacity, and the `n * 200vh` spacer in sync in every layout.
   */
  const k = useMemo(() => {
    const max = Math.max(1, docMax);
    return (scrollY / max) * n;
  }, [scrollY, docMax, n]);

  const slice = useMemo(() => {
    const base = clamp(Math.floor(k), 0, n - 1);
    const t = k - base;
    return { k, base, t };
  }, [k, n]);

  const isLastSegment = slice.base >= n - 1;

  const visibleChapter = useMemo(() => {
    if (isLastSegment) return n - 1;
    return slice.t < 0.5 ? slice.base : slice.base + 1;
  }, [isLastSegment, slice, n]);

  /** Finale copy & duo beat only after k crosses n−1 (avoid “One swing” → instant duo). */
  const isFinaleScroll = slice.k >= n - 1;

  const storyChapterIndex = useMemo(() => {
    /** Let the finale chapter start rendering during its pre-roll band so there's no blank gap after kohli_carry. */
    if (
      visibleChapter === lastChapterIndex &&
      slice.k < n - 1 - FINALE_PRE_ROLL_K
    ) {
      return lastChapterIndex - 1;
    }
    return visibleChapter;
  }, [visibleChapter, lastChapterIndex, slice.k, n]);

  const currentChapter = storyChapters[storyChapterIndex];
  const finaleChapter = storyChapters[lastChapterIndex];
  const finaleBodyWordCount = useMemo(
    () => countFinaleBodyWords(finaleChapter),
    [finaleChapter],
  );

  const finalePhase = useMemo(() => {
    if (!isFinaleScroll) return null;
    const uF = clamp(slice.k - (n - 1), 0, 1);
    if (uF < FINALE_U_FADEIN_END) return "enter";
    if (uF < FINALE_U_WORDS_END) return "words";
    if (uF < FINALE_U_IMAGE_SCATTER_END) return "hold";
    return "image";
  }, [isFinaleScroll, slice.k, n]);

  const wordHead = useMemo(() => {
    if (prefersReducedMotion) {
      return 1e9;
    }
    const k = slice.k;
    const j = storyChapterIndex;

    if (isFinaleScroll) {
      const uF = clamp(k - (n - 1), 0, 1);
      if (uF <= FINALE_U_FADEIN_END) return 0;
      if (uF >= FINALE_U_WORDS_END) return finaleBodyWordCount;
      const u0 =
        (uF - FINALE_U_FADEIN_END) / (FINALE_U_WORDS_END - FINALE_U_FADEIN_END);
      return u0 * finaleBodyWordCount;
    }
    /** Pre-roll fade-in (k ∈ [n−1−FINALE_PRE_ROLL_K, n−1]) — words stay dark until real finale scroll begins. */
    if (j === lastChapterIndex) return 0;

    const w = countScrollWords(storyChapters[j]);
    if (w <= 0) return 0;

    if (j === 0) {
      if (k < 0 || k >= 0.5) return 0;
      if (k <= OPENING_LANDING_K) return 0;
      const u = (k - OPENING_LANDING_K) / (0.5 - OPENING_LANDING_K);
      const openTextEnd = SCROLL_FADE_IN + SCROLL_WORDS;
      if (u <= openTextEnd) {
        return (u / openTextEnd) * w;
      }
      return w;
    }

    const lo = j - 0.5;
    const hi = j + 0.5;
    if (k < lo) return 0;
    if (k >= hi) return w;
    const u = (k - lo) / (hi - lo);
    return phasedWordHead(u, w, false);
  }, [
    prefersReducedMotion,
    slice.k,
    storyChapterIndex,
    isFinaleScroll,
    finalePhase,
    n,
    finaleBodyWordCount,
    lastChapterIndex,
  ]);

  const finaleScrollU = useMemo(
    () => clamp(slice.k - (n - 1), 0, 1),
    [slice.k, n],
  );

  const {
    portraitMode,
    portraitBandU,
    portraitHoldScatter,
    scatterHold,
    targetBeatId,
    scatterPrefillT,
    particleLayout,
    portraitBandEpoch,
    finaleImageFormEpoch,
    finaleScatterBurst,
  } = useStoryPortraitScroll({
    sliceK: slice.k,
    storyChapterIndex,
    isFinaleScroll,
    finalePhase,
    finaleScrollU,
    finaleImageScatterEndU: FINALE_U_IMAGE_SCATTER_END,
    chapterCount: n,
    firstImageChapter: firstImage,
  });

  const finaleImageForming = useMemo(() => {
    return (
      isFinaleScroll &&
      finalePhase === "image" &&
      finaleScrollU >= FINALE_U_IMAGE_SCATTER_END
    );
  }, [isFinaleScroll, finalePhase, finaleScrollU]);

  /**
   * Finale duo formation progress controlled by physical scroll distance (`vh`), not wall-clock time.
   * This keeps the morph directly scrubbed by the user's scroll direction/speed.
   */
  const finaleScrollMorphProgress = useMemo(() => {
    if (!finaleImageForming) return null;
    const morphStartK = n - 1 + FINALE_U_IMAGE_SCATTER_END;
    const morphStartY = (morphStartK / n) * docMax;
    const configuredVh = Math.max(
      1,
      particlePortraitConfig.storyFinaleMorphScrollVh ?? 50,
    );
    const configuredSpanPx = (configuredVh / 100) * Math.max(1, viewportH);
    const maxAvailableSpanPx = Math.max(1, docMax - morphStartY);
    const spanPx = Math.min(configuredSpanPx, maxAvailableSpanPx);
    return clamp((scrollY - morphStartY) / spanPx, 0, 1);
  }, [finaleImageForming, n, docMax, viewportH, scrollY]);

  /** Mid-story: flowing particles without silhouettes; finale reserves the portrait morph. */
  const storyAmbientOnly = portraitMode && !isFinaleScroll;

  /** 0 = calm (scroll prefix), 1 = full ambient motion after the prefix band. */
  const verseAmbientIntensity = useMemo(() => {
    if (!storyAmbientOnly) return 0;
    if (portraitBandU === null) return 1;
    if (portraitHoldScatter) {
      return 0.28 + 0.72 * clamp(portraitBandU / PORTRAIT_SCATTER_PREFIX, 0, 1);
    }
    return 1;
  }, [storyAmbientOnly, portraitBandU, portraitHoldScatter]);

  const scatterAlphaScale = useMemo(() => {
    if (isFinaleScroll) {
      return Math.max(0.05, particlePortraitConfig.finaleScatterAlphaScale ?? 1.4);
    }
    if (storyChapterIndex < firstImage) {
      return particlePortraitConfig.openingScatterAlpha ?? 0;
    }
    if (portraitMode) return 1;
    return Math.min(
      0.94,
      0.02 + scrollProgress * 1.15 + storyChapterIndex * 0.055,
    );
  }, [storyChapterIndex, firstImage, portraitMode, scrollProgress, isFinaleScroll]);

  const particleColorRgb = useMemo(() => {
    if (storyChapterIndex === 0) return openingHeaderDotColorRgb;
    if (isFinaleScroll && finalePhase === "image") {
      return (
        particlePortraitConfig.finaleImageParticleColorRgb ?? particleThemeColorRgb
      );
    }
    if (isFinaleScroll) {
      return (
        particlePortraitConfig.finaleScatterParticleColorRgb ??
        scatterAmbientParticleColorRgb
      );
    }
    if (portraitMode) return scatterAmbientParticleColorRgb;
    return particleThemeColorRgb;
  }, [storyChapterIndex, portraitMode, isFinaleScroll, finalePhase]);

  /** Split stage only from chapter index 2 onward (rail beats); opening + “wait” stay centered. */
  const showDotsRightGutter =
    portraitMode && !isFinaleScroll && storyChapterIndex >= 2;

  const copyOpacity = useMemo(() => {
    return chapterCopyOpacity(
      slice.k,
      storyChapterIndex,
      n,
      prefersReducedMotion,
      isFinaleScroll,
    );
  }, [slice.k, storyChapterIndex, prefersReducedMotion, n, isFinaleScroll]);

  return (
    <div
      className="story-root"
      style={{ "--scroll-p": scrollProgress }}
      data-page-ready={assetsReady ? "true" : "false"}
    >
      <StoryLoadingOverlay visible={!assetsReady} />

      <header
        className="pointer-events-none fixed left-4 top-3 z-50 md:left-10 md:top-8"
        aria-label="Site"
      >
        <p className="story-site-title font-[family-name:var(--font-story)] text-[0.65rem] font-medium uppercase tracking-[0.35em] text-zinc-500 md:text-[0.7rem]">
          A Billion Dreams
        </p>
      </header>

      <div className="story-canvas" aria-hidden="true">
        <ParticlePortrait
          storyMode
          portraitMode={portraitMode}
          targetBeatId={targetBeatId}
          scatterOnly={scatterHold}
          scatterAlphaScale={scatterAlphaScale}
          particleColorRgb={particleColorRgb}
          backgroundRgb={particleBackgroundRgb}
          particleLayout={particleLayout}
          scrollY={scrollY}
          scatterPrefillT={scatterPrefillT}
          portraitStoryKey={storyChapterIndex}
          portraitBandEpoch={portraitBandEpoch}
          finaleImageFormEpoch={finaleImageFormEpoch}
          finaleScatterBurst={finaleScatterBurst}
          finaleFlatScatter={isFinaleScroll}
          storyToImageEase={
            "easeInQuad"
          }
          storyToImageDurationMs={
            finaleImageForming
              ? particlePortraitConfig.storyFinaleToImageMs
              : undefined
          }
          scrollMorphProgress={finaleScrollMorphProgress}
          finaleFormMorph={finaleImageForming}
          storyAmbientOnly={storyAmbientOnly}
          verseAmbientIntensity={verseAmbientIntensity}
          storyScrollProgress={scrollProgress}
          onReadyStateChange={handleParticleStatus}
        />
      </div>

      <StoryWatcherProgress
        scrollProgress={scrollProgress}
        chapterIndex={storyChapterIndex}
        chapterCount={n}
      />

      <div
        className="story-scroll-spacer"
        style={{ height: `${n * 200 + STORY_SPACER_EXTRA_VH}vh` }}
        aria-hidden
      />

      <main className="story-stage-main pointer-events-none">
        <h1 className="sr-only">A Billion Dreams</h1>

        <div
          className="story-center-stage fixed inset-0 z-30 flex items-center justify-center px-4 md:px-12"
          aria-live="polite"
        >
          {!isFinaleScroll && storyChapterIndex !== lastChapterIndex ? (
            <div
              className={`story-stage-inner ${
                showDotsRightGutter
                  ? "story-stage-inner--split"
                  : "story-stage-inner--text-only"
              }`}
            >
              <div
                className="story-stage-copy story-stage-copy--scroll-fade"
                style={{ opacity: copyOpacity }}
              >
                <div className="story-stage-single">
                  <LitChapter
                    key={storyChapterIndex}
                    chapter={currentChapter}
                    head={wordHead}
                    reduced={prefersReducedMotion}
                    isFinale={false}
                    landingEntranceOn={openingEntranceOn}
                  />
                </div>
              </div>

              {showDotsRightGutter ? (
                <StoryBeatImageRail
                  storyChapterIndex={storyChapterIndex}
                  portraitBandU={portraitBandU}
                  storyScrollK={slice.k}
                  copyOpacity={copyOpacity}
                  reducedMotion={prefersReducedMotion}
                />
              ) : null}
            </div>
          ) : (
            <div className="story-stage-inner story-stage-inner--text-only">
              <div
                className="story-stage-copy story-stage-copy--scroll-fade"
                style={{ opacity: copyOpacity }}
              >
                <div className="story-stage-single">
                  <LitChapter
                    key="finale"
                    chapter={finaleChapter}
                    head={wordHead}
                    reduced={prefersReducedMotion}
                    isFinale={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
