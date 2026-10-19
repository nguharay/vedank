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
  buildCrossMath, cmSolved, type CrossMath,
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
   Tap an empty square, then a digit from the tray; tapping a filled square
   returns its digit. When every square is filled the grid checks itself;
   wrong squares are marked so they can be swapped. Each solved grid is the
   next level. */
const CROSSMATH_KEY = "sutraSprint.crossMathBest";

export function CrossMath({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [level, setLevel] = useState(1);
  const [p, setP] = useState<CrossMath | null>(null);
  const [cells, setCells] = useState<(number | null)[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [solved, setSolved] = useState(false);
  const [tries, setTries] = useState(0);
  const [best, setBest] = useState(() => readBest(CROSSMATH_KEY));

  function load(lv: number) {
    const g = buildCrossMath(lv);
    setLevel(lv); setP(g); setCells(g.cells.map((v, i) => (g.blanks.includes(i) ? null : v)));
    setSel(g.blanks[0] ?? null); setWrong(false); setSolved(false); setTries(0);
  }
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const g = buildCrossMath(1);
    /* random, so built after mount rather than during render */
    setP(g); setCells(g.cells.map((v, i) => (g.blanks.includes(i) ? null : v))); setSel(g.blanks[0] ?? null);
  }, []);

  if (!p) return <div className="rg" />;
  const tray = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !cells.includes(d));

  function place(d: number) {
    if (sel === null || solved || !p) return;
    const next = [...cells]; next[sel] = d;
    setCells(next); setWrong(false); sound.click();
    const empty = p.blanks.find((i) => next[i] === null);
    if (empty !== undefined) { setSel(empty); return; }
    if (cmSolved(p, next)) {
      setSolved(true); setSel(null); sound.stageClear(); haptic([15, 30, 15]); onCorrect?.(p.blanks.length);
      if (level > best) { writeBest(CROSSMATH_KEY, level); setBest(level); }
      if (level % 3 === 0) celebrate();
    } else { setWrong(true); setTries((t) => t + 1); sound.wrong(); haptic(30); }
  }
  function tapCell(i: number) {
    if (solved || !p || !p.blanks.includes(i)) return;
    if (cells[i] !== null) { const next = [...cells]; next[i] = null; setCells(next); setWrong(false); }
    setSel(i); sound.click();
  }

  const g = cells;
  /* the 7×7 board: numbers, operators, "=", results */
  const board: React.ReactNode[] = [];
  const num = (i: number) => {
    const blank = p.blanks.includes(i);
    return (
      <button key={`n${i}`} className={`cm-cell${blank ? " blank" : ""}${sel === i ? " sel" : ""}${wrong && blank ? " wrong" : ""}${solved && blank ? " ok" : ""}`}
        onClick={() => tapCell(i)} disabled={!blank} aria-label={blank ? (ja ? "空きマス" : "blank") : String(g[i])}>
        <span className="mono">{g[i] ?? ""}</span>
      </button>
    );
  };
  const op = (k: string, o: string) => <span key={k} className="cm-op mono">{o}</span>;
  const eq = (k: string) => <span key={k} className="cm-eq mono">=</span>;
  const res = (k: string, v: number) => <span key={k} className="cm-res mono">{v}</span>;
  const gap = (k: string) => <span key={k} className="cm-gap" />;
  for (let r = 0; r < 3; r++) {
    board.push(num(r * 3), op(`ro${r}0`, p.rowOps[r][0]), num(r * 3 + 1), op(`ro${r}1`, p.rowOps[r][1]), num(r * 3 + 2), eq(`re${r}`), res(`rr${r}`, p.rowRes[r]));
    if (r < 2) {
      board.push(op(`co0${r}`, p.colOps[0][r]), gap(`g${r}a`), op(`co1${r}`, p.colOps[1][r]), gap(`g${r}b`), op(`co2${r}`, p.colOps[2][r]), gap(`g${r}c`), gap(`g${r}d`));
    }
  }
  board.push(eq("ce0"), gap("gea"), eq("ce1"), gap("geb"), eq("ce2"), gap("gec"), gap("ged"));
  board.push(res("cr0", p.colRes[0]), gap("gra"), res("cr1", p.colRes[1]), gap("grb"), res("cr2", p.colRes[2]), gap("grc"), gap("grd"));

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "レベル" : "Level"}</span><span className="match-stat-v mono">{level}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "まちがい" : "Retries"}</span><span className="match-stat-v mono">{tries}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "ベスト" : "Best"}</span><span className="match-stat-v mono">{best ? `Lv.${best}` : "–"}</span></div>
      </div>
      <p className="match-hint">{ja ? "たて・よこの式が合うように、のこりの数字をマスに入れよう。左から右、上から下の順に計算するよ。" : "Put the leftover digits in so every row and column equation works. Read left to right, top to bottom."}</p>
      <div className="cm-grid">{board}</div>
      {solved ? (
        <div className="match-done">
          <div className="match-done-title">{tries === 0 ? (ja ? "パーフェクト！" : "Perfect!") : (ja ? "とけた！" : "Solved!")}</div>
          <div className="match-done-line">{ja ? `次はレベル ${level + 1}` : `Next: level ${level + 1}`}</div>
          <button className="btn btn-primary match-again" onClick={() => load(level + 1)}>{ja ? "次のパズル ▶" : "Next puzzle ▶"}</button>
        </div>
      ) : (
        <div className="cm-tray">
          {tray.map((d) => <button key={d} className="cross-key mono" onClick={() => place(d)} disabled={sel === null}>{d}</button>)}
          {wrong && <div className="cm-wrong">{ja ? "どこかがちがうよ。赤いマスをタップして数字をもどそう。" : "Something's off — tap a red square to take its digit back."}</div>}
        </div>
      )}
    </div>
  );
}
