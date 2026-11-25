"use client";

import { useState } from "react";
import { haptic } from "../util";
import { TARGET_ROUNDS, TARGET_MAX_TRIES, T_OPS, tApply, tText, type TOp, type TStep } from "@/lib/game/target";
import type { PartyView } from "@/lib/game/party";

/* ---- 🏹 Target Hunt: the board ----
   The target on top, the five numbers as tiles, and the four signs. Tap a
   number, a sign, then another number: the two tiles fold into a new one
   carrying the result, which can be used again. Every new result that is
   closer than my best so far is sent at once (onTry), so there is no "send"
   button to forget. ↶ takes back the last step, ↺ starts over. When someone
   hits it exactly, a banner and the shortened clock say so. In the reveal,
   everyone's working for the round, and the shortest way. */

type Props = {
  room: PartyView; ja: boolean; now: number;
  onTry: (round: number, steps: TStep[]) => void;
};

export function TargetStage({ room, ja, now, onTry }: Props) {
  const t = room.target!;
  /* a fresh board each round */
  return <Board key={`${room.round}:${t.r}`} room={room} ja={ja} now={now} onTry={onTry} />;
}

function Board({ room, ja, now, onTry }: Props) {
  const t = room.target!;
  const [pool, setPool] = useState<number[]>(t.nums);
  const [used, setUsed] = useState<boolean[]>(t.nums.map(() => false));
  const [steps, setSteps] = useState<TStep[]>([]);
  const [a, setA] = useState<number | null>(null);
  const [op, setOp] = useState<TOp | null>(null);
  const [best, setBest] = useState<{ value: number; dist: number; n: number } | null>(null);
  const [oops, setOops] = useState<string | null>(null);
  const secs = (at: number) => Math.max(0, Math.ceil((at - now) / 1000));
  const playing = t.phase === "play" && room.status === "playing";
  const hitter = t.hitKey ? room.players.find((p) => p.key === t.hitKey) : null;

  function tapNum(i: number) {
    if (!playing || used[i]) return;
    setOops(null);
    if (a === null || op === null || a === i) { setA(a === i ? null : i); haptic(6); return; }
    const v = tApply(pool[a], op, pool[i]);
    if (v === null) {
      setOops(op === "−" ? (ja ? "大きい数から引こう（答えは0より大きく）" : "Take the smaller from the bigger") : (ja ? "わり切れるときだけ ÷ できるよ" : "÷ only when it divides exactly"));
      haptic(30);
      return;
    }
    const nextSteps: TStep[] = [...steps, [a, op, i]];
    const nu = [...used]; nu[a] = true; nu[i] = true; nu.push(false);
    setPool([...pool, v]); setUsed(nu); setSteps(nextSteps); setA(pool.length); setOp(null);
    haptic(v === t.target ? [15, 30, 15] : 10);
    const dist = Math.abs(v - t.target);
    if (!best || dist < best.dist || (dist === best.dist && nextSteps.length < best.n)) {
      if (t.myTries < TARGET_MAX_TRIES) { setBest({ value: v, dist, n: nextSteps.length }); onTry(t.r, nextSteps); }
    }
  }
  function undo() {
    if (!steps.length) return;
    const [i, , j] = steps[steps.length - 1];
    const nu = used.slice(0, -1); nu[i] = false; nu[j] = false;
    setPool(pool.slice(0, -1)); setUsed(nu); setSteps(steps.slice(0, -1)); setA(null); setOp(null); setOops(null);
  }
  function reset() { setPool(t.nums); setUsed(t.nums.map(() => false)); setSteps([]); setA(null); setOp(null); setOops(null); }

  const nameOf = (key: string) => {
    const p = room.players.find((x) => x.key === key);
    return p ? (p.me ? (ja ? "きみ" : "You") : p.name) : "?";
  };

  return (
    <div className="tg">
      <div className="tg-top">
        <span className="tg-round mono">{ja ? `ラウンド ${t.r + 1}/${TARGET_ROUNDS}` : `Round ${t.r + 1}/${TARGET_ROUNDS}`}</span>
        <span className="tg-target mono" aria-label={ja ? `ターゲット ${t.target}` : `Target ${t.target}`}>🏹 {t.target}</span>
        <span className={`tg-clock mono${hitter && playing ? " hot" : ""}`}>⏱ {playing ? secs(t.endsAt) : secs(t.nextAt)}s</span>
      </div>

      {playing && hitter && (
        <div className="tg-hit">{hitter.me
          ? (ja ? "🎯 ぴったり！ほかの人はあと少し…" : "🎯 You hit it! The others are racing the clock…")
          : (ja ? `🎯 ${hitter.name} がぴったり！のこり ${secs(t.endsAt)}秒` : `🎯 ${hitter.name} hit it! ${secs(t.endsAt)}s left`)}</div>
      )}

      {playing ? (
        <>
          <div className="tg-tiles">
            {pool.map((v, i) => (
              <button key={i} className={`tg-tile mono${i >= t.nums.length ? " made" : ""}${a === i ? " sel" : ""}${v === t.target ? " bull" : ""}`}
                disabled={used[i]} onClick={() => tapNum(i)} aria-pressed={a === i}>{v}</button>
            )).filter((_, i) => !used[i])}
          </div>
          <div className="tg-ops">
            {T_OPS.map((o) => (
              <button key={o} className={`tg-op${op === o ? " on" : ""}`} disabled={a === null} onClick={() => { setOp(op === o ? null : o); setOops(null); haptic(6); }}>{o}</button>
            ))}
            <button className="tg-op tg-undo" onClick={undo} disabled={!steps.length} aria-label={ja ? "ひとつもどす" : "Undo"}>↶</button>
            <button className="tg-op tg-undo" onClick={reset} disabled={!steps.length} aria-label={ja ? "はじめから" : "Start over"}>↺</button>
          </div>
          <div className="tg-work mono">
            {steps.length ? tText(t.nums, steps) : (a !== null
              ? (ja ? `${pool[a]} をえらんだ。つぎは記号、そして数` : `${pool[a]} picked. Now a sign, then a number`)
              : (ja ? "数をタップ → 記号 → 数。答えがまた数になるよ" : "Tap a number → a sign → a number. The answer becomes a new number"))}
          </div>
          {oops && <div className="tg-oops">{oops}</div>}
          {best && (
            <div className={`tg-best${best.dist === 0 ? " exact" : ""}`}>{best.dist === 0
              ? (ja ? `🎯 ${best.value} ぴったり！（${best.n}ステップ）もっと短くできる？` : `🎯 ${best.value} exactly! (${best.n} steps) Can you do it in fewer?`)
              : (ja ? `いちばん近い: ${best.value}（あと ${best.dist}）` : `Closest so far: ${best.value} (${best.dist} away)`)}</div>
          )}
        </>
      ) : (
        <div className="tg-reveal">
          <div className="tg-reveal-head">{ja ? "みんなの計算" : "Everyone's working"}</div>
          {t.reveal && t.reveal.length ? (
            <ol>
              {t.reveal.map((x) => (
                <li key={x.key} className={x.exact ? "exact" : undefined}>
                  <b>{nameOf(x.key)}</b>
                  <span className="mono">{x.text}</span>
                  <em className="mono">+{x.pts}{x.bonus ? (ja ? " 最短!" : " fewest!") : ""}</em>
                </li>
              ))}
            </ol>
          ) : <p>{ja ? "だれも答えを送らなかった…" : "Nobody sent an answer…"}</p>}
          {t.solution && <div className="tg-sol">{ja ? "💡 最短の道: " : "💡 Shortest way: "}<span className="mono">{t.solution}</span></div>}
          {room.status === "playing" && <div className="tg-next">{ja ? `次のラウンドまで ${secs(t.nextAt)}秒` : `Next round in ${secs(t.nextAt)}s`}</div>}
        </div>
      )}
    </div>
  );
}
