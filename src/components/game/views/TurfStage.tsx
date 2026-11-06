"use client";

import { useState } from "react";
import { TURF_MS, TURF_LINE_BONUS, type PartyView } from "@/lib/game/party";

/* ---- 🎨 Turf War: the board ----
   One grid for the whole room. Every tile shows its sum; tap one to answer
   it below. Painted tiles carry their holder's colour (mine is always the
   yellow; in the team game red vs white), a gold tile has a gold frame, a
   locked tile shows a bar draining as the lock runs out. A capture pops; a
   tile stolen from me flashes red. The last 15 s turn the field purple: the
   Splash Finale, no locks, bonus points. Under the grid, the top painters
   (or the two teams) with their colours. */
export const TURF_PALETTE = ["#ff7a59", "#5bc8f5", "#9ad35b", "#c48cff", "#ffb84a", "#ff8fb8", "#6ee7d8", "#f4a261", "#8ecae6", "#b5e48c"];
export const TURF_ME = "#ffd84a";
const TEAM_COLOR: [string, string] = ["#ff5a5f", "#f4f1ea"];

export function turfColor(room: PartyView, key: string | null): string | null {
  if (!key) return null;
  const idx = room.players.findIndex((p) => p.key === key);
  if (idx < 0) return null;
  const p = room.players[idx];
  if (room.game === "turfteam") return TEAM_COLOR[p.team];
  return p.me ? TURF_ME : TURF_PALETTE[idx % TURF_PALETTE.length];
}

/* base font size per board size; a sum shrinks below it only as far as its
   own width needs (see .turf-sum). Spaces become thin spaces so the figures
   themselves can be bigger, and the width is counted in "units": a figure
   or sign is one, a thin space a third. */
const TURF_FS: Record<number, number> = { 5: 22, 6: 19, 7: 16, 8: 14, 9: 12 };
const tight = (prompt: string) => prompt.replace(/\s+/g, "\u2009");
const unitsOf = (prompt: string) => [...prompt].reduce((a, ch) => a + (/\s/.test(ch) ? 0.34 : 1), 0);

type Seen = { v: number[]; owner: (string | null)[]; at: number[]; lost: number[]; lineAt: number };

export function TurfStage({ room, ja, now, sel, onSel, prompts }: {
  room: PartyView; ja: boolean; now: number; sel: number | null; onSel: (i: number) => void;
  /* the sum printed on each tile (the screen draws them: it knows my id) */
  prompts: string[];
}) {
  const tf = room.turf;
  const me = room.players.find((p) => p.me);
  const teams = room.game === "turfteam";
  const myLines = me && tf ? tf.by[me.key]?.lines ?? 0 : 0;

  /* captures pop, my losses flash, a new line of mine shows a banner: all
     derived from the previous board while rendering (the React "store
     previous props" way, no effects) */
  const [seen, setSeen] = useState<Seen>({ v: [], owner: [], at: [], lost: [], lineAt: 0 });
  const [lines, setLines] = useState(myLines);
  if (tf) {
    const v = tf.tiles.map((t) => t.v), owner = tf.tiles.map((t) => t.owner);
    if (seen.v.length !== v.length) setSeen({ v, owner, at: v.map(() => 0), lost: v.map(() => 0), lineAt: 0 });
    else if (v.some((x, i) => x !== seen.v[i])) {
      const at = seen.at.slice(), lost = seen.lost.slice();
      v.forEach((x, i) => {
        if (x === seen.v[i]) return;
        at[i] = now;
        lost[i] = me && seen.owner[i] === me.key && owner[i] !== me.key ? now : 0;
      });
      setSeen({ ...seen, v, owner, at, lost });
    }
  }
  if (myLines !== lines) { setLines(myLines); if (myLines > lines) setSeen((s) => ({ ...s, lineAt: now })); }

  if (!tf) return null;
  const n = tf.n;
  const left = Math.max(0, tf.endsAt - now);
  const frac = Math.min(1, left / TURF_MS);
  const finale = tf.finaleOn && room.status !== "done";
  const board = teams ? null : [...room.players].sort((a, b) => b.score - a.score).slice(0, 4);
  const lineFlash = seen.lineAt > 0 && now - seen.lineAt < 1300;

  return (
    <div className={`turf-field${finale ? " finale" : ""}`}>
      <div className="turf-clock" aria-hidden="true"><i style={{ width: `${frac * 100}%` }} /></div>
      {finale && <div className="turf-banner">💥 {ja ? "スプラッシュ・フィナーレ！ロック解除・ボーナス点" : "SPLASH FINALE: locks off, bonus points!"}</div>}
      {!finale && lineFlash && <div className="turf-banner line">🔒 {ja ? `ライン完成！+${TURF_LINE_BONUS}` : `LINE! +${TURF_LINE_BONUS}`}</div>}

      {/* the sums as big as the tiles allow: the base size follows the board
          (5×5 → 19px … 9×9 → 11px) and only the longest sums shrink to fit */}
      <div className="turf-grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, ["--turf-fs" as string]: `${TURF_FS[Math.min(9, Math.max(5, n))]}px` }} role="grid" aria-label={ja ? "ナワバリの盤" : "The turf board"}>
        {tf.tiles.map((t, i) => {
          const color = turfColor(room, t.owner);
          const mine = !!me && (t.owner === me.key || (teams && t.team !== null && t.team === me.team));
          const locked = !finale && t.lock > now;
          const lockFrac = locked ? Math.min(1, (t.lock - now) / 10_000) : 0;
          const popped = seen.at[i] > 0 && now - seen.at[i] < 500;
          const lostNow = seen.lost[i] > 0 && now - seen.lost[i] < 900;
          const can = room.status === "playing" && !mine && !locked;
          return (
            <button key={i} role="gridcell" className={`turf-tile${mine ? " mine" : ""}${t.gold ? " gold" : ""}${locked ? " locked" : ""}${sel === i ? " sel" : ""}${popped ? " pop" : ""}${lostNow ? " lost" : ""}${!can ? " off" : ""}`}
              style={color ? { background: color } : undefined} onClick={() => can && onSel(i)} disabled={!can}
              aria-label={`${prompts[i] ?? ""}${t.owner ? `, ${room.players.find((p) => p.key === t.owner)?.name ?? ""}` : ""}${locked ? (ja ? "、ロック中" : ", locked") : ""}`}>
              <span className="turf-sum mono" style={{ ["--units" as string]: String(Math.max(3, unitsOf(prompts[i] ?? ""))) }}>{tight(prompts[i] ?? "")}</span>
              {t.gold && <span className="turf-star" aria-hidden="true">★</span>}
              {locked && <span className="turf-lock" aria-hidden="true"><i style={{ width: `${lockFrac * 100}%` }} /></span>}
            </button>
          );
        })}
      </div>

      <div className="turf-board">
        {teams ? (
          <>
            <span className={`turf-team t0${me?.team === 0 ? " me" : ""}`}>🟥 {ja ? "あかぐみ" : "Red"}{me?.team === 0 ? (ja ? "（きみ）" : " (you)") : ""} <b className="mono">{tf.teamScore[0]}</b></span>
            <span className={`turf-team t1${me?.team === 1 ? " me" : ""}`}><b className="mono">{tf.teamScore[1]}</b> {ja ? "しろぐみ" : "White"}{me?.team === 1 ? (ja ? "（きみ）" : " (you)") : ""} ⬜</span>
          </>
        ) : board!.map((p) => (
          <span key={p.key} className={`turf-who${p.me ? " me" : ""}`}>
            <i style={{ background: turfColor(room, p.key) ?? "#ccc" }} />{p.me ? (ja ? "きみ" : "You") : p.name} <b className="mono">{p.score}</b>
            {tf.by[p.key]?.lines ? <small>🔒{tf.by[p.key].lines}</small> : null}
          </span>
        ))}
      </div>
      <p className="turf-tip">{room.status !== "playing" ? "" : sel === null
        ? (ja ? "マスをタップして、その計算に答えよう" : "Tap a tile, then answer its sum")
        : (ja ? "▼ 下で答えてぬろう！" : "▼ Answer below to paint it!")}</p>
    </div>
  );
}
