"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mascot } from "./Mascot";
import { Person } from "./Person";
import { QUICK_GAMES } from "@/lib/game/minigames";

/* ---------- "watch first" demos ----------
   The first few times a game is opened, a short scripted demo plays before
   it: a finger taps (or drags) the right thing, the game reacts, and three
   captions say what is going on. Then "Your turn!" — start, or watch again.
   Like Ninja Slice's demo, but drawn here on a small stage of its own so the
   games themselves are untouched. Everything is in px on a 300×260 stage. */

type L = [string, string];                       /* [en, ja] */
type Ctx = { hits: number; hit: boolean; win: boolean };
type Tile = { x: number; y: number; w: number; h: number; label: ReactNode | ((c: Ctx) => ReactNode); cls?: string; back?: boolean };
type Tap = number | { i: number; to: { x: number; y: number } };
type Demo = {
  title: L;
  scene: string;
  prompt?: L | string;
  promptAfter?: number;                          /* show the prompt once this many taps are done */
  decor?: (c: Ctx) => ReactNode;
  tiles: Tile[];
  taps: Tap[];
  badges?: boolean;                              /* number the tapped tiles 1, 2, 3… */
  note?: string;                                 /* the worked answer, shown at the end */
  caps: [L, L, L];
  turn: L;
};

const SEEN_TIMES = 3;
const seenKey = (id: string) => `sutraSprint.demo.${id}`;
export function demoDue(id: string): boolean {
  if (!DEMOS[id]) return false;
  try { return Number(localStorage.getItem(seenKey(id)) || 0) < SEEN_TIMES; } catch { return false; }
}
export function markDemoSeen(id: string) {
  try { localStorage.setItem(seenKey(id), String(Number(localStorage.getItem(seenKey(id)) || 0) + 1)); } catch {}
}

/* layout helpers */
const row3 = (labels: ReactNode[], y = 196): Tile[] => labels.map((label, i) => ({ x: 14 + i * 94, y, w: 84, h: 48, label }));
const row2 = (labels: ReactNode[], y = 170, h = 56): Tile[] => labels.map((label, i) => ({ x: 28 + i * 128, y, w: 116, h, label }));
const grid2 = (labels: ReactNode[], y0 = 66, back = false): Tile[] =>
  labels.map((label, i) => ({ x: 24 + (i % 2) * 132, y: y0 + Math.floor(i / 2) * 82, w: 120, h: 70, label, cls: "dm-card", back }));

const WATCH: L = ["👀 Watch", "👀 見ててね"];

/* seven-segment matchstick digits for the sprint demo */
const SEG: Record<string, string> = { "0": "abcdef", "1": "bc", "8": "abcdefg", "9": "abcdfg" };
function Digit({ d, x, y, skip = "" }: { d: string; x: number; y: number; skip?: string }) {
  return (
    <span className="dm-digit" style={{ left: x, top: y }}>
      {SEG[d].split("").filter((s) => !skip.includes(s)).map((s) => <i key={s} className={`sg ${s}`} />)}
    </span>
  );
}

const QUICK_EXAMPLES: Record<string, { prompt: string; tiles: Tile[]; tap: number; note: string }> = {
  tf: { prompt: "7 × 8 = 54", tiles: row2(["○", "×"]).map((t) => ({ ...t, cls: "dm-ans big" })), tap: 1, note: "7 × 8 = 56" },
  missing: { prompt: "□ + 15 = 40", tiles: row3(["35", "25", "15"]), tap: 1, note: "40 − 15 = 25" },
  lastdigit: { prompt: "37 × 23 → ?", tiles: row3(["1", "3", "9"]), tap: 0, note: "7 × 3 = 21 → 1" },
  digitsum: { prompt: "487 → ?", tiles: row3(["1", "10", "19"]), tap: 0, note: "4+8+7 = 19 → 1+9 = 10 → 1" },
  div9: { prompt: "4,383 ÷ 9 ?", tiles: row2(["○", "×"]).map((t) => ({ ...t, cls: "dm-ans big" })), tap: 0, note: "4+3+8+3 = 18 ✓" },
  sq5: { prompt: "35²", tiles: row3(["1,225", "925", "1,525"]), tap: 0, note: "3 × 4 = 12 → 1225" },
  x11: { prompt: "43 × 11", tiles: row3(["443", "473", "4,733"]), tap: 1, note: "4 (4+3) 3 → 473" },
  estimate: { prompt: "49 × 21 ≈ ?", tiles: row3(["500", "1,000", "2,000"]), tap: 1, note: "≈ 50 × 20 = 1,000" },
};

const DEMOS: Record<string, Demo> = {
  runner: {
    title: ["🏃 Math Runner", "🏃 計算ランナー"], scene: "dm-run", prompt: "4 + 5",
    decor: () => (<><span className="dm-ground" /><span className="dm-hero"><Mascot animated={false} mood="excited" /></span><span className="dm-rock">🪨</span></>),
    tiles: row3(["8", "9", "12"]), taps: [1],
    caps: [WATCH, ["👆 Tap the answer before the rock arrives", "👆 岩が来る前に答えをタップ"], ["🦘 Right = jump! Wrong = trip", "🦘 正解でジャンプ！まちがえるところぶ"]],
    turn: ["Tap the answer to jump every obstacle.", "答えをタップして、じゃまものをジャンプ！"],
  },
  race: {
    title: ["🏁 Math Race", "🏁 計算レース"], scene: "dm-race", prompt: "7 × 3",
    decor: () => (<>
      <span className="dm-lane l1" /><span className="dm-lane l2" /><span className="dm-lane l3" /><span className="dm-goal">GOAL</span>
      <span className="dm-racer r1"><Person seed={11} mood="happy" size={40} /></span>
      <span className="dm-racer r2 me"><Mascot animated={false} mood="excited" /></span>
      <span className="dm-racer r3"><Person seed={4} mood="happy" size={40} /></span>
      <span className="dm-dash">💨</span>
    </>),
    tiles: row3(["21", "24", "18"]), taps: [0],
    caps: [WATCH, ["👆 Tap the right answer", "👆 正しい答えをタップ"], ["💨 Every right answer is a dash — beat them to GOAL!", "💨 正解でダッシュ！先にゴールしよう"]],
    turn: ["Answer fast to dash past your rivals.", "はやく答えて、ライバルをぬかそう！"],
  },
  sushi: {
    title: ["🍣 Sushi Shop", "🍣 おすし屋さん"], scene: "dm-sushi", prompt: "¥110 + ¥150 = ?", promptAfter: 1,
    decor: (c) => (<>
      <span className="dm-belt">🍣 🍤 🐟 🍣 🥒</span>
      <span className="dm-plate p1">¥110</span><span className="dm-plate p2">¥150</span>
      {!c.hits && <span className="dm-bubble">{"🙋"}</span>}
      {c.win && <span className="dm-heart">😊 ♥</span>}
    </>),
    tiles: [
      { x: 30, y: 62, w: 76, h: 86, cls: "dm-who", label: (c) => <Person seed={3} mood={c.win ? "happy" : "wait"} size={70} /> },
      ...row3(["¥250", "¥260", "¥270"]),
    ],
    taps: [0, 2],
    caps: [WATCH, ["👆 Tap the customer with a raised hand, then the bill", "👆 手をあげたお客さん → お会計をタップ"], ["😊 Right bill = happy customer. 3 angry ones close the shop!", "😊 正解でにっこり。3人おこらせると閉店！"]],
    turn: ["Tap customers with a raised hand and add up their plates.", "手をあげたお客さんをタップして、お皿の合計を計算しよう。"],
  },
  castle: {
    title: ["🏯 Castle Defense", "🏯 お城をまもれ！"], scene: "dm-castle", prompt: "8 + 6",
    decor: () => (<><span className="dm-ground" /><span className="dm-keep">🏯</span><span className="dm-mon">👾<em>8 + 6</em></span><span className="dm-arrow">➶</span><span className="dm-poof">💥</span></>),
    tiles: row3(["14", "15", "12"]), taps: [0],
    caps: [WATCH, ["👆 Answer the front monster's sum", "👆 先頭のモンスターの計算に答える"], ["🏹 Right answer fires an arrow!", "🏹 正解で矢が飛ぶ！"]],
    turn: ["Answer each monster's sum before it reaches the castle.", "モンスターがお城に着く前に答えよう！"],
  },
  konbini: {
    title: ["🏪 Konbini Cashier", "🏪 コンビニのレジ"], scene: "dm-shop", prompt: "¥500 − ¥320 = ?",
    decor: (c) => (<>
      <span className="dm-counter" />
      <span className="dm-who-fixed"><Person seed={7} mood={c.win ? "happy" : "wait"} size={70} /></span>
      <span className="dm-say">{"¥500 💴"}</span><span className="dm-price">¥320</span>
    </>),
    tiles: row3(["¥180", "¥280", "¥220"]), taps: [0],
    caps: [WATCH, ["👆 Work out the change and tap it", "👆 おつりを計算してタップ"], ["⚡ Quick and right keeps customers happy", "⚡ はやく正しく！お客さんがよろこぶ"]],
    turn: ["Give every customer the right change — fast!", "お客さんにすばやく正しいおつりをわたそう！"],
  },
  crossword: {
    title: ["🧩 Number Crossword", "🧩 数字クロスワード"], scene: "dm-cross",
    decor: (c) => (<>
      <span className="dm-sum" style={{ left: 180, top: 52 }}>= 8</span><span className="dm-sum" style={{ left: 180, top: 106 }}>= 6</span>
      <span className="dm-sum" style={{ left: 74, top: 152 }}>5</span><span className="dm-sum" style={{ left: 128, top: 152 }}>9</span>
      {c.win && <span className="dm-ok">✓</span>}
    </>),
    tiles: [
      { x: 70, y: 44, w: 46, h: 46, label: "3", cls: "dm-cell" },
      { x: 124, y: 44, w: 46, h: 46, label: (c) => (c.hits >= 2 ? "5" : ""), cls: "dm-cell blank" },
      { x: 70, y: 98, w: 46, h: 46, label: "2", cls: "dm-cell" },
      { x: 124, y: 98, w: 46, h: 46, label: "4", cls: "dm-cell" },
      { x: 20, y: 200, w: 52, h: 44, label: "4", cls: "dm-key" },
      { x: 80, y: 200, w: 52, h: 44, label: "5", cls: "dm-key" },
      { x: 140, y: 200, w: 52, h: 44, label: "6", cls: "dm-key" },
      { x: 200, y: 200, w: 82, h: 44, label: "Check", cls: "dm-key go" },
    ],
    taps: [1, 5, 7],
    caps: [WATCH, ["👆 Tap a blank, then pick a number", "👆 空いたマス → 数字をタップ"], ["✅ Every row and column must add up", "✅ たても横も合計があえばクリア"]],
    turn: ["Fill the blanks so every row and column adds up.", "たて・よこの合計があうようにマスをうめよう。"],
  },
  rhythm: {
    title: ["🎵 Rhythm Tap", "🎵 リズムタップ"], scene: "dm-rhythm", prompt: "3 × 4",
    decor: () => (<>
      <span className="dm-line" />
      <span className="dm-note n0">12</span><span className="dm-note n1">9</span><span className="dm-note n2">15</span>
      <span className="dm-perfect">PERFECT!</span>
    </>),
    tiles: [0, 1, 2].map((i) => ({ x: 14 + i * 94, y: 196, w: 84, h: 48, label: "", cls: `dm-pad p${i}` })),
    taps: [0],
    caps: [WATCH, ["👆 When the answer reaches the line, tap its lane", "👆 答えが線に来たら、そのレーンをタップ"], ["🎵 Right on the beat = Perfect!", "🎵 ぴったりでパーフェクト！"]],
    turn: ["Tap the lane of the right answer on the beat. Sound on!", "リズムにあわせて答えのレーンをタップ。音を出してね！"],
  },
  pop: {
    title: ["🎈 Number Pop", "🎈 かずの風船ポップ"], scene: "dm-sky", prompt: "6 + 7",
    tiles: ["11", "13", "15"].map((label, i) => ({ x: 26 + i * 92, y: 70, w: 64, h: 80, label, cls: `dm-balloon b${i}` })),
    taps: [1],
    caps: [WATCH, ["👆 Pop the balloon that equals the sum", "👆 答えの風船をポップ"], ["🎈 Three misses and it's over", "🎈 3回ミスで終わり"]],
    turn: ["Pop the balloon with the answer before it floats away.", "風船が飛んでいく前に、答えの風船をポップ！"],
  },
  match: {
    title: ["🃏 Number Match", "🃏 ナンバーマッチ"], scene: "dm-table",
    tiles: grid2(["3 × 4", "10", "12", "5 + 5"]), taps: [0, 2, 3, 1],
    caps: [WATCH, ["👆 Tap a sum, then its answer", "👆 式 → その答えをタップ"], ["🃏 Pair them all!", "🃏 ぜんぶペアにしよう！"]],
    turn: ["Pair every sum with its answer.", "式と答えをペアにしよう。"],
  },
  bigger: {
    title: ["⚖️ Which is Bigger?", "⚖️ どっちが大きい？"], scene: "dm-table", prompt: ["Which is bigger?", "どっちが大きい？"],
    tiles: row2(["9 × 9", "80 + 2"], 92, 80).map((t) => ({ ...t, cls: "dm-card" })), taps: [1], note: "81 < 82",
    caps: [WATCH, ["👆 Tap the bigger one", "👆 大きいほうをタップ"], ["⚠️ One slip ends the run!", "⚠️ 1回まちがえたら終わり！"]],
    turn: ["Tap the larger of the two. Don't slip!", "大きいほうをタップ。まちがえないで！"],
  },
  memory: {
    title: ["🎴 Memory Pairs", "🎴 神経衰弱"], scene: "dm-table",
    tiles: grid2(["6 × 2", "9", "12", "3 × 3"], 66, true), taps: [0, 2, 3, 1],
    caps: [WATCH, ["👆 Flip two cards: a sum and its answer", "👆 2まいめくって、式と答えを見つけよう"], ["🧠 Fewer turns = better score", "🧠 少ない回数ほどいいスコア"]],
    turn: ["Remember where each card is and find the pairs.", "カードの場所をおぼえて、ペアを見つけよう。"],
  },
  odd: {
    title: ["🔍 Odd One Out", "🔍 仲間はずれ"], scene: "dm-table",
    tiles: grid2(["23", "41", "50", "33"]), taps: [3], note: "2+3 · 4+1 · 5+0 = 5   3+3 = 6",
    caps: [WATCH, ["👆 Three have the same digit sum — tap the odd one", "👆 3つは数字の合計が同じ。ちがう1つをタップ"], ["🔍 No need to work out everything", "🔍 ぜんぶ計算しなくてOK"]],
    turn: ["Spot the number whose digits add up differently.", "数字の合計がちがう1つを見つけよう。"],
  },
  sortg: {
    title: ["📊 Smallest First", "📊 小さい順"], scene: "dm-table", badges: true,
    tiles: grid2(["2 × 3", "9 + 1", "4 × 4", "5 + 3"]), taps: [0, 3, 1, 2], note: "6 → 8 → 10 → 16",
    caps: [WATCH, ["👆 Tap from smallest to largest", "👆 小さい順にタップ"], ["📊 Estimate — you don't need every exact answer", "📊 見積もりでOK"]],
    turn: ["Tap the four answers in order, smallest first.", "4つの答えを小さい順にタップしよう。"],
  },
  sprint: {
    title: ["🔥 Matchstick Sprint", "🔥 マッチ棒スプリント"], scene: "dm-sticks", note: "9 + 1 = 10",
    decor: (c) => (<>
      <Digit d="8" x={22} y={82} skip="e" />
      <span className="dm-minus" style={{ left: 74, top: 104 }} />
      <Digit d="1" x={118} y={82} />
      <span className="dm-eq" style={{ left: 160, top: 98 }} /><span className="dm-eq" style={{ left: 160, top: 112 }} />
      <Digit d="1" x={196} y={82} /><Digit d="0" x={236} y={82} />
      {c.win && <span className="dm-ok">✓</span>}
    </>),
    tiles: [{ x: 22, y: 113, w: 6, h: 23, label: "", cls: "dm-stick" }],
    taps: [{ i: 0, to: { x: 86, y: 96 } }],
    caps: [WATCH, ["✋ Drag one matchstick to make it true", "✋ マッチ棒を1本動かして正しい式に"], ["✨ 8 → 9 and − → +", "✨ 8 が 9、− が + に！"]],
    turn: ["Move matchsticks to make each equation true — against the clock.", "マッチ棒を動かして式を正しく。タイムアタック！"],
  },
  ...Object.fromEntries(QUICK_GAMES.filter((g) => QUICK_EXAMPLES[g.id]).map((g) => {
    const ex = QUICK_EXAMPLES[g.id];
    const d: Demo = {
      title: [`${g.icon} ${g.name}`, `${g.icon} ${g.nameJa}`], scene: "dm-table", prompt: ex.prompt,
      tiles: ex.tiles, taps: [ex.tap], note: ex.note,
      caps: [WATCH, [`👆 ${g.hintEn}`, `👆 ${g.hintJa}`], ["⚡ Answer fast to build a streak", "⚡ はやく答えて連続正解をのばそう"]],
      turn: [g.blurb, g.blurbJa],
    };
    return [g.id, d];
  })),
};

const START = { x: 262, y: 300 };   /* just below the stage, so it slides in */
const centre = (t: Tile) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 });

export function GameDemo({ id, lang, onStart, onClose }: { id: string; lang: "en" | "ja"; onStart: () => void; onClose: () => void }) {
  const ja = lang === "ja";
  const d = DEMOS[id];
  const tx = (l: L | string) => (typeof l === "string" ? l : ja ? l[1] : l[0]);
  const [run, setRun] = useState(0);
  const [hits, setHits] = useState(0);
  const [cap, setCap] = useState(0);
  const [win, setWin] = useState(false);
  const [done, setDone] = useState(false);
  const [finger, setFinger] = useState({ ...START, press: false });
  const [moved, setMoved] = useState<Record<number, { x: number; y: number }>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* the script: walk the finger to each tap target in turn */
  useEffect(() => {
    if (!d) return;
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    let t = 600;
    at(t, () => setCap(1));
    d.taps.forEach((tap, k) => {
      const i = typeof tap === "number" ? tap : tap.i;
      const c = centre(d.tiles[i]);
      at(t, () => setFinger({ ...c, press: false }));
      t += 650;
      at(t, () => { setFinger({ ...c, press: true }); setHits(k + 1); });
      at(t + 180, () => setFinger({ ...c, press: false }));
      if (typeof tap !== "number") {
        const to = tap.to;
        const tile = d.tiles[i];
        at(t + 260, () => { setFinger({ x: to.x + tile.w / 2, y: to.y + tile.h / 2, press: true }); setMoved((m) => ({ ...m, [i]: to })); });
        t += 900;
      }
      t += 400;
    });
    at(t, () => { setWin(true); setCap(2); });
    at(t + 2000, () => setDone(true));
    const list = timers.current;
    return () => { list.forEach(clearTimeout); timers.current = []; };
  }, [run, d]);

  if (!d) return null;
  const tappedIdx = d.taps.map((tp) => (typeof tp === "number" ? tp : tp.i));
  const hitSet = tappedIdx.slice(0, hits);

  function again() {
    setHits(0); setCap(0); setWin(false); setDone(false); setMoved({}); setFinger({ ...START, press: false });
    setRun((r) => r + 1);
  }
  const ctx = (i: number): Ctx => ({ hits, hit: hitSet.includes(i), win });
  const showPrompt = d.prompt && hits >= (d.promptAfter ?? 0);

  return (
    <div className="dm-wrap" role="dialog" aria-modal="true" aria-label={tx(d.title)}>
      <div className="dm-box">
        <div className="dm-head">
          <b>{tx(d.title)}</b>
          <span>{ja ? "あそびかた" : "How to play"}</span>
          <button className="dm-x" onClick={onClose} aria-label={ja ? "とじる" : "Close"}>×</button>
        </div>
        <div key={run} className={`dm-stage ${d.scene}${win ? " win" : ""}`}>
          {showPrompt && <div className="dm-prompt mono">{tx(d.prompt!)}</div>}
          {d.decor?.(ctx(-1))}
          {d.tiles.map((t, i) => {
            const c = ctx(i);
            const pos = moved[i] ?? t;
            const order = hitSet.indexOf(i);
            const label = typeof t.label === "function" ? t.label(c) : t.label;
            return (
              <span key={i} className={`dm-tile ${t.cls ?? "dm-ans"}${c.hit ? " hit" : ""}${t.back ? " back" : ""}${c.hit && win ? " good" : ""}`}
                style={{ left: pos.x, top: pos.y, width: t.w, height: t.h }}>
                {t.back ? <><i className="dm-front mono">{label}</i><i className="dm-rear">?</i></> : <i className="mono">{label}</i>}
                {d.badges && order >= 0 && <em className="dm-badge">{order + 1}</em>}
              </span>
            );
          })}
          {win && <span className="dm-plus">+10</span>}
          {win && d.note && <span className="dm-note-ans mono">{d.note}</span>}
          {!done && <span className={`dm-finger${finger.press ? " press" : ""}`} style={{ left: finger.x - 13, top: finger.y - 6 }} aria-hidden="true">👆</span>}
        </div>
        <div className="dm-caps" aria-live="polite">{tx(d.caps[cap])}</div>
        {done ? (
          <div className="dm-turn">
            <b>{ja ? "こんどは きみの番！" : "Your turn!"}</b>
            <p>{tx(d.turn)}</p>
            <button className="btn btn-primary" onClick={onStart}>{ja ? "ゲームをはじめる ▶" : "Start the real game ▶"}</button>
            <button className="btn btn-ghost" onClick={again}>{ja ? "↺ もう一度見る" : "↺ Watch again"}</button>
          </div>
        ) : (
          <button className="dm-skip" onClick={onStart}>{ja ? "スキップ ▶" : "Skip ▶"}</button>
        )}
      </div>
    </div>
  );
}
