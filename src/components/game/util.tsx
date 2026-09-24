"use client";

import { useEffect, useRef, useState } from "react";

export function ri(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function weightedPick<T extends string>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) {
    if (r < w) return v;
    r -= w;
  }
  return pairs[0][0];
}

/* VAPID keys travel as base64url; PushManager wants the raw bytes. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function RollUp({ to, ms = 650, prefix = "" }: { to: number; ms?: number; prefix?: string }) {
  const [n, setN] = useState(0);
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce.current || to <= 0) return setN(to);
    let raf = 0;
    const started = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - started) / ms);
      /* ease-out: fast at first, then settles — a counter that decelerates
         feels like it is arriving somewhere. */
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <span className="rollup">{prefix}{n.toLocaleString("en-IN")}</span>;
}

export function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

export function sameLoc(a: Loc | null, b: Loc | null) {
  return !!a && !!b && a.loc === b.loc && a.gi === b.gi && a.slot === b.slot && a.idx === b.idx;
}

export function msUntilUTCMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return next - now.getTime();
}

export function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

/* 1st / 2nd / 3rd / 4th — spelled out because "#4" reads as a quantity. */
export function rankLabel(n: number): string {
  if (n <= 0) return "—";
  const s = ["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "th";
  return `${n}${s}`;
}

export function fmtDue(iso: string, ja: boolean): string {
  const day = 864e5;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((new Date(iso).getTime() - start.getTime()) / day));
  if (days <= 0) return ja ? "きょう" : "today";
  if (days === 1) return ja ? "あした" : "tomorrow";
  return ja ? `${days}日後` : `in ${days} days`;
}

export const SPRINT_LEN = 3;   /* puzzles per Matchstick Sprint */

export const PATH_POS = ["c", "l", "r", "c", "l", "r", "c", "l", "r", "c", "l", "r", "c"];

export const STAGE_POS = ["c", "l", "r", "l", "c"];

export const BLITZ_DEFAULT_LEVEL = 2;

/* one bought Time Boost is worth this much extra clock, for one run */
export const BLITZ_BOOST_MS = 4000;

export type View = "home" | "topic" | "stagemap" | "practice" | "arena" | "blitz" | "tricks" | "daily" | "review" | "comp" | "match" | "games" | "bigger" | "odd" | "sortg" | "memory" | "quick" | "ttt";

export type Mode = "type" | "choice" | "target" | "truefalse" | "arcade" | "catch" | "balloon" | "numberline";

export type Loc = { loc: "board" | "tray"; gi: number | null; slot: string | null; idx: number | null };
