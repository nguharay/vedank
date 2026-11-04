"use client";

import { useState } from "react";
import { Mascot } from "../Mascot";
import { Person } from "../Person";
import { TOWER_GOLD_EVERY, TOWER_MS, type PartyView } from "@/lib/game/party";

/* ---- 🏯 Sutra Tower: the skyline ----
   Every player's tower stands in a row (the tallest six and always me);
   mine is wider with the mascot on top. A right answer drops a block from
   above; a gold block sparkles; a wrecking ball swings in from the side and
   the top block tumbles off. When I hold a ball the rivals' towers become
   targets with a crosshair, and a tap drops it. The last 15 s turn the sky
   to sunset: boss time, every block counts double. */
const PALETTE = ["#ff7a59", "#5bc8f5", "#9ad35b", "#c48cff", "#ffb84a", "#ff8fb8", "#6ee7d8"];
const ME_COLOR = "#ffd84a";

export function TowerStage({ room, ja, now, pulse, onThrow }: {
  room: PartyView; ja: boolean; now: number; pulse: number; onThrow: (key: string) => void;
}) {
  const tw = room.tower;
  const me = room.players.find((p) => p.me);
  const myBalls = me && tw ? tw.by[me.key]?.balls ?? 0 : 0;
  const myStreak = me && tw ? tw.by[me.key]?.streak ?? 0 : 0;
  const myGold = me && tw ? tw.by[me.key]?.gold ?? 0 : 0;

  /* the lanes: everyone when they fit, else the tallest six and me */
  const all = [...room.players];
  const lanes = all.length <= 7 ? all : (() => {
    const top = [...all].sort((a, b) => b.score - a.score).slice(0, 6);
    if (me && !top.includes(me)) top[top.length - 1] = me;
    return all.filter((p) => top.includes(p));
  })();
  /* block size: the tallest tower fills the stage; blocks shrink as it grows */
  const topH = Math.max(5, ...lanes.map((p) => p.score));
  const unit = Math.max(7, Math.min(30, Math.floor(165 / topH)));
  const leader = room.status !== "done" && lanes.length ? [...all].sort((a, b) => b.score - a.score)[0] : null;
  const leading = leader && leader.score > 0 && all.filter((p) => p.score === leader.score).length === 1 ? leader.key : null;

  /* a wrecking ball swings on a lane whose hit count just went up, and a
     "gold!" flash when my gold count does: both are derived from the previous
     view while rendering (no effects), the React "store previous props" way */
  const [seen, setSeen] = useState<{ hits: Record<string, { n: number; at: number }>; gold: number; goldAt: number }>({ hits: {}, gold: myGold, goldAt: 0 });
  if (tw) {
    let changed = false;
    const hits = { ...seen.hits };
    for (const [key, t] of Object.entries(tw.by)) {
      const prev = hits[key];
      if (!prev) { hits[key] = { n: t.hits, at: 0 }; changed = true; }
      else if (t.hits > prev.n) { hits[key] = { n: t.hits, at: now }; changed = true; }
    }
    let gold = seen.gold, goldAt = seen.goldAt;
    if (myGold > seen.gold) { gold = myGold; goldAt = now; changed = true; }
    else if (myGold < seen.gold) { gold = myGold; changed = true; }
    if (changed) setSeen({ hits, gold, goldAt });
  }
  const hitAt = (key: string) => seen.hits[key]?.at ?? 0;
  const goldAt = seen.goldAt;

  if (!tw) return null;
  const left = Math.max(0, tw.endsAt - now);
  const frac = Math.min(1, left / TOWER_MS);
  const boss = tw.bossOn;
  const canTarget = myBalls > 0 && room.status !== "done";

  return (
    <div className={`tower-field${boss ? " boss" : ""}${canTarget ? " aiming" : ""}`}>
      <span className="tower-sun" aria-hidden="true" />
      <span className="tower-hills" aria-hidden="true"><i /><i /><i /></span>
      <span className="tower-birds" aria-hidden="true">︶︶ ︶</span>
      <span className="tower-cloud c1" aria-hidden="true" /><span className="tower-cloud c2" aria-hidden="true" /><span className="tower-cloud c3" aria-hidden="true" />
      <div className="tower-clock" aria-hidden="true"><i style={{ width: `${frac * 100}%` }} /></div>

      {boss && room.status !== "done" && <div className="tower-banner boss">⚡ {ja ? "ボスタイム！ブロック2倍" : "BOSS TIME: blocks count ×2"}</div>}
      {!boss && canTarget && <div className="tower-banner ball">🪨 {ja ? `鉄球 ×${myBalls}：ライバルのタワーをタップ！` : `Wrecking ball ×${myBalls}: tap a rival's tower!`}</div>}
      {!boss && !canTarget && goldAt && now - goldAt < 900 ? <div className="tower-banner gold">✨ {ja ? "ゴールドブロック！" : "GOLD BLOCK!"}</div> : null}

      <div className="tower-row">
        {lanes.map((p) => {
          const t = tw.by[p.key];
          const h = t?.height ?? 0;
          const color = p.me ? ME_COLOR : PALETTE[all.indexOf(p) % PALETTE.length];
          const hit = hitAt(p.key) > 0 && now - hitAt(p.key) < 900;
          const target = canTarget && !p.me;
          const winner = room.status === "done" && tw.winnerKeys.includes(p.key);
          const Tag = target ? "button" : "div";
          return (
            <Tag key={p.key} className={`tower-lane${p.me ? " me" : ""}${hit ? " hit" : ""}${target ? " target" : ""}${winner ? " winner" : ""}`}
              onClick={target ? () => onThrow(p.key) : undefined} aria-label={target ? (ja ? `${p.name}のタワーに鉄球` : `Drop the ball on ${p.name}`) : undefined}>
              <span className="tower-col" style={{ height: h * unit + 10 }}>
                {Array.from({ length: h }, (_, i) => {
                  const fromTop = h - 1 - i;
                  const gold = fromTop < (t?.gold ?? 0);
                  return <i key={i === h - 1 ? `top${h}` : i} className={`tower-block${gold ? " gold" : ""}${i === h - 1 && p.me && pulse ? " drop" : ""}`} style={{ height: unit, background: gold ? undefined : color }} />;
                })}
                <span className="tower-roof" style={{ bottom: h * unit - 1, borderBottomColor: color }} />
                <span className="tower-kid" style={{ bottom: h * unit + 9 }}>
                  {p.me ? <Mascot animated={false} mood={hit ? "sad" : "excited"} /> : <Person seed={all.indexOf(p) * 11 + 5} mood={hit ? "cross" : "happy"} size={26} />}
                </span>
                {hit && <span key={t?.hits} className="tower-ball" aria-hidden="true">🪨</span>}
                {hit && <span key={`d${t?.hits}`} className="tower-debris" aria-hidden="true" style={{ bottom: h * unit, background: color }} />}
                {target && <span className="tower-aim" aria-hidden="true" />}
              </span>
              <span className="tower-name">{winner || leading === p.key ? "👑 " : ""}{p.me ? (ja ? "きみ" : "You") : p.name}</span>
              <b className="tower-h mono">{h}</b>
            </Tag>
          );
        })}
      </div>
      <span className="tower-ground" aria-hidden="true" />

      {me && room.status !== "done" && (
        <div className="tower-streak" aria-label={ja ? "連続正解" : "Streak"}>
          {Array.from({ length: TOWER_GOLD_EVERY }, (_, i) => <i key={i} className={i < myStreak % TOWER_GOLD_EVERY || (myStreak > 0 && myStreak % TOWER_GOLD_EVERY === 0) ? "on" : ""} />)}
          <small>{ja ? `${TOWER_GOLD_EVERY}連続でゴールド` : `${TOWER_GOLD_EVERY} in a row = gold`}</small>
        </div>
      )}
    </div>
  );
}
