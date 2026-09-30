"use client";

import { useState } from "react";
import { Mascot } from "../Mascot";
import type { useSound } from "../useSound";
import {
  useTown, build, demolish, claimWelcome, townPop, townRank, rankForPop, BUILDINGS, BUILDING, RANKS,
  TOWN_COLS, WELCOME_GIFT,
} from "../town";

type Sound = ReturnType<typeof useSound>;

/* ---------- 🏙️ Math Town ----------
   The town you build with the coins every game pays out (1 right answer =
   1 🪙). Tap an empty plot to build, tap a building to see it, play the game
   it belongs to, or knock it down for half its cost back. Population raises
   the town's rank, and each rank unlocks bigger buildings. */
export function TownView({ lang, sound, celebrate, onPlay }: {
  lang: "en" | "ja"; sound: Sound; celebrate: () => void; onPlay: (game: string) => void;
}) {
  const ja = lang === "ja";
  const town = useTown();
  const [plot, setPlot] = useState<number | null>(null);
  const [justBuilt, setJustBuilt] = useState<number | null>(null);
  const pop = townPop(town);
  const rank = townRank(town);
  const rankInfo = RANKS[rank - 1];
  const next = RANKS[rank];
  const pct = next ? Math.min(100, ((pop - rankInfo.min) / (next.min - rankInfo.min)) * 100) : 100;
  const selId = plot !== null ? town.plots[plot] : null;
  const sel = selId ? BUILDING(selId) : null;

  function doBuild(id: string) {
    if (plot === null) return;
    if (!build(plot, id)) { sound.wrong(); return; }
    sound.levelUp();
    setJustBuilt(plot); setTimeout(() => setJustBuilt(null), 900);
    setPlot(null);
    /* a new rank is worth confetti */
    if (rankForPop(pop + (BUILDING(id)?.pop ?? 0)) > rank) celebrate();
  }

  return (
    <div className="town">
      <div className="town-head">
        <div className="town-rank">
          <span className="town-rank-name">🏙️ {ja ? rankInfo.nameJa : rankInfo.name}</span>
          <span className="town-rank-sub mono">👥 {pop}{next ? ` / ${next.min}` : ""} · {ja ? "ランク" : "Rank"} {rank}</span>
          <span className="town-rank-bar"><i style={{ width: `${pct}%` }} /></span>
        </div>
        <div className="town-coins mono">🪙 {town.coins}</div>
      </div>

      {!town.welcome && (
        <button className="town-gift" onClick={() => { claimWelcome(); sound.levelUp(); celebrate(); }}>
          🎁 {ja ? `はじめてのプレゼント：${WELCOME_GIFT}🪙 をもらう` : `Welcome gift: claim ${WELCOME_GIFT}🪙`}
        </button>
      )}
      <p className="town-lede">{ja ? "どのゲームでも、正解1問 = 1🪙。コインでまちをつくろう！" : "Every right answer in any game = 1🪙. Spend coins to build your town!"}</p>

      <div className="town-map" style={{ gridTemplateColumns: `repeat(${TOWN_COLS}, 1fr)` }}>
        {town.plots.map((id, i) => {
          const b = id ? BUILDING(id) : null;
          return (
            <button key={i} className={`town-plot${b ? " built" : ""}${plot === i ? " sel" : ""}${justBuilt === i ? " pop" : ""}`}
              onClick={() => { setPlot(i); sound.click(); }} aria-label={b ? (ja ? b.nameJa : b.name) : (ja ? "空き地" : "Empty plot")}>
              {b ? <span className="town-bld">{b.emoji}</span> : <span className="town-empty">+</span>}
            </button>
          );
        })}
        <span className="town-mayor" aria-hidden="true"><Mascot animated mood="happy" /></span>
      </div>

      {plot !== null && (
        <>
          <div className="menu-overlay" onClick={() => setPlot(null)} />
          <div className="hint-sheet town-sheet" role="dialog" aria-modal="true">
            <button className="interest-close" aria-label={ja ? "閉じる" : "Close"} onClick={() => setPlot(null)}>✕</button>
            {sel ? (
              <>
                <div className="town-sheet-big">{sel.emoji}</div>
                <h3>{ja ? sel.nameJa : sel.name}</h3>
                <p className="town-sheet-sub">{sel.pop > 0 ? (ja ? `👥 ${sel.pop}人が住んでいます` : `👥 ${sel.pop} people live here`) : (ja ? "まちがきれいになる！" : "Makes the town prettier!")}</p>
                {sel.game && (
                  <button className="btn btn-primary" onClick={() => { const gid = sel.game!; setPlot(null); onPlay(gid); }}>
                    ▶ {ja ? "ここでゲームをする" : "Play the game here"}
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => { demolish(plot); sound.click(); setPlot(null); }}>
                  {ja ? `こわす（+${Math.floor(sel.cost / 2)}🪙）` : `Knock down (+${Math.floor(sel.cost / 2)}🪙)`}
                </button>
              </>
            ) : (
              <>
                <h3>{ja ? "なにを建てる？" : "What will you build?"}</h3>
                <div className="town-shop">
                  {BUILDINGS.map((b) => {
                    const locked = rank < b.rank;
                    const poor = town.coins < b.cost;
                    return (
                      <button key={b.id} className={`town-item${locked ? " locked" : poor ? " poor" : ""}`} disabled={locked || poor} onClick={() => doBuild(b.id)}>
                        <span className="town-item-emoji">{locked ? "🔒" : b.emoji}</span>
                        <span className="town-item-name">{ja ? b.nameJa : b.name}</span>
                        <span className="town-item-cost mono">{locked ? (ja ? RANKS[b.rank - 1].nameJa : RANKS[b.rank - 1].name) : `${b.cost}🪙`}</span>
                        {b.game && !locked && <span className="town-item-game">🎮</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
