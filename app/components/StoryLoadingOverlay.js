"use client";

/**
 * Full-viewport loader shown until particle WebGL targets are ready.
 * Intentionally loud-but-refined: orbiting rings + shimmer title (no extra deps).
 */
export default function StoryLoadingOverlay({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="story-loader fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0f]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading story"
    >
      <div className="story-loader__rings" aria-hidden>
        <span className="story-loader__ring story-loader__ring--a" />
        <span className="story-loader__ring story-loader__ring--b" />
        <span className="story-loader__ring story-loader__ring--c" />
      </div>
      <p className="story-loader__title font-[family-name:var(--font-story)] text-[0.7rem] font-medium uppercase tracking-[0.42em] text-zinc-500">
        A Billion Dreams
      </p>
      <p className="mt-4 font-sans text-xs tracking-wide text-zinc-600">
        Waking the portrait…
      </p>
    </div>
  );
}
