"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "sutraSprint.buddyPos";
const SIZE = 66;
/* Keep it clear of the bottom nav and the header so it can never be dragged
   somewhere it cannot be grabbed back from. */
const PAD = 10;
const BOTTOM_RESERVED = 88;
const TOP_RESERVED = 76;

export type BuddyPos = { x: number; y: number } | null;

function clamp(p: { x: number; y: number }): { x: number; y: number } {
  const w = typeof window === "undefined" ? 400 : window.innerWidth;
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  return {
    x: Math.min(Math.max(p.x, PAD), Math.max(PAD, w - SIZE - PAD)),
    y: Math.min(Math.max(p.y, TOP_RESERVED), Math.max(TOP_RESERVED, h - SIZE - BOTTOM_RESERVED)),
  };
}

/* Drag to move, tap to talk. The two are told apart by distance travelled, so a
   slightly shaky tap still counts as a tap rather than a 3px drag. */
const TAP_SLOP = 6;

export function useBuddyPos(onTap: () => void) {
  const [pos, setPos] = useState<BuddyPos>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0, moved: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        if (typeof p?.x === "number" && typeof p?.y === "number") setPos(clamp(p));
      }
    } catch {}
  }, []);

  /* A window that shrank could leave a saved position off-screen. */
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clamp(p) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      start.current = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, moved: 0 };
      setDragging(true);
      el.setPointerCapture?.(e.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      const dx = e.clientX - start.current.px;
      const dy = e.clientY - start.current.py;
      start.current.moved = Math.max(start.current.moved, Math.abs(dx) + Math.abs(dy));
      setPos(clamp({ x: start.current.x + dx, y: start.current.y + dy }));
    },
    [dragging]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragging) return;
      setDragging(false);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      if (start.current.moved < TAP_SLOP) {
        onTap();
        return;
      }
      setPos((p) => {
        if (p) {
          try {
            localStorage.setItem(KEY, JSON.stringify(p));
          } catch {}
        }
        return p;
      });
    },
    [dragging, onTap]
  );

  function reset() {
    setPos(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  return { pos, dragging, reset, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
