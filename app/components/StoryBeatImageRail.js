"use client";

import {
  CHAPTER_TARGET_BEATS,
  STORY_CHAPTER_VISUAL_SRC,
  STORY_CONFIG,
} from "@/lib/cricketParticleStory";

/**
 * Right column: chapter artwork above the particle canvas (stage z-index > .story-canvas).
 * No frame — image reveals on its own (mask + opacity only).
 */
export default function StoryBeatImageRail({
  storyChapterIndex,
  portraitBandU,
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

  const u =
    portraitBandU === null ? 0.55 : Math.min(1, Math.max(0, portraitBandU));
  const reveal = reducedMotion ? 1 : 0.08 + 0.92 * u * u;
  const drift = reducedMotion ? 0 : (1 - u) * 4;

  return (
    <div className="story-beat-rail" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- local SVGs from /public */}
      <img
        key={beatId}
        src={src}
        alt=""
        className="story-beat-rail__img"
        style={{
          opacity: Math.min(1, (copyOpacity ?? 1) * (0.5 + 0.5 * reveal)),
          clipPath: reducedMotion
            ? "none"
            : `inset(${Math.max(0, (1 - reveal) * 28)}% 0 0 0)`,
          transform: reducedMotion
            ? undefined
            : `translate3d(0, ${drift}%, 0) scale(${1 + 0.028 * Math.sin(u * Math.PI)})`,
        }}
        draggable={false}
      />
    </div>
  );
}
