"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const STORY_TIPS = [
  "Scroll to pull the constellations into a face.",
  "Each chapter reshapes the same thousand lights.",
  "The lens follows you—progress is the story unwinding.",
  "Slow scroll: the dots have farther to travel.",
];

/**
 * Top-right watcher: pupil follows pointer; scroll progress fills the outer ring around the eye.
 */
export default function StoryWatcherProgress({
  scrollProgress = 0,
  chapterIndex = 0,
  chapterCount = 7,
}) {
  const [message, setMessage] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [pupil, setPupil] = useState({ x: 56, y: 56 });
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const targetProgress = useRef(scrollProgress);
  const smoothProgress = useRef(scrollProgress);
  const progressRingRef = useRef(null);

  const cx = 56;
  const cy = 56;
  /** Outer progress radius — full ring around the eye */
  const pr = 50;
  const c = 2 * Math.PI * pr;

  useEffect(() => {
    targetProgress.current = scrollProgress;
  }, [scrollProgress]);

  useLayoutEffect(() => {
    const ring = progressRingRef.current;
    if (ring) {
      ring.style.strokeDashoffset = String(
        c * (1 - Math.min(1, Math.max(0, scrollProgress)))
      );
    }
    smoothProgress.current = scrollProgress;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init only; smooth RAF follows targetProgress
  }, [c]);

  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const nx = (e.clientX / w - 0.5) * 2;
      const ny = (e.clientY / h - 0.5) * 2;
      target.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let id;
    const tick = () => {
      const lerp = (a, b, t) => a + (b - a) * t;
      current.current.x = lerp(current.current.x, target.current.x, 0.14);
      current.current.y = lerp(current.current.y, target.current.y, 0.14);
      const px = cx + current.current.x * 11;
      const py = cy + current.current.y * 11;
      setPupil({ x: px, y: py });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let id;
    const loop = () => {
      const t = targetProgress.current;
      smoothProgress.current += (t - smoothProgress.current) * 0.12;
      const ring = progressRingRef.current;
      if (ring) {
        const dash = c * (1 - Math.min(1, Math.max(0, smoothProgress.current)));
        ring.style.strokeDashoffset = String(dash);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [c]);

  const handleClick = useCallback(() => {
    const msg = STORY_TIPS[tipIndex % STORY_TIPS.length];
    setMessage(msg);
    setTipIndex((i) => i + 1);
    setTimeout(() => setMessage(null), 3200);
  }, [tipIndex]);

  const pct = Math.round(scrollProgress * 100);

  return (
    <>
      <div className="story-watcher fixed right-6 top-6 z-50 flex flex-col items-center gap-2">
        <button
          type="button"
          className="story-watcher-btn group relative h-[120px] w-[120px] rounded-full border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-[#667eea]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
          onClick={handleClick}
          aria-label={`Story progress ${pct} percent, chapter ${chapterIndex + 1} of ${chapterCount}. Click for a tip.`}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 112 112"
            className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          >
            <defs>
              <radialGradient id="sw-glass" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="rgba(199, 210, 254, 0.38)" />
                <stop offset="55%" stopColor="rgba(102, 126, 234, 0.14)" />
                <stop offset="100%" stopColor="rgba(10, 10, 14, 0.92)" />
              </radialGradient>
              <linearGradient id="sw-progress" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a5b4fc" />
                <stop offset="45%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="sw-inner-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(102, 126, 234, 0.5)" />
                <stop offset="100%" stopColor="rgba(56, 189, 248, 0.35)" />
              </linearGradient>
            </defs>

            {/* Track — full circle */}
            <circle
              cx={cx}
              cy={cy}
              r={pr}
              fill="none"
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth="2.5"
            />
            {/* Progress — same radius, animated via ref */}
            <circle
              ref={progressRingRef}
              cx={cx}
              cy={cy}
              r={pr}
              fill="none"
              stroke="url(#sw-progress)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeDasharray={c}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ filter: "drop-shadow(0 0 6px rgba(102, 126, 234, 0.35))" }}
            />

            {/* Eye iris */}
            <circle
              cx={cx}
              cy={cy}
              r="28"
              fill="url(#sw-glass)"
              stroke="url(#sw-inner-ring)"
              strokeWidth="1.25"
            />
            <circle
              cx={cx}
              cy={cy}
              r="28"
              fill="none"
              stroke="rgba(79, 172, 254, 0.12)"
              strokeWidth="4"
              opacity="0.85"
            />

            <circle cx={pupil.x} cy={pupil.y} r="9" fill="rgba(8, 8, 12, 0.94)" />
            <circle
              cx={pupil.x + 2.4}
              cy={pupil.y - 2.2}
              r="2.8"
              fill="rgba(255,255,255,0.52)"
            />
          </svg>
        </button>
        <span
          className="max-w-[7rem] text-center font-mono text-[10px] leading-tight tracking-[0.2em] text-zinc-500 tabular-nums opacity-90"
          aria-hidden
        >
          {chapterIndex + 1} / {chapterCount}
        </span>
      </div>

      {message ? (
        <div
          className="fixed right-6 top-[9.5rem] z-[60] max-w-[min(280px,calc(100vw-3rem))] rounded-xl border border-white/10 bg-zinc-900/90 px-4 py-3 shadow-2xl backdrop-blur-md"
          role="status"
        >
          <p className="text-sm leading-relaxed text-zinc-100">{message}</p>
        </div>
      ) : null}
    </>
  );
}
