"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RollUp } from "../util";
import { addTownCoins } from "../town";
import { track } from "@/lib/analytics";

/* ---------- the end-of-run results screen, shared by the arcade games ----------
   What makes "one more go" irresistible, in one place:
     - 1–3 stars against fixed goals, so there is always a next star to chase
     - a mystery chest of town coins to tap open (sometimes a jackpot)
     - a mastery level per game that fills up run after run
     - a nudge when you were close to your best or the next star
     - one "hot game" a day pays double
   It sits over the game; closing it leaves the game's own card underneath. */

export type ArcadeId = "runner" | "ninja" | "castle" | "sushi" | "konbini" | "rhythm";
export const ARCADE_IDS: ArcadeId[] = ["ninja", "runner", "castle", "sushi", "konbini", "rhythm"];

/* the score for 1, 2 and 3 stars */
const GOALS: Record<ArcadeId, [number, number, number]> = {
  runner: [100, 300, 600],
  ninja: [100, 300, 600],
  castle: [150, 400, 800],
  sushi: [1500, 4000, 8000],
  konbini: [5, 12, 20],
  rhythm: [600, 1500, 3000],
};
const NAMES: Record<ArcadeId, [string, string]> = {
  runner: ["Math Runner", "計算ランナー"],
  ninja: ["Ninja Slice", "忍者スライス"],
  castle: ["Castle Defense", "お城をまもれ"],
  sushi: ["Sushi Shop", "おすし屋さん"],
  konbini: ["Konbini Cashier", "コンビニのレジ"],
  rhythm: ["Rhythm Tap", "リズムタップ"],
};

export function starsFor(id: ArcadeId, score: number): number {
  return GOALS[id].filter((g) => score >= g).length;
}

/* mastery: every run earns XP; each level needs a little more than the last */
const XP_KEY = (id: ArcadeId) => `sutraSprint.mastery.${id}`;
export const levelNeed = (lv: number) => 40 + lv * 30;
export function masteryOf(xp: number): { level: number; into: number; need: number } {
  let level = 1, rest = xp;
  while (rest >= levelNeed(level)) { rest -= levelNeed(level); level++; }
  return { level, into: rest, need: levelNeed(level) };
}
export function readMastery(id: ArcadeId): number {
  try { return Number(localStorage.getItem(XP_KEY(id)) || 0); } catch { return 0; }
}
const STARS_KEY = (id: ArcadeId) => `sutraSprint.stars.${id}`;
export function readBestStars(id: ArcadeId): number {
  try { return Number(localStorage.getItem(STARS_KEY(id)) || 0); } catch { return 0; }
}

/* today's hot game (Japan's calendar day), the same for everyone */
export function hotGame(d = new Date()): ArcadeId {
  const day = Math.floor((d.getTime() + 9 * 3600_000) / 86400_000);
  return ARCADE_IDS[day % ARCADE_IDS.length];
}

const fmtScore = (id: ArcadeId, n: number) => (id === "sushi" ? `¥${n.toLocaleString("en-IN")}` : n.toLocaleString("en-IN"));

type Run = { stars: number; xpGain: number; before: number; after: number };

export function RunResults({
  game, score, prevBest, newBest, detail, lang, onAgain, sound,
}: {
  game: ArcadeId;
  score: number;
  prevBest: number;          /* the best before this run */
  newBest: boolean;
  detail?: string;           /* a game-specific line, e.g. "Wave 6 · 14 served" */
  lang: "en" | "ja";
  onAgain: () => void;
  sound?: { correct: () => void };
}) {
  const ja = lang === "ja";
  const [shown, setShown] = useState(true);
  /* worked out once per run from what was stored before it */
  const [run] = useState<Run>(() => {
    const stars = starsFor(game, score);
    const xpGain = 10 + stars * 15 + (newBest ? 20 : 0);
    const before = readMastery(game);
    return { stars, xpGain, before, after: before + xpGain };
  });
  const [chest, setChest] = useState<null | { coins: number; jackpot: boolean }>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    track("game_end", { game, score, stars: run.stars, new_best: newBest, mastery_level: masteryOf(run.after).level });
    try {
      localStorage.setItem(XP_KEY(game), String(run.after));
      if (run.stars > readBestStars(game)) localStorage.setItem(STARS_KEY(game), String(run.stars));
    } catch {}
  }, [game, run, score, newBest]);

  if (!shown) return null;

  const hot = hotGame() === game;
  const m0 = masteryOf(run.before), m1 = masteryOf(run.after);
  const levelUp = m1.level > m0.level;
  const goals = GOALS[game];
  const nextGoal = goals.find((g) => score < g);

  /* the nudge: close to the best, or close to the next star */
  let nudge: string | null = null;
  if (!newBest && prevBest > 0 && score >= prevBest * 0.75 && score < prevBest) {
    const gap = fmtScore(game, prevBest - score);
    nudge = ja ? `😤 ベストまであと ${gap}！もう一回でいけるよ` : `😤 Just ${gap} short of your best — one more go!`;
  } else if (nextGoal !== undefined) {
    const gap = fmtScore(game, nextGoal - score);
    nudge = ja ? `⭐ あと ${gap} で星${run.stars + 1}つ！` : `⭐ ${gap} more for ${run.stars + 1} star${run.stars + 1 > 1 ? "s" : ""}!`;
  } else {
    nudge = ja ? "🏆 星3つ！さすが！" : "🏆 Three stars — brilliant!";
  }

  function openChest() {
    if (chest) return;
    const jackpot = Math.random() < 0.12;
    let coins = 4 + run.stars * 6 + (newBest ? 10 : 0) + Math.floor(Math.random() * 6);
    if (jackpot) coins *= 3;
    if (hot) coins *= 2;
    addTownCoins(coins);
    track("chest_open", { game, coins, jackpot, hot_game: hot });
    sound?.correct();
    setChest({ coins, jackpot });
  }

  return (
    <div className="rr-wrap" role="dialog" aria-modal="true" aria-label={ja ? "けっか" : "Results"}>
      <div className={`rr-card${newBest ? " best" : ""}`}>
        <button className="rr-x" onClick={() => setShown(false)} aria-label={ja ? "とじる" : "Close"}>×</button>
        <div className="rr-game">{ja ? NAMES[game][1] : NAMES[game][0]}{hot && <span className="rr-hot">🔥 {ja ? "今日は2倍" : "2× today"}</span>}</div>
        {newBest && <div className="rr-ribbon">{ja ? "🎉 自己ベスト更新！" : "🎉 New best!"}</div>}

        <div className="rr-stars" aria-label={`${run.stars} / 3`}>
          {[0, 1, 2].map((i) => <span key={i} className={i < run.stars ? "on" : ""} style={{ animationDelay: `${0.35 + i * 0.28}s` }}>★</span>)}
        </div>
        <div className="rr-score mono">{game === "sushi" ? <RollUp to={score} prefix="¥" /> : <RollUp to={score} />}</div>
        <div className="rr-detail">
          {detail ? `${detail} · ` : ""}{ja ? "ベスト" : "best"} {fmtScore(game, Math.max(prevBest, score))}
        </div>
        {nudge && <div className="rr-nudge">{nudge}</div>}

        <div className="rr-mastery">
          <div className="rr-mastery-top">
            <b>{levelUp ? (ja ? `⬆️ レベルアップ！ Lv ${m1.level}` : `⬆️ Level up! Lv ${m1.level}`) : `Lv ${m1.level}`}</b>
            <span className="mono">+{run.xpGain} XP</span>
          </div>
          <div className="rr-bar"><i style={{ ["--from" as string]: `${levelUp ? 0 : (m0.into / m0.need) * 100}%`, width: `${(m1.into / m1.need) * 100}%` }} /></div>
        </div>

        {!chest ? (
          <button className="rr-chest" onClick={openChest}>
            <span className="rr-chest-box">🎁</span>
            <span>{ja ? "タップしてあける！" : "Tap to open!"}</span>
          </button>
        ) : (
          <div className={`rr-loot${chest.jackpot ? " jackpot" : ""}`}>
            {chest.jackpot && <b>{ja ? "💥 大当たり ×3！" : "💥 JACKPOT ×3!"}</b>}
            <span className="mono">+{chest.coins} 🪙</span>
            <small>{ja ? "町のコインに入ったよ" : "added to your Math Town"}</small>
          </div>
        )}

        <button className="btn btn-primary rr-again" onClick={() => { setShown(false); onAgain(); }}>
          {ja ? "もう一回 ▶" : "Play again ▶"}
        </button>
        <button className="rr-challenge" onClick={() => {
          const name = ja ? NAMES[game][1] : NAMES[game][0];
          window.dispatchEvent(new CustomEvent("vedank:invite", { detail: { extra: ja ? `「${name}」で ${fmtScore(game, score)} 点！きみはこえられる？` : `I scored ${fmtScore(game, score)} in ${name}. Can you beat me?` } }));
        }}>
          👥 {ja ? "友だちに挑戦！" : "Challenge a friend"}
        </button>
      </div>
    </div>
  );
}

/* the little "Lv 3 ★★☆" and "🔥 2×" marks on a game's card */
const noSub = () => () => {};
export function ArcadeMarks({ id, lang }: { id: ArcadeId; lang: "en" | "ja" }) {
  const xp = useSyncExternalStore(noSub, () => readMastery(id), () => 0);
  const stars = useSyncExternalStore(noSub, () => readBestStars(id), () => 0);
  const hot = useSyncExternalStore(noSub, () => hotGame() === id, () => false);
  return (
    <>
      {xp > 0 && (
        <span className="arc-badge">
          Lv {masteryOf(xp).level} <span className="st">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>
        </span>
      )}
      {hot && <span className="arc-hot">🔥 {lang === "ja" ? "今日2倍" : "2× today"}</span>}
    </>
  );
}
