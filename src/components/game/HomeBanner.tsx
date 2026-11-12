"use client";

import { useRef, useState, type ReactNode } from "react";

/* The strip at the top of Home: one card wide, swiped sideways. Each slide is
   a full-width card (guest sign-up, install the app, the quote of the
   moment); with a single slide it is just that card, no dots. Scroll-snap
   does the swiping, so it works with a finger, a trackpad or the dots. */
export function HomeBanner({ slides, label }: { slides: { key: string; node: ReactNode }[]; label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState(0);
  if (!slides.length) return null;
  const many = slides.length > 1;
  const go = (i: number) => {
    const el = ref.current;
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
          if (i !== at) setAt(i);
        }}
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
