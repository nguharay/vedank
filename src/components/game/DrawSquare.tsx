"use client";

import { useRef, useState } from "react";
import type { Lang } from "@/lib/game/topics";
import { DS_COL, dsSquarePath } from "./BookDiagrams";

const dsOf = (n: number) => 1 + ((n - 1) % 9);

/* Book pp.208–209, "Colour all the 8s": the player makes the design in the
   Digit-Sum Square. Every box is row × column; the player taps each box whose
   digit sum is `t`. With `hint` the boxes show the digit sums (find them);
   without it they show the products (work them out). Two slips are forgiven;
   a third ends the question and the design is shown with its lines. */
export function DrawSquare({ t, lang, hint = true, onDone }: { t: number; lang: Lang; hint?: boolean; onDone: (ok: boolean) => void }) {
  const ja = lang === "ja";
  const cells: { r: number; c: number; d: number }[] = [];
  for (let r = 1; r <= 9; r++) for (let c = 1; c <= 9; c++) cells.push({ r, c, d: dsOf(r * c) });
  const total = cells.filter((q) => q.d === t).length;
  /* the taps so far, kept in refs as well as state: two quick taps must not
     read a stale count */
  const foundRef = useRef(new Set<string>());
  const missRef = useRef(0);
  const overRef = useRef<null | "won" | "lost">(null);
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [over, setOver] = useState<null | "won" | "lost">(null);

  const C = 30, x0 = 30, y0 = 24;
  const ctr = (r: number, c: number) => [x0 + (c - 0.5) * C, y0 + (r - 0.5) * C] as const;
  const num = { fontFamily: "var(--font-num)", fontWeight: 800 } as const;

  function finish(how: "won" | "lost") {
    overRef.current = how; setOver(how);
    setTimeout(() => onDone(how === "won"), how === "won" ? 700 : 1100);
  }
  function tap(q: { r: number; c: number; d: number }) {
    if (overRef.current) return;
    const key = `${q.r}-${q.c}`;
    if (foundRef.current.has(key)) return;
    if (q.d === t) {
      foundRef.current.add(key);
      setFound(new Set(foundRef.current));
      if (foundRef.current.size === total) finish("won");
      return;
    }
    setFlash(key);
    setTimeout(() => setFlash(null), 450);
    missRef.current += 1;
    setMisses(missRef.current);
    if (missRef.current >= 3) finish("lost");
  }

  const W = x0 + 9 * C + 4, H = y0 + 9 * C + 4;
  const left = 3 - misses;
  return (
    <div className="dc dsq">
      <div className="dc-step mono" aria-live="polite">
        {over === "won"
          ? (ja ? "できた！" : "Done!")
          : over === "lost"
            ? (ja ? "正しいデザインはこれ" : "Here is the design")
            : <><b>{t}</b> {ja ? "のマス" : "boxes"}: {found.size} / {total}</>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="dc-svg dsq-svg">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <g key={i}>
            <text x={x0 + (i - 0.5) * C} y={y0 - 8} textAnchor="middle" style={{ ...num, fontSize: 11, fill: "#5B3FA0" }}>{i}</text>
            <text x={x0 - 11} y={y0 + (i - 0.5) * C + 4} textAnchor="middle" style={{ ...num, fontSize: 11, fill: "#5B3FA0" }}>{i}</text>
          </g>
        ))}
        {cells.map((q) => {
          const key = `${q.r}-${q.c}`;
          const on = found.has(key) || (over === "lost" && q.d === t);
          const bad = flash === key;
          const [x, y] = ctr(q.r, q.c);
          return (
            <g key={key} className={`dsq-cell${bad ? " bad" : ""}`} onPointerDown={(e) => { e.preventDefault(); tap(q); }} role="button" aria-label={`${q.r} × ${q.c}`}>
              <rect
                x={x0 + (q.c - 1) * C} y={y0 + (q.r - 1) * C} width={C} height={C}
                fill={bad ? "#E5484D" : on ? DS_COL[t] : "var(--surface)"} fillOpacity={on || bad ? 0.9 : 1}
                stroke="#5B3FA0" strokeOpacity=".7" strokeWidth=".8"
              />
              <text x={x} y={y + 4.5} textAnchor="middle" style={{ ...num, fontSize: hint ? 13 : 11, fill: on || bad ? "#fff" : "var(--ink)" }}>
                {hint ? q.d : q.r * q.c}
              </text>
            </g>
          );
        })}
        {over && <path d={dsSquarePath(t, ctr)} pathLength={1} className="bd-dsline" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" />}
      </svg>
      <div className="dc-trail mono">
        {over ? "" : hint
          ? (ja ? `数字和が ${t} のマスをさがそう` : `Find every ${t}`)
          : (ja ? `たて × よこ の数字和が ${t} になるマスは？` : `Row × column: which boxes make ${t}?`)}
        {misses > 0 && !over && <span className="dc-miss">{ja ? `  ✕ あと${left}回まで` : `  ✕ ${left} slip${left === 1 ? "" : "s"} left`}</span>}
      </div>
    </div>
  );
}
