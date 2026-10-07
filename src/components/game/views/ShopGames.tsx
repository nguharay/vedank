"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "../Mascot";
import { Person, type PersonMood } from "../Person";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import {
  buildSushiBill, sushiPatience, sushiEatMs, sushiLevel, SUSHI_LEVEL_NOTES, PLATES, type SushiBill,
  castleWave, castlePoints, castleQuestion, type ChoiceRound,
} from "@/lib/game/minigames";
import { ROSTER } from "../monsters";

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
const jitter = (ms: number) => Math.random() * ms;

/* ---------- 🍣 Sushi Shop ----------
   A kaiten-zushi counter with three seats. A customer sits down, eats from
   the belt (their plate stack grows), then raises a hand for the bill. Tap
   them and work out what they owe — or their change from ¥1,000 — before
   their patience runs out. Three customers walking out closes the shop. */
/* customers are drawn (Person), picked by a seed */
const newFace = () => Math.floor(Math.random() * 100000);
const SUSHI_KEY = "sutraSprint.sushiBest";
const SEATS = 3;

type Seat =
  | { state: "empty"; until: number }
  | { state: "eating"; face: number; bill: SushiBill; start: number; until: number; shown: number }
  | { state: "waiting"; face: number; bill: SushiBill; deadline: number; total: number }
  | { state: "leaving"; face: number; happy: boolean; until: number; text: string };

export function SushiShop({ lang, sound, celebrate, onCorrect, autoStart }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "open" | "closed">("ready");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  /* the interval reads the selection, so it lives in a ref too */
  const selRef = useRef<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [sales, setSales] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [served, setServed] = useState(0);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [levelUp, setLevelUp] = useState<{ lv: number; text: string } | null>(null);
  const st = useRef({ seats: [] as Seat[], served: 0, sales: 0, strikes: 0, timer: 0 as unknown as ReturnType<typeof setInterval>, t0: 0 });

  useEffect(() => () => clearInterval(st.current.timer), []);

  function commit(next: Seat[]) { st.current.seats = next; setSeats(next); }

  function newCustomer(t: number): Seat {
    const bill = buildSushiBill(st.current.served);
    return { state: "eating", face: newFace(), bill, start: t, until: t + sushiEatMs(st.current.served) + jitter(1400), shown: 0 };
  }

  function tick() {
    const t = clock();
    setNow(t);
    const s = st.current;
    let changed = false;
    const next = s.seats.map((seat, i): Seat => {
      if (seat.state === "empty" && t >= seat.until) { changed = true; return newCustomer(t); }
      if (seat.state === "eating") {
        const plates = seat.bill.plates.reduce((a, p) => a + p.n, 0);
        const shown = Math.min(plates, Math.floor(((t - seat.start) / (seat.until - seat.start)) * plates) + 1);
        if (t >= seat.until) {
          changed = true;
          const secs = sushiPatience(s.served);
          return { state: "waiting", face: seat.face, bill: seat.bill, deadline: t + secs * 1000, total: secs * 1000 };
        }
        if (shown !== seat.shown) { changed = true; return { ...seat, shown }; }
      }
      if (seat.state === "waiting" && t >= seat.deadline) {
        changed = true;
        s.strikes += 1; setStrikes(s.strikes);
        sound.wrong(); haptic(40);
        if (selRef.current === i) { selRef.current = null; setSel(null); setPicked(null); }
        return { state: "leaving", face: seat.face, happy: false, until: t + 1400, text: ja ? "もういい！" : "Too slow!" };
      }
      if (seat.state === "leaving" && t >= seat.until) {
        changed = true;
        return { state: "empty", until: t + 800 + jitter(1800) };
      }
      return seat;
    });
    if (changed) commit(next);
    if (s.strikes >= 3) close();
  }

  function open() {
    clearInterval(st.current.timer);
    const t = clock();
    const s = st.current;
    s.served = 0; s.sales = 0; s.strikes = 0; s.t0 = t;
    setServed(0); setSales(0); setStrikes(0); selRef.current = null; setSel(null); setPicked(null); setNewBest(false);
    setBest(readBest(SUSHI_KEY));
    commit(Array.from({ length: SEATS }, (_, i) => ({ state: "empty", until: t + 400 + i * 1500 } as Seat)));
    setPhase("open");
    s.timer = setInterval(tick, 100);
  }

  function close() {
    clearInterval(st.current.timer);
    const sc = st.current.sales;
    const prev = readBest(SUSHI_KEY);
    if (sc > prev) { writeBest(SUSHI_KEY, sc); setBest(sc); setNewBest(true); celebrate(); } else setBest(prev);
    setPhase("closed");
  }

  function tapSeat(i: number) {
    if (phase !== "open") return;
    if (st.current.seats[i]?.state !== "waiting") return;
    selRef.current = i; setSel(i); setPicked(null); sound.click();
  }

  function pay(v: number) {
    if (sel === null) return;
    const s = st.current;
    const seat = s.seats[sel];
    if (seat.state !== "waiting") return;
    setPicked(v);
    if (v !== seat.bill.answer) {
      sound.wrong(); haptic(30);
      /* a wrong bill costs patience, not the customer */
      const next = [...s.seats];
      next[sel] = { ...seat, deadline: seat.deadline - seat.total * 0.3 };
      commit(next);
      setTimeout(() => setPicked(null), 500);
      return;
    }
    sound.correct(); haptic(12); onCorrect?.(1);
    const t = clock();
    const tipFast = seat.deadline - t > seat.total * 0.6;
    /* the shop earns what the customer spent, whatever the question was */
    const spent = seat.bill.kind === "change" ? seat.bill.paid - seat.bill.answer : seat.bill.answer;
    const earned = spent + (tipFast ? 50 : 0);
    s.sales += earned; setSales(s.sales);
    const before = sushiLevel(s.served);
    s.served += 1; setServed(s.served);
    const after = sushiLevel(s.served);
    if (after > before) {
      /* level up: say what is new, and cheer */
      const note = SUSHI_LEVEL_NOTES[after];
      setLevelUp({ lv: after, text: note ? (ja ? note.ja : note.en) : (ja ? "お客さんがもっといそいでいる！" : "Customers are in more of a hurry!") });
      sound.levelUp(); celebrate();
      setTimeout(() => setLevelUp(null), 2600);
    }
    const next = [...s.seats];
    next[sel] = { state: "leaving", face: seat.face, happy: true, until: t + 1300, text: tipFast ? (ja ? "ごちそうさま！チップ ¥50" : "Delicious! +¥50 tip") : (ja ? "ごちそうさま！" : "Thank you!") };
    commit(next);
    selRef.current = null; setSel(null);
    setTimeout(() => setPicked(null), 300);
  }

  const selSeat = sel !== null ? seats[sel] : null;
  const bill = selSeat && selSeat.state === "waiting" ? selSeat.bill : null;

  /* opened from its "watch first" demo: skip the ready card */
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => open(), 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "売上" : "Sales"}</span><span className="match-stat-v mono">{yen(sales)}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "レベル" : "Level"}</span><span className="match-stat-v mono">{sushiLevel(served)}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "評判" : "Rating"}</span><span className="match-stat-v">{"⭐".repeat(3 - strikes)}{"✖️".repeat(strikes)}</span></div>
      </div>

      <div className="sushi-shop illus">
        {/* the back wall: a noren, a lamp, and wooden menu tags with today's prices */}
        <div className="sushi-wall" aria-hidden="true">
          <div className="sushi-noren"><span>寿</span><span>回転寿司</span><span>し</span></div>
          <div className="sushi-tags">
            {PLATES.map((p) => <span key={p.id}><i style={{ ["--plate" as string]: p.color }} />{ja ? p.nameJa : p.name}<b>{yen(p.yen)}</b></span>)}
          </div>
          <span className="sushi-lamp l1" /><span className="sushi-lamp l2" />
        </div>
        <div className="sushi-belt" aria-hidden="true">
          <div className="sushi-belt-track">
            {[0, 1].map((h) => (
              <span key={h} className="sushi-belt-half">
                {PLATES.concat(PLATES).map((p, i) => (
                  <span key={i} className="sushi-dish" style={{ ["--plate" as string]: p.color }}><span>{p.sushi}</span></span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <div className="sushi-counter">
          {seats.map((seat, i) => {
            const plates = seat.state === "eating" ? seat.shown : seat.state === "waiting" ? seat.bill.plates.reduce((a, p) => a + p.n, 0) : 0;
            const stack = seat.state === "eating" || seat.state === "waiting"
              ? seat.bill.plates.flatMap((p) => Array.from({ length: p.n }, () => p.plate)).slice(0, plates) : [];
            const pct = seat.state === "waiting" ? Math.max(0, (seat.deadline - now) / seat.total) : 1;
            const mood: PersonMood = seat.state === "waiting" ? (pct > 0.6 ? "wait" : pct > 0.3 ? "cross" : "angry")
              : seat.state === "leaving" ? (seat.happy ? "happy" : "angry") : "happy";
            return (
              <button key={i} className={`sushi-seat ${seat.state}${sel === i ? " sel" : ""}`} onClick={() => tapSeat(i)} disabled={seat.state !== "waiting"}
                aria-label={seat.state === "waiting" ? (ja ? "お会計" : "Bill") : ""}>
                {seat.state !== "empty" && (
                  <>
                    <span className="sushi-stack">
                      {stack.map((p, k) => <i key={k} style={{ ["--plate" as string]: p.color }} />)}
                    </span>
                    <span className="sushi-face"><Person seed={seat.face} mood={mood} /></span>
                    {seat.state === "eating" && <span className="sushi-bubble">{ja ? "もぐもぐ…" : "munch…"}</span>}
                    {seat.state === "waiting" && <span className="sushi-bubble call">{ja ? "お会計！" : "Bill, please!"}</span>}
                    {seat.state === "leaving" && <span className={`sushi-bubble${seat.happy ? " happy" : " angry"}`}>{seat.text}</span>}
                    {seat.state === "waiting" && <span className="sushi-patience"><i style={{ width: `${pct * 100}%` }} /></span>}
                  </>
                )}
                {seat.state === "empty" && <span className="sushi-empty">🪑</span>}
              </button>
            );
          })}
        </div>
        {levelUp && (
          <div key={levelUp.lv} className="sushi-levelup">
            <b>{ja ? `レベル ${levelUp.lv}！` : `Level ${levelUp.lv}!`}</b>
            <span>{levelUp.text}</span>
          </div>
        )}
        <div className="sushi-chef" aria-hidden="true"><Mascot animated={false} /><span>{ja ? "いらっしゃい！" : "Irasshai!"}</span></div>

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🍣 おすし屋さん" : "🍣 Sushi Shop"}</div>
            <p className="rg-card-sub">
              {ja ? "お客さんが「お会計！」と手をあげたらタップ。お皿の合計（またはおつり）を計算しよう。3人おこらせたら閉店！"
                  : "When a customer raises a hand, tap them and work out the bill (or their change). Three angry customers and the shop closes!"}
            </p>
            <div className="sushi-menu">
              {PLATES.map((p) => (
                <span key={p.id}><i style={{ ["--plate" as string]: p.color }} />{yen(p.yen)}</span>
              ))}
            </div>
            <button className="btn btn-primary" onClick={open}>{ja ? "開店！" : "Open the shop!"}</button>
          </div>
        )}
        {phase === "closed" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && sales > 0 ? (ja ? "売上ベスト更新！" : "Best day ever!") : (ja ? "閉店です" : "Closing time")}</div>
            <div className="match-done-line mono">{yen(sales)} · {ja ? `レベル ${sushiLevel(served)}` : `Level ${sushiLevel(served)}`} · {served} {ja ? "人" : "served"} · {ja ? "ベスト" : "best"} {yen(best)}</div>
            <button className="btn btn-primary" onClick={open}>{ja ? "もう一日" : "Open again"}</button>
          </div>
        )}
      </div>

      {phase === "open" && (
        bill ? (
          <div className="sushi-bill">
            <div className="sushi-bill-head">
              {bill.kind === "total" ? (ja ? "🧾 お会計はいくら？" : "🧾 What's the bill?")
                : bill.kind === "tax" ? (ja ? "🧾 税込み（10%）でいくら？" : "🧾 Total with 10% tax?")
                : (ja ? `💴 ${yen(bill.paid)}札でお支払い。おつりは？` : `💴 Paid with ${yen(bill.paid)}. Change?`)}
            </div>
            <div className="sushi-bill-lines">
              {bill.plates.map((p, k) => (
                <span key={k}><i style={{ ["--plate" as string]: p.plate.color }} />{ja ? p.plate.nameJa : p.plate.name} {p.n} × {yen(p.plate.yen)}</span>
              ))}
            </div>
            <div className="race-q mono">{bill.prompt} = ?</div>
            <div className="rg-answers">
              {bill.options.map((o) => (
                <button key={o} className={`rg-ans mono${picked === o ? (o === bill.answer ? " right" : " wrong") : ""}`} onClick={() => pay(o)}>{yen(o)}</button>
              ))}
            </div>
          </div>
        ) : (
          <p className="match-hint">{ja ? "🙋 手をあげたお客さんをタップ！" : "🙋 Tap a customer with a raised hand!"}</p>
        )
      )}
    </div>
  );
}

/* ---------- 🏯 Castle Defense ----------
   Monsters march down the road toward the castle, each carrying a sum. The
   front one is your target: answer it and an arrow flies. A wave is a fixed
   number of monsters; every fifth wave ends with a boss that takes three
   hits. Coins buy a ❄️ freeze (everything stops for 4 s) or a 💥 bomb
   (clears the front monster). Positions are written as transforms from one
   animation frame, like the runner. */
const CASTLE_KEY = "sutraSprint.castleBest";
const FREEZE_COST = 40, BOMB_COST = 60;

type Foe = { id: number; emoji: string; hp: number; boss: boolean; row: number; q: ChoiceRound };

export function CastleDefense({ lang, sound, celebrate, onCorrect, autoStart }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "play" | "between" | "over">("ready");
  const [foes, setFoes] = useState<Foe[]>([]);
  const [wave, setWave] = useState(1);
  const [hearts, setHearts] = useState(5);
  const [coins, setCoins] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [shot, setShot] = useState<{ k: number; x: number } | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);

  const roadRef = useRef<HTMLDivElement | null>(null);
  const foeEls = useRef(new Map<number, HTMLDivElement>());
  const s = useRef({
    raf: 0, last: 0, pos: new Map<number, number>(), foes: [] as Foe[], nextId: 1,
    wave: 1, toSpawn: 0, nextSpawn: 0, hearts: 5, coins: 0, score: 0, streak: 0,
    frozenUntil: 0, over: false, timer: 0 as unknown as ReturnType<typeof setTimeout>,
  });

  function stopAll() { cancelAnimationFrame(s.current.raf); clearTimeout(s.current.timer); }
  useEffect(() => () => stopAll(), []);

  function commitFoes(f: Foe[]) { s.current.foes = f; setFoes(f); }

  function spawn(now: number) {
    const st = s.current;
    const w = castleWave(st.wave);
    const isBoss = w.boss && st.toSpawn === 1;
    const m = ROSTER[(st.wave + st.nextId) % ROSTER.length];
    const foe: Foe = { id: st.nextId++, emoji: m.emoji, hp: isBoss ? 3 : 1, boss: isBoss, row: st.nextId % 2, q: castleQuestion(st.wave) };
    st.pos.set(foe.id, 1.02);
    st.toSpawn -= 1;
    st.nextSpawn = now + w.gapMs;
    commitFoes([...st.foes, foe]);
  }

  function frame(now: number) {
    const st = s.current;
    if (st.over) return;
    const dt = Math.min(0.1, (now - st.last) / 1000);
    st.last = now;
    const w = castleWave(st.wave);
    const isFrozen = now < st.frozenUntil;
    if (!isFrozen && st.toSpawn > 0 && now >= st.nextSpawn) spawn(now);
    const width = roadRef.current?.clientWidth ?? 320;
    let reached: number[] = [];
    for (const f of st.foes) {
      let p = st.pos.get(f.id) ?? 1;
      if (!isFrozen) p -= w.speed * dt;
      st.pos.set(f.id, p);
      const el = foeEls.current.get(f.id);
      if (el) el.style.transform = `translate3d(${p * width}px,0,0)`;
      if (p <= 0.1) reached.push(f.id);
    }
    if (reached.length) {
      st.hearts -= reached.length; setHearts(Math.max(0, st.hearts));
      sound.wrong(); haptic(50);
      reached.forEach((id) => st.pos.delete(id));
      commitFoes(st.foes.filter((f) => !reached.includes(f.id)));
      reached = [];
      if (st.hearts <= 0) { end(); return; }
    }
    if (st.toSpawn === 0 && st.foes.length === 0) { waveClear(); return; }
    st.raf = requestAnimationFrame(frame);
  }

  /* the monster nearest the castle — they all march at one speed, so the
     earliest one still alive is always in front */
  function frontFoe(): Foe | null {
    const fs = s.current.foes;
    return fs.length ? fs.reduce((a, b) => (a.id < b.id ? a : b)) : null;
  }

  function kill(f: Foe) {
    const st = s.current;
    st.pos.delete(f.id);
    const pts = castlePoints(st.wave, f.boss);
    st.score += pts; setScore(st.score);
    st.coins += f.boss ? 30 : 5; setCoins(st.coins);
    commitFoes(st.foes.filter((x) => x.id !== f.id));
  }

  function answer(v: number) {
    const f = frontFoe();
    if (!f || phase !== "play" || picked !== null) return;
    setPicked(v);
    const st = s.current;
    if (v !== f.q.answer) {
      sound.wrong(); haptic(30); st.streak = 0;
      setTimeout(() => setPicked(null), 450);
      return;
    }
    sound.hit(); haptic(12); onCorrect?.(1);
    st.streak += 1;
    const width = roadRef.current?.clientWidth ?? 320;
    setShot({ k: clock(), x: (st.pos.get(f.id) ?? 0.5) * width });
    if (f.hp > 1) {
      commitFoes(st.foes.map((x) => (x.id === f.id ? { ...x, hp: x.hp - 1, q: castleQuestion(st.wave) } : x)));
    } else {
      kill(f);
    }
    setTimeout(() => setPicked(null), 200);
  }

  function useFreeze() {
    const st = s.current;
    if (st.coins < FREEZE_COST || phase !== "play") return;
    st.coins -= FREEZE_COST; setCoins(st.coins);
    st.frozenUntil = clock() + 4000; setFrozen(true);
    sound.click();
    st.timer = setTimeout(() => setFrozen(false), 4000);
  }
  function useBomb() {
    const st = s.current;
    const f = frontFoe();
    if (!f || st.coins < BOMB_COST || phase !== "play") return;
    st.coins -= BOMB_COST; setCoins(st.coins);
    sound.levelUp();
    kill(f);
  }

  function startWave(n: number) {
    const st = s.current;
    st.wave = n; setWave(n);
    st.toSpawn = castleWave(n).count;
    st.nextSpawn = clock() + 600;
    st.last = clock();
    setPhase("play");
    st.raf = requestAnimationFrame(frame);
  }

  function waveClear() {
    const st = s.current;
    cancelAnimationFrame(st.raf);
    st.coins += 20; setCoins(st.coins);
    sound.stageClear();
    if (castleWave(st.wave).boss) celebrate();
    setPhase("between");
  }

  function start() {
    stopAll();
    const st = s.current;
    st.pos.clear(); st.hearts = 5; st.coins = 0; st.score = 0; st.streak = 0; st.over = false; st.frozenUntil = 0;
    setHearts(5); setCoins(0); setScore(0); setNewBest(false); setFrozen(false);
    setBest(readBest(CASTLE_KEY));
    commitFoes([]);
    startWave(1);
  }

  function end() {
    stopAll();
    const st = s.current;
    st.over = true;
    const prev = readBest(CASTLE_KEY);
    if (st.score > prev) { writeBest(CASTLE_KEY, st.score); setBest(st.score); setNewBest(true); celebrate(); } else setBest(prev);
    setPhase("over");
  }

  /* same rule as frontFoe(), from state so it can render */
  const front = phase === "play" && foes.length ? foes.reduce((a, b) => (a.id < b.id ? a : b)) : null;

  /* opened from its "watch first" demo: skip the ready card */
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => start(), 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "ウェーブ" : "Wave"}</span><span className="match-stat-v mono">{wave}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "スコア" : "Score"}</span><span className="match-stat-v mono">{score}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "お城" : "Castle"}</span><span className="match-stat-v castle-hearts">{"❤️".repeat(Math.max(0, hearts))}</span></div>
      </div>

      <div className={`castle-scene${frozen ? " frozen" : ""}`}>
        <div className="castle-sky" aria-hidden="true">
          <span className="castle-cloud c1">☁️</span><span className="castle-cloud c2">☁️</span>
          <span className="castle-hills">⛰️<b>🏔️</b>⛰️</span>
          <span className="castle-trees">🌲🌳🌲🌲🌳🌲🌳🌲</span>
        </div>
        <div className="castle-keep" aria-hidden="true">
          <span className="castle-emoji">🏯</span>
          <span className="castle-archer"><Mascot animated={false} mood="excited" /></span>
        </div>
        <div className="castle-road" ref={roadRef}>
          {foes.map((f) => (
            <div key={f.id} className={`castle-foe row${f.row}${f.boss ? " boss" : ""}${front?.id === f.id ? " target" : ""}`}
              ref={(el) => { if (el) foeEls.current.set(f.id, el); else foeEls.current.delete(f.id); }}>
              {front?.id === f.id && <span className="castle-foe-q mono">{f.q.prompt}</span>}
              <span className="castle-foe-emoji">{f.emoji}</span>
              {f.boss && <span className="castle-foe-hp">{"♥".repeat(f.hp)}</span>}
            </div>
          ))}
          {shot && <span key={shot.k} className="castle-arrow" style={{ ["--to" as string]: `${shot.x}px` }} aria-hidden="true">➹</span>}
        </div>

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🏯 お城をまもれ！" : "🏯 Castle Defense"}</div>
            <p className="rg-card-sub">
              {ja ? "モンスターがお城にせまってくる！先頭のモンスターの計算に答えると矢が飛ぶよ。5ウェーブごとにボス登場。"
                  : "Monsters march on your castle! Answer the front monster's sum to fire an arrow. A boss comes every 5 waves."}
            </p>
            <button className="btn btn-primary" onClick={start}>{ja ? "たたかう！" : "Defend!"}</button>
          </div>
        )}
        {phase === "between" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? `ウェーブ ${wave} クリア！` : `Wave ${wave} cleared!`}</div>
            <div className="match-done-line mono">+20 🪙 · {coins} 🪙</div>
            {castleWave(wave + 1).boss && <p className="rg-card-sub">{ja ? "⚠️ 次はボスが来る！" : "⚠️ A boss is coming next!"}</p>}
            <button className="btn btn-primary" onClick={() => startWave(wave + 1)}>{ja ? `ウェーブ ${wave + 1} へ` : `Wave ${wave + 1}`}</button>
          </div>
        )}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && score > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "お城がおちた…" : "The castle fell…")}</div>
            <div className="match-done-line mono">{ja ? `ウェーブ ${wave}` : `Wave ${wave}`} · {score} {ja ? "点" : "pts"} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回" : "Try again"}</button>
          </div>
        )}
      </div>

      {phase === "play" && (
        <>
          {front ? (
            <div className="rg-answers">
              {front.q.options.map((o) => (
                <button key={o} className={`rg-ans mono${picked === o ? (o === front.q.answer ? " right" : " wrong") : ""}`} onClick={() => answer(o)}>{fmt(o)}</button>
              ))}
            </div>
          ) : (
            <p className="match-hint">{ja ? "モンスターが来るぞ…" : "Here they come…"}</p>
          )}
          <div className="castle-powers">
            <span className="mono">🪙 {coins}</span>
            <button className="btn" onClick={useFreeze} disabled={coins < FREEZE_COST || frozen}>❄️ {ja ? "こおらせる" : "Freeze"} {FREEZE_COST}</button>
            <button className="btn" onClick={useBomb} disabled={coins < BOMB_COST || !front}>💥 {ja ? "ばくだん" : "Bomb"} {BOMB_COST}</button>
          </div>
        </>
      )}
    </div>
  );
}
