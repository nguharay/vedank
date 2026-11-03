"use client";

import { useState } from "react";
import type { Lang } from "@/lib/game/topics";

const dsOf = (n: number) => 1 + ((n - 1) % 9);

/* Book pp.205–206, "Your Turn — Connect the Number Points": the player draws
   the design themselves. The next step of the table is shown (7 × 3 = ?), they
   work out its Digit Sum and tap that point on the 9-Point Circle, and the
   line draws from the last point. One slip is forgiven; a second ends the
   question and the full design is shown. */
export function DrawCircle({ t, lang, hint = true, onDone }: { t: number; lang: Lang; hint?: boolean; onDone: (ok: boolean) => void }) {
  const ja = lang === "ja";
  const seq = Array.from({ length: 10 }, (_, i) => dsOf(t * (i + 1)));
  const [done, setDone] = useState(0); /* points placed so far */
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [over, setOver] = useState<null | "won" | "lost">(null);

  const cx = 130, cy = 120, R = 92;
  const pt = (d: number) => {
    const a = ((-90 + d * 40) * Math.PI) / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const;
  };
  const shown = over === "lost" ? seq.length : done;
  const path = seq.slice(0, shown).map((d, i) => `${i ? "L" : "M"}${pt(d)[0].toFixed(1)},${pt(d)[1].toFixed(1)}`).join(" ");

  function tap(d: number) {
    if (over) return;
    if (d === seq[done]) {
      const next = done + 1;
      setDone(next);
      if (next === seq.length) { setOver("won"); setTimeout(() => onDone(true), 600); }
      return;
    }
    setFlash(d);
    setTimeout(() => setFlash(null), 450);
    const m = misses + 1;
    setMisses(m);
    if (m >= 2) { setOver("lost"); setTimeout(() => onDone(false), 900); }
  }

  const k = Math.min(done + 1, seq.length);
  return (
    <div className="dc">
      <div className="dc-step mono" aria-live="polite">
        {over === "won"
          ? (ja ? "できた！" : "Done!")
          : over === "lost"
            ? (ja ? "正しいデザインはこれ" : "Here is the design")
            : hint
              ? <>{t} × {k} = <b>{t * k}</b> → {ja ? "数字和は？" : "Digit Sum?"}</>
              : <>{t} × {k} → {ja ? "頭の中で数字和を！" : "Digit Sum in your head!"}</>}
      </div>
      <svg viewBox="0 0 260 240" className="dc-svg">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--muted)" strokeOpacity=".5" strokeWidth="2" />
        {shown > 1 && <path d={path} fill="none" stroke="#D63A3A" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
          const [x, y] = pt(d);
          const last = shown > 0 && seq[shown - 1] === d;
          const bad = flash === d;
          return (
            <g key={d} className={`dc-pt${bad ? " bad" : ""}`} onPointerDown={(e) => { e.preventDefault(); tap(d); }} role="button" aria-label={String(d)}>
              <circle cx={x} cy={y} r="19" fill={bad ? "#E5484D" : last ? "#D63A3A" : "var(--surface)"} stroke={bad || last ? "#D63A3A" : "#5B3FA0"} strokeWidth="2" />
              <text x={x} y={y + 6} textAnchor="middle" style={{ fontFamily: "var(--font-num)", fontWeight: 800, fontSize: 17, fill: bad || last ? "#fff" : "#5B3FA0" }}>{d}</text>
            </g>
          );
        })}
      </svg>
      <div className="dc-trail mono">
        {seq.slice(0, shown).join(" → ") || (ja ? `${t}の段のデザインをかこう` : `Draw the table of ${t}`)}
        {misses > 0 && !over && <span className="dc-miss">{ja ? "  ✕ あと1回まで" : "  ✕ one slip left"}</span>}
      </div>
    </div>
  );
}
