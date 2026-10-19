"use client";

import { useEffect, useRef, useState } from "react";
import { RunResults } from "./RunResults";
import { Mascot } from "../Mascot";
import { Person } from "../Person";
import { haptic } from "../util";
import type { useSound } from "../useSound";
import {
  buildKonbiniQ, konbiniLevel, konbiniPatience, type KonbiniQ,
  buildCrossword, type Crossword,
  buildCrossMath, cmSolved, cmLineOk, type CrossMath,
} from "@/lib/game/minigames";

type Sound = ReturnType<typeof useSound>;
type Props = { lang: "en" | "ja"; sound: Sound; celebrate: () => void; onCorrect?: (n: number) => void; autoStart?: boolean };

function readBest(key: string) {
  try { return Number(localStorage.getItem(key) || 0); } catch { return 0; }
}
function writeBest(key: string, v: number) {
  try { localStorage.setItem(key, String(v)); } catch {}
}
const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;
/* Only ever called from handlers and timers, never during render. */
const clock = () => performance.now();
/* a seed for a drawn customer (Person) */
const randShopper = () => Math.floor(Math.random() * 100000);

function LevelUp({ lv, text, ja }: { lv: number; text: string; ja: boolean }) {
  return (
    <div key={lv} className="sushi-levelup">
      <b>{ja ? `レベル ${lv}！` : `Level ${lv}!`}</b>
      <span>{text}</span>
    </div>
  );
}

/* ---------- 🏪 Konbini Cashier ----------
   The front customer puts their items down and pays; the register shows the
   total and what they handed over. Give the right change before they lose
   patience. Wrong change costs patience; a customer who walks out is a
   strike. */
const KONBINI_KEY = "sutraSprint.konbiniBest";
const KONBINI_NOTES: Record<number, { en: string; ja: string }> = {
  2: { en: "¥98 prices — all from 9, last from 10!", ja: "¥98の値段が登場！" },
  3: { en: "Two items at a time", ja: "2つ買うお客さん" },
  4: { en: "Bigger baskets, ¥5,000 notes", ja: "たくさん買って5,000円札" },
  5: { en: "¥10,000 notes!", ja: "1万円札！" },
  6: { en: "Customers add coins to get round change", ja: "小銭をたしてキリのいいおつりに" },
};

export function KonbiniCashier({ lang, sound, celebrate, onCorrect, autoStart }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [q, setQ] = useState<KonbiniQ | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [mood, setMood] = useState<"wait" | "happy" | "angry">("wait");
  const [picked, setPicked] = useState<number | null>(null);
  const [served, setServed] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [pct, setPct] = useState(1);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [levelUp, setLevelUp] = useState<{ lv: number; text: string } | null>(null);
  const s = useRef({ served: 0, strikes: 0, deadline: 0, total: 0, busy: false, tick: 0 as unknown as ReturnType<typeof setInterval>, timer: 0 as unknown as ReturnType<typeof setTimeout> });

  function stopAll() { clearInterval(s.current.tick); clearTimeout(s.current.timer); }
  useEffect(() => () => stopAll(), []);


  function nextCustomer(advance: boolean) {
    const st = s.current;
    if (advance) setQueue((qq) => [...qq.slice(1), randShopper()]);
    setQ(buildKonbiniQ(st.served));
    setPicked(null); setMood("wait"); setPct(1);
    st.total = konbiniPatience(st.served) * 1000;
    st.deadline = clock() + st.total;
    st.busy = false;
  }

  function tick() {
    const st = s.current;
    if (st.busy) return;
    const left = st.deadline - clock();
    setPct(Math.max(0, left / st.total));
    if (left <= 0) walkout();
  }

  function walkout() {
    const st = s.current;
    st.busy = true;
    st.strikes += 1; setStrikes(st.strikes);
    setMood("angry"); sound.wrong(); haptic(40);
    st.timer = setTimeout(() => { if (st.strikes >= 3) end(); else nextCustomer(true); }, 1300);
  }

  function pick(v: number) {
    const st = s.current;
    if (!q || st.busy || phase !== "play") return;
    setPicked(v);
    if (v !== q.answer) {
      sound.wrong(); haptic(30);
      st.deadline -= st.total * 0.3;
      setTimeout(() => setPicked(null), 450);
      return;
    }
    st.busy = true;
    sound.correct(); haptic(12); onCorrect?.(1);
    const before = konbiniLevel(st.served);
    st.served += 1; setServed(st.served);
    const after = konbiniLevel(st.served);
    if (after > before) {
      const note = KONBINI_NOTES[after];
      setLevelUp({ lv: after, text: note ? (ja ? note.ja : note.en) : (ja ? "お店がこんできた！" : "The store is getting busy!") });
      sound.levelUp(); celebrate();
      setTimeout(() => setLevelUp(null), 2600);
    }
    setMood("happy");
    st.timer = setTimeout(() => nextCustomer(true), 1100);
  }

  function start() {
    stopAll();
    const st = s.current;
    st.served = 0; st.strikes = 0;
    setServed(0); setStrikes(0); setNewBest(false);
    setBest(readBest(KONBINI_KEY));
    setQueue([randShopper(), randShopper(), randShopper(), randShopper()]);
    setPhase("play");
    st.tick = setInterval(tick, 100);
    nextCustomer(false);
  }

  function end() {
    stopAll();
    const sc = s.current.served;
    const prev = readBest(KONBINI_KEY);
    if (sc > prev) { writeBest(KONBINI_KEY, sc); setBest(sc); setNewBest(true); celebrate(); } else setBest(prev);
    setPhase("over");
  }

  const front = queue[0];
  /* opened from its "watch first" demo: skip the ready card */
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => start(), 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "お客さん" : "Served"}</span><span className="match-stat-v mono">{served}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "レベル" : "Level"}</span><span className="match-stat-v mono">{konbiniLevel(served)}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "評判" : "Rating"}</span><span className="match-stat-v">{"⭐".repeat(3 - strikes)}{"✖️".repeat(strikes)}</span></div>
      </div>

      <div className="konbini-scene">
        <div className="konbini-sign" aria-hidden="true"><span className="k1" /><span className="k2" /><span className="k3" /><b>{ja ? "コンビニ" : "KONBINI"}</b></div>
        <div className="konbini-shelves" aria-hidden="true">🍙🥤🍞🍫🍜🧃🍪🥛</div>
        <div className="konbini-floor">
          <div className="konbini-queue" aria-hidden="true">
            {queue.slice(1).map((f) => <span key={f}><Person seed={f} mood="wait" /></span>)}
          </div>
          {phase === "play" && front && (
            <div className={`konbini-customer ${mood}`}>
              <span className="konbini-face"><Person seed={front} mood={mood === "happy" ? "happy" : mood === "angry" ? "angry" : pct > 0.5 ? "wait" : "cross"} /></span>
              {mood === "happy" && <span className="sushi-bubble happy">{ja ? "ありがとう！" : "Thanks!"}</span>}
              {mood === "angry" && <span className="sushi-bubble angry">{ja ? "おそい！" : "Too slow!"}</span>}
            </div>
          )}
          <div className="konbini-counter">
            <span className="konbini-clerk" aria-hidden="true"><Mascot animated={false} /></span>
            {q && phase === "play" && (
              <div className="konbini-items">
                {q.items.map((it, i) => (
                  <span key={i} className="konbini-item"><span>{it.emoji}</span><i className="mono">{yen(it.yen)}</i></span>
                ))}
              </div>
            )}
          </div>
        </div>
        {phase === "play" && q && (
          <div className="konbini-register">
            <div><span>{ja ? "合計" : "Total"}</span><b className="mono">{yen(q.total)}</b></div>
            <div><span>{ja ? "お預かり" : "Paid"}</span><b className="mono">{yen(q.paid)}</b></div>
            <div className="change"><span>{ja ? "おつり" : "Change"}</span><b className="mono">¥ ?</b></div>
          </div>
        )}
        {phase === "play" && mood === "wait" && <div className="sushi-patience konbini-timer"><i style={{ width: `${pct * 100}%` }} /></div>}
        {levelUp && <LevelUp lv={levelUp.lv} text={levelUp.text} ja={ja} />}

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🏪 コンビニのレジ" : "🏪 Konbini Cashier"}</div>
            <p className="rg-card-sub">{ja ? "お客さんにおつりをわたそう！まちがえたり、おそかったりするとお客さんがおこるよ。" : "Give each customer the right change — quickly! Wrong or slow change makes them cross."}</p>
            <button className="btn btn-primary" onClick={start}>{ja ? "レジに入る" : "Open the register"}</button>
          </div>
        )}
        {phase === "over" && <RunResults game="konbini" score={served} prevBest={best} newBest={newBest} lang={lang} onAgain={start} sound={sound} detail={ja ? "おきゃくさん" : "customers"} />}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && served > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "閉店です" : "Store closed")}</div>
            <div className="match-done-line mono">{served} {ja ? "人" : "served"} · {ja ? `レベル ${konbiniLevel(served)}` : `Level ${konbiniLevel(served)}`} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回" : "Again"}</button>
          </div>
        )}
      </div>

      {phase === "play" && q && (
        <>
          <div className="race-q mono">{yen(q.paid)} − {yen(q.total)} = ?</div>
          <div className="rg-answers">
            {q.options.map((o) => (
              <button key={o} className={`rg-ans mono${picked === o ? (o === q.answer ? " right" : " wrong") : ""}`} onClick={() => pick(o)} disabled={mood !== "wait"}>
                {yen(o)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 🧩 Number Crossword ----------
   No clock: a thinking game. Tap a blank, type its number with the keypad,
   and when every blank is filled the grid checks itself. Each solved grid
   is the next level; a wrong check marks the wrong cells so you can fix
   them. */
const CROSS_KEY = "sutraSprint.crossBest";

export function NumberCrossword({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState<Crossword | null>(null);
  const [vals, setVals] = useState<Record<number, string>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [tries, setTries] = useState(0);
  const [best, setBest] = useState(() => readBest(CROSS_KEY));

  function load(lv: number) {
    const g = buildCrossword(lv);
    setLevel(lv); setGrid(g); setVals({}); setWrong([]); setSolved(false); setTries(0);
    setSel(g.blanks[0] ?? null);
  }
  /* first grid on mount */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const g = buildCrossword(1);
    /* the puzzle is random, so it is built after mount, not during render */
    setGrid(g); setSel(g.blanks[0] ?? null);
  }, []);

  const maxDigits = grid && Math.max(...grid.cells) >= 10 ? 2 : 1;

  function check(next: Record<number, string>) {
    if (!grid) return;
    const bad = grid.blanks.filter((i) => Number(next[i]) !== grid.cells[i]);
    /* a different filling can still satisfy every sum — accept any grid whose sums hold */
    const n = grid.size;
    const val = (i: number) => (grid.blanks.includes(i) ? Number(next[i]) : grid.cells[i]);
    const rowsOk = grid.rowSums.every((sum, r) => Array.from({ length: n }, (_, c) => val(r * n + c)).reduce((a, b) => a + b, 0) === sum);
    const colsOk = grid.colSums.every((sum, c) => Array.from({ length: n }, (_, r) => val(r * n + c)).reduce((a, b) => a + b, 0) === sum);
    if (rowsOk && colsOk) {
      setSolved(true); setWrong([]); sound.stageClear(); haptic([15, 30, 15]); onCorrect?.(grid.blanks.length);
      if (level > best) { writeBest(CROSS_KEY, level); setBest(level); }
      if (level % 3 === 0) celebrate();
      return;
    }
    setWrong(bad); setTries((t) => t + 1); sound.wrong(); haptic(30);
  }

  function key(k: string) {
    if (!grid || sel === null || solved) return;
    const cur = vals[sel] ?? "";
    let v = cur;
    if (k === "⌫") v = cur.slice(0, -1);
    else if (cur.length < maxDigits) v = cur + k;
    else v = k;
    const next = { ...vals, [sel]: v };
    setVals(next); setWrong((w) => w.filter((i) => i !== sel)); sound.click();
    /* a full cell moves on to the next empty blank; a full grid checks itself */
    if (v.length === maxDigits && k !== "⌫") {
      const empty = grid.blanks.find((i) => !(next[i] ?? "").length);
      if (empty !== undefined) setSel(empty);
      else check(next);
    }
  }

  if (!grid) return <div className="rg" />;
  const n = grid.size;
  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "レベル" : "Level"}</span><span className="match-stat-v mono">{level}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "まちがい" : "Retries"}</span><span className="match-stat-v mono">{tries}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "ベスト" : "Best"}</span><span className="match-stat-v mono">{best ? `Lv.${best}` : "–"}</span></div>
      </div>

      <p className="match-hint">{ja ? "たて・よこの合計があうように、空いているマスをうめよう。" : "Fill the empty squares so every row and column adds up."}</p>
      <div className="cross-grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr) auto` }}>
        {Array.from({ length: n }, (_, r) => (
          <FragmentRow key={r}>
            {Array.from({ length: n }, (_, c) => {
              const i = r * n + c;
              const blank = grid.blanks.includes(i);
              return (
                <button key={i} className={`cross-cell${blank ? " blank" : ""}${sel === i && !solved ? " sel" : ""}${wrong.includes(i) ? " wrong" : ""}${solved && blank ? " ok" : ""}`}
                  onClick={() => blank && !solved && setSel(i)} disabled={!blank} aria-label={blank ? (ja ? "空きマス" : "blank") : String(grid.cells[i])}>
                  <span className="mono">{blank ? (vals[i] ?? "") : grid.cells[i]}</span>
                </button>
              );
            })}
            <span className="cross-sum mono">= {grid.rowSums[r]}</span>
          </FragmentRow>
        ))}
        {grid.colSums.map((sum, c) => <span key={`c${c}`} className="cross-sum col mono">{sum}</span>)}
        <span />
      </div>

      {solved ? (
        <div className="match-done">
          <div className="match-done-title">{tries === 0 ? (ja ? "パーフェクト！" : "Perfect!") : (ja ? "とけた！" : "Solved!")}</div>
          <div className="match-done-line">{ja ? `次はレベル ${level + 1}` : `Next: level ${level + 1}`}</div>
          <button className="btn btn-primary match-again" onClick={() => load(level + 1)}>{ja ? "次のパズル ▶" : "Next puzzle ▶"}</button>
        </div>
      ) : (
        <div className="cross-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"].map((k) => (
            <button key={k} className={`cross-key mono${k === "⌫" ? " back" : ""}`} onClick={() => key(k)}>{k}</button>
          ))}
          <button className="cross-key check" onClick={() => check(vals)} disabled={grid.blanks.some((i) => !(vals[i] ?? "").length)}>{ja ? "チェック" : "Check"}</button>
        </div>
      )}
    </div>
  );
}

/* grid rows are laid out by the parent's CSS grid; this just groups children */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* ---------- ➕✖️ Cross Math ----------
   Crossword-style: tap an empty square, then a number from the tray (or
   drag one in). Every equation shows green the moment it holds and red when
   it doesn't, so a wrong line can be fixed at once. Solve all for the next
   level. */
const CROSSMATH_KEY = "sutraSprint.crossMathBest";
const CM_INTRO: Record<number, [string, string]> = {
  3: ["Level 3: × joins in!", "レベル3：✖ が登場！"],
  4: ["Level 4: two frames, linked at the corner", "レベル4：2つのわくが角でつながる"],
  5: ["Level 5: ÷ joins in!", "レベル5：➗ が登場！"],
};

export function CrossMath({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [level, setLevel] = useState(1);
  const [p, setP] = useState<CrossMath | null>(null);
  const [filled, setFilled] = useState<(number | null)[]>([]);
  const [tray, setTray] = useState<number[]>([]);          /* numbers still to place */
  const [sel, setSel] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [tries, setTries] = useState(0);
  const [best, setBest] = useState(() => readBest(CROSSMATH_KEY));
  const [popped, setPopped] = useState<number | null>(null);

  function setup(g: CrossMath, lv: number) {
    setLevel(lv); setP(g);
    setFilled(g.cells.map((c) => (c && c.t === "num" && !c.blank ? c.v : null)));
    const t = g.blanks.map((i) => (g.cells[i] as { v: number }).v);
    for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
    setTray(t); setSel(g.blanks[0] ?? null); setSolved(false); setTries(0);
  }
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    /* random, so built after mount rather than during render (?cmshape=田 forces a shape for review) */
    let force: string | undefined;
    try { force = new URLSearchParams(window.location.search).get("cmshape") || undefined; } catch {}
    setup(buildCrossMath(force ? 7 : 1, force), force ? 7 : 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <div className="rg" />;
  const lineOk = p.eqs.map((eq) => cmLineOk(p, filled, eq));
  /* each blank's state from the lines it sits on */
  const stateOf = (i: number): "" | "good" | "bad" => {
    if (filled[i] === null) return "";
    const lines = p.eqs.filter((eq) => eq[0] === i || eq[2] === i || eq[4] === i).map((eq) => lineOk[p.eqs.indexOf(eq)]);
    if (lines.some((l) => l === false)) return "bad";
    if (lines.some((l) => l === true)) return "good";
    return "";
  };

  function place(v: number, at = sel) {
    if (at === null || solved || !p || !p.blanks.includes(at)) return;
    const next = [...filled];
    const prev = next[at];
    next[at] = v;
    const t = [...tray]; t.splice(t.indexOf(v), 1); if (prev !== null) t.push(prev);
    setFilled(next); setTray(t); setPopped(at); setTimeout(() => setPopped((x) => (x === at ? null : x)), 350); sound.click();
    const empty = p.blanks.find((i) => next[i] === null);
    if (empty !== undefined) { setSel(empty); return; }
    if (cmSolved(p, next)) {
      setSolved(true); setSel(null); sound.stageClear(); haptic([15, 30, 15]); onCorrect?.(p.blanks.length);
      if (level > best) { writeBest(CROSSMATH_KEY, level); setBest(level); }
      if (level % 3 === 0) celebrate();
    } else { setTries((n) => n + 1); sound.wrong(); haptic(30); setSel(null); }
  }
  function tapCell(i: number) {
    if (solved || !p || !p.blanks.includes(i)) return;
    if (filled[i] !== null) { const next = [...filled]; setTray([...tray, filled[i]!]); next[i] = null; setFilled(next); }
    setSel(i); sound.click();
  }
  function resetAll() { if (p) setup(p, level); }
  /* the shape's name, for the small label on the board */

  const intro = CM_INTRO[level];
  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "レベル" : "Level"}</span><span className="match-stat-v mono">{level}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "まちがい" : "Retries"}</span><span className="match-stat-v mono">{tries}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "ベスト" : "Best"}</span><span className="match-stat-v mono">{best ? `Lv.${best}` : "–"}</span></div>
      </div>
      {intro && !solved && <div className="cm-intro">✨ {ja ? intro[1] : intro[0]}</div>}

      <div className="cm-board">
        <div className="cm-grid" style={{ gridTemplateColumns: `repeat(${p.w}, 1fr)` }}>
          {p.cells.map((c, i) => {
            if (!c) return <span key={i} className="cm-empty" />;
            if (c.t === "op") return <span key={i} className="cm-op" data-op={c.o}>{c.o}</span>;
            if (c.t === "eq") return <span key={i} className="cm-eq">=</span>;
            if (!c.blank) return <span key={i} className="cm-num mono">{c.v}</span>;
            const st = stateOf(i);
            return (
              <button key={i} className={`cm-cell${sel === i ? " sel" : ""}${st ? ` ${st}` : ""}${solved ? " ok" : ""}${popped === i ? " pop" : ""}`}
                onClick={() => tapCell(i)}
                onDragOver={(e) => { if (!solved) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); const v = Number(e.dataTransfer.getData("text/plain")); if (v) place(v, i); }}
                aria-label={filled[i] === null ? (ja ? "空きマス" : "blank") : String(filled[i])}>
                <span className="mono">{filled[i] ?? ""}</span>
              </button>
            );
          })}
        </div>
      </div>

      {solved ? (
        <div className="match-done">
          <div className="match-done-title">{tries === 0 ? (ja ? "パーフェクト！" : "Perfect!") : (ja ? "とけた！" : "Solved!")}</div>
          <div className="match-done-line">{ja ? `次はレベル ${level + 1}` : `Next: level ${level + 1}`}</div>
          <button className="btn btn-primary match-again" onClick={() => setup(buildCrossMath(level + 1, undefined, p.shape), level + 1)}>{ja ? "次のパズル ▶" : "Next puzzle ▶"}</button>
        </div>
      ) : (
        <>
          <div className="cm-tray" aria-label={ja ? "のこりの数字" : "Numbers left"}>
            {tray.map((v, k) => (
              <button key={`${v}-${k}`} className="cm-tile mono" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(v))} onClick={() => place(v)} disabled={sel === null}>{v}</button>
            ))}
            {tray.length === 0 && <span className="cm-tray-empty">{ja ? "赤いマスをタップして数字をもどそう" : "Tap a red square to take its number back"}</span>}
          </div>
          <p className="match-hint">{sel === null && tray.length > 0 ? (ja ? "空きマスをタップしてから数字をえらぼう" : "Tap an empty square, then a number") : (ja ? "数字をタップ（またはドラッグ）してマスに入れよう" : "Tap (or drag) a number into the square")}</p>
          <button className="cm-reset" onClick={resetAll}>↺ {ja ? "はじめから" : "Reset"}</button>
        </>
      )}
    </div>
  );
}
