"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* The strip at the top of Home: one card wide, swiped sideways. Each slide is
   a full-width card (guest sign-up, install the app, the quote of the
   moment); with a single slide it is just that card, no dots. Scroll-snap
   does the swiping, so it works with a finger, a trackpad or the dots.
   With several slides it also moves on by itself, slowly (every AUTO_MS), and
   waits a good while after the player touches it so it never fights a finger
   or pulls a card away while it is being read or tapped. */
const AUTO_MS = 6500;
const REST_MS = 14000;
/* the device clock, read only from handlers and timers (never while drawing) */
const clock = () => Date.now();
/* `onLoop` fires each time the strip has gone all the way round (or, with a
   single slide, every LONE_MS), which is when the quote card gets a new quote:
   never while it is the card on screen being read mid-cycle. */
const LONE_MS = 30000;
export function HomeBanner({ slides, label, onLoop }: { slides: { key: string; node: ReactNode }[]; label: string; onLoop?: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState(0);
  const atRef = useRef(0);
  const restUntil = useRef(0);
  const count = slides.length;
  const loopRef = useRef(onLoop);
  useEffect(() => { loopRef.current = onLoop; }, [onLoop]);
  useEffect(() => {
    if (count < 2) {
      const lone = setInterval(() => { if (!document.hidden && clock() >= restUntil.current) loopRef.current?.(); }, LONE_MS);
      return () => clearInterval(lone);
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el || document.hidden || clock() < restUntil.current) return;
      const next = (atRef.current + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      /* back at the first card: the quote card is off screen, so swap its quote */
      if (next === 0) setTimeout(() => loopRef.current?.(), 700);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [count]);
  const rest = () => { restUntil.current = clock() + REST_MS; };
  if (!slides.length) return null;
  const many = slides.length > 1;
  const go = (i: number) => {
    const el = ref.current;
    rest();
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="home-banner" role="region" aria-label={label}>
      <div
        ref={ref}
        className={`home-banner-track${many ? "" : " single"}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          atRef.current = i;
          if (i !== at) setAt(i);
        }}
        onPointerDown={rest}
        onTouchStart={rest}
        onWheel={rest}
        onFocus={rest}
      >
        {slides.map((s) => <div key={s.key} className="home-banner-slide" data-slide={s.key}>{s.node}</div>)}
      </div>
      {many && (
        <div className="home-banner-dots">
          {slides.map((s, i) => (
            <button key={s.key} className={i === Math.min(at, slides.length - 1) ? "on" : ""} onClick={() => go(i)} aria-label={`${i + 1} / ${slides.length}`} aria-current={i === at} />
          ))}
        </div>
      )}
    </div>
  );
}
