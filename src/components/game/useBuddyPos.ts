"use client";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

const KEY = "sutraSprint.buddyPos";
const SIZE = 66;
/* Keep it clear of the bottom nav and the header so it can never be dragged
   somewhere it cannot be grabbed back from. */
const PAD = 10;
const BOTTOM_RESERVED = 88;
const TOP_RESERVED = 76;

export type Pt = { x: number; y: number };

function clamp(p: Pt): Pt {
  const w = typeof window === "undefined" ? 400 : window.innerWidth;
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  return {
    x: Math.min(Math.max(p.x, PAD), Math.max(PAD, w - SIZE - PAD)),
    y: Math.min(Math.max(p.y, TOP_RESERVED), Math.max(TOP_RESERVED, h - SIZE - BOTTOM_RESERVED)),
  };
}

/* The committed position lives in a tiny store rather than being hydrated into
   state by an effect. Reads clamp, and `subscribe` also listens for resize, so a
   window that shrank re-clamps on the next render with no effect and no risk of
   the buddy being stranded off-screen. */
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Pt | null } = { raw: null, value: null };

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("resize", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("resize", fn);
  };
}

function readSaved(): Pt | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  /* getSnapshot must return a stable reference for equal input, or React loops. */
  if (cache.raw === raw && cache.value) {
    const c = clamp(cache.value);
    if (c.x === cache.value.x && c.y === cache.value.y) return cache.value;
    cache = { raw, value: c };
    return c;
  }
  try {
    const p = JSON.parse(raw) as Pt;
    if (typeof p?.x !== "number" || typeof p?.y !== "number") return null;
    cache = { raw, value: clamp(p) };
    return cache.value;
  } catch {
    return null;
  }
}

function writeSaved(p: Pt | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  } catch {}
  cache = { raw: null, value: null };
  listeners.forEach((fn) => fn());
}

/* Drag to move, tap to talk. The two are told apart by distance travelled, so a
   slightly shaky tap still counts as a tap rather than a 3px drag. */
const TAP_SLOP = 6;

export function useBuddyPos(onTap: () => void) {
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  /* Only set while a finger or mouse is down, so dragging never writes to
     localStorage on every frame. */
  const [live, setLive] = useState<Pt | null>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, moved: 0 });

  const pos = live ?? saved;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    start.current = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, moved: 0 };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      const dx = e.clientX - start.current.px;
      const dy = e.clientY - start.current.py;
      start.current.moved = Math.max(start.current.moved, Math.abs(dx) + Math.abs(dy));
      setLive(clamp({ x: start.current.x + dx, y: start.current.y + dy }));
    },
    [dragging]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      const moved = start.current.moved;
      setLive((p) => {
        if (moved >= TAP_SLOP && p) writeSaved(p);
        return null;
      });
      if (moved < TAP_SLOP) onTap();
    },
    [dragging, onTap]
  );

  const reset = useCallback(() => {
    setLive(null);
    writeSaved(null);
  }, []);

  return {
    pos,
    dragging,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
