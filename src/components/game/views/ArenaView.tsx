"use client";

import type { Loc } from "../util";
import { Mandala } from "../Mascot";
import type { UIDict } from "../i18n";
import { OP_GEO, OP_TIP, PUZZLES, SEG_LINE, SEG_TIP } from "@/lib/game/matchstick";
import type { Glyph } from "@/lib/game/matchstick";
import { useEffect, useRef, useState } from "react";

export function ArenaView({
  puzIdx,
  glyphs,
  tray,
  selection,
  hintPair,
  moveCount,
  elapsed,
  bestMoves,
  solvedMap,
  status,
  svgRef,
  onSlotClick,
  onHint,
  onReset,
  onNext,
  t,
}: {
  puzIdx: number;
  glyphs: Glyph[];
  tray: boolean[];
  selection: Loc | null;
  hintPair: { from: Loc; to: Loc } | null;
  moveCount: number;
  elapsed: number;
  bestMoves: number | undefined;
  solvedMap: Record<string, boolean>;
  status: { text: string; color: string };
  svgRef: React.RefObject<SVGSVGElement | null>;
  onSlotClick: (loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null) => void;
  onHint: () => void;
  onReset: () => void;
  onNext: () => void;
  t: UIDict;
}) {
  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; loc: "board" | "tray"; gi: number | null; slot: string | null; idx: number | null } | null>(null);
  // onSlotClick reads `selection` state from its enclosing render; the document-level
  // drag listeners below live across multiple re-renders (pickup, then drop), so they
  // must always call the LATEST onSlotClick, not the one closed over at pointerdown time.
  const onSlotClickRef = useRef(onSlotClick);
  useEffect(() => {
    onSlotClickRef.current = onSlotClick;
  });

  function parseDragTarget(el: Element | null) {
    const target = el?.closest<HTMLElement>("[data-drag-loc]");
    if (!target) return null;
    return {
      loc: target.dataset.dragLoc as "board" | "tray",
      gi: target.dataset.dragGi ? Number(target.dataset.dragGi) : null,
      slot: target.dataset.dragSlot || null,
      idx: target.dataset.dragIdx ? Number(target.dataset.dragIdx) : null,
    };
  }

  // Document-level listeners (rather than per-stick pointer capture) so a drag
  // survives the finger sliding off the thin stick hit-line — SVG pointer
  // capture is unreliable on mobile WebKit and silently drops the drag mid-move.
  function docPointerMove(e: PointerEvent) {
    const start = dragStartRef.current;
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
    if (moved && !draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);
      onSlotClickRef.current(start.loc, start.gi, start.slot, start.idx);
    }
    if (moved || draggingRef.current) setGhostPos({ x: e.clientX, y: e.clientY });
  }
  function docPointerUp(e: PointerEvent) {
    const start = dragStartRef.current;
    if (start) {
      if (draggingRef.current) {
        const target = parseDragTarget(document.elementFromPoint(e.clientX, e.clientY));
        if (target) onSlotClickRef.current(target.loc, target.gi, target.slot, target.idx);
      } else {
        onSlotClickRef.current(start.loc, start.gi, start.slot, start.idx);
      }
    }
    dragStartRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    setGhostPos(null);
    document.removeEventListener("pointermove", docPointerMove);
    document.removeEventListener("pointerup", docPointerUp);
    document.removeEventListener("pointercancel", docPointerUp);
  }
  function handlePointerDown(e: React.PointerEvent, loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null) {
    dragStartRef.current = { x: e.clientX, y: e.clientY, loc, gi, slot, idx };
    document.addEventListener("pointermove", docPointerMove);
    document.addEventListener("pointerup", docPointerUp);
    document.addEventListener("pointercancel", docPointerUp);
  }
  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", docPointerMove);
      document.removeEventListener("pointerup", docPointerUp);
      document.removeEventListener("pointercancel", docPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = PUZZLES[puzIdx];
  const cellW = 46, gap = 26, opW = 44;
  let total = 0;
  for (const g of glyphs) total += (g.type === "digit" ? cellW : opW) + gap;
  total -= gap;
  const startX = Math.max(10, (440 - total) / 2);
  const y = 24;

  const sticks: React.ReactElement[] = [];
  let x = startX;
  glyphs.forEach((g, gi) => {
    const geo = g.type === "digit" ? SEG_LINE : OP_GEO;
    const tips = g.type === "digit" ? SEG_TIP : OP_TIP;
    Object.keys(geo).forEach((slot) => {
      const c = geo[slot];
      const on = !!g.active[slot];
      const tipEnd = tips[slot];
      const x1 = x + c[0], y1 = y + c[1], x2 = x + c[2], y2 = y + c[3];
      const tipX = tipEnd === "start" ? x1 : x2;
      const tipY = tipEnd === "start" ? y1 : y2;
      const isSel = selection && selection.loc === "board" && selection.gi === gi && selection.slot === slot;
      const isHintSrc = hintPair && hintPair.from.loc === "board" && hintPair.from.gi === gi && hintPair.from.slot === slot;
      const isHintDst = hintPair && hintPair.to.loc === "board" && hintPair.to.gi === gi && hintPair.to.slot === slot;
      const lineCls = `stick ${isSel ? "stick-selected" : on ? "stick-active" : "stick-inactive"}${isHintSrc || isHintDst ? " stick-hint" : ""}`;
      const tipCls = isSel ? "stick-tip sel-tip" : on ? "stick-tip" : "stick-tip-off";
      sticks.push(
        <g
          key={`${gi}-${slot}`}
          data-drag-loc="board"
          data-drag-gi={gi}
          data-drag-slot={slot}
          onPointerDown={(e) => handlePointerDown(e, "board", gi, slot, null)}
        >
          <line className="stick-hit" x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} strokeLinecap="round" />
          <line className={lineCls} x1={x1} y1={y1} x2={x2} y2={y2} />
          <circle className={tipCls} cx={tipX} cy={tipY} r={isSel ? 6 : on ? 5.5 : 4} />
        </g>
      );
    });
    x += (g.type === "digit" ? cellW : opW) + gap;
  });

  return (
    <section className="view active">
      <div className="topic-head">
        <div className="icon-badge" style={{ background: "linear-gradient(135deg,#9B30FF,#FFC93C)" }}>🔥</div>
        <div className="sutra-tag" style={{ background: "linear-gradient(135deg,#9B30FF,#FFB020)" }}>{t.headerTitles.arena}</div>
        <h1>{t.arena.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
          {t.arena.instructions}
        </p>
      </div>
      <div className="puzzle-nav">
        <span>{t.arena.round(puzIdx + 1, PUZZLES.length)}</span>
        <div className="dot-row">
          {PUZZLES.map((pz, i) => (
            <div key={pz.id} className={`dot${i === puzIdx ? " on" : ""}${solvedMap[pz.id] && i !== puzIdx ? " solved" : ""}`} />
          ))}
        </div>
      </div>
      <div className="par-row">
        <span className="par-chip">{t.arena.par(p.par)}</span>
        {!solvedMap[p.id] && (
          <span className={`stopwatch-chip${elapsed <= 15 ? "" : " slow"}`}>
            ⏱ {String(Math.floor(elapsed / 60)).padStart(1, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="puzzle-board">
        <svg className="mandala-watermark" viewBox="0 0 100 100"><Mandala stroke="#7A4E2C" /></svg>
        <div className="board-svg-wrap">
          <svg ref={svgRef} viewBox="0 0 440 140" width="440" height="140">{sticks}</svg>
        </div>
      </div>
      <div className="tray-wrap">
        <span className="tray-label">{t.arena.trayLabel}</span>
        <div className="tray-slots">
          {tray.map((on, idx) => {
            const isSel = selection && selection.loc === "tray" && selection.idx === idx;
            return (
              <div
                key={idx}
                className={`tray-slot${on ? " filled" : ""}${isSel ? " sel" : ""}`}
                data-drag-loc="tray"
                data-drag-idx={idx}
                onPointerDown={(e) => handlePointerDown(e, "tray", null, null, idx)}
              >
                {on && <div className="stick-mini" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="moves-row">
        <span>{t.arena.movesUsed} <b>{moveCount}</b></span>
        <span>{t.arena.best} <b>{bestMoves != null ? bestMoves : "–"}</b></span>
      </div>
      <div className="puzzle-status" style={{ color: status.color }}>{status.text}</div>
      <div className="story-chip">{p.story}</div>
      {dragging && ghostPos && (
        <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }} />
      )}
    </section>
  );
}
