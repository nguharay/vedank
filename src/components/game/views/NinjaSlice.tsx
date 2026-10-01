"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "../Mascot";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import { buildNinjaWave, NINJA_WAVES_PER_TIER } from "@/lib/game/minigames";

type Sound = ReturnType<typeof useSound>;
type Props = { lang: "en" | "ja"; sound: Sound; celebrate: () => void; onCorrect?: (n: number) => void };

/* ---------- 🥷 Ninja Slice ----------
   Fruit is tossed up from the bottom carrying numbers. Swipe your finger
   through the fruit that equals the sum — a clean slice, juice and all —
   and avoid the bombs. A wrong fruit or a bomb costs a life; so does letting
   the right fruit fall. Three lives.

   The fruit fly on real parabolas computed every frame (gravity, a launch
   velocity per fruit) and are drawn with transforms only. The swipe is a
   pointer trail; a fruit is sliced when the finger passes within its radius
   while moving fast enough to count as a swipe rather than a rest. */
const NINJA_KEY = "sutraSprint.ninjaBest";
const FRUITS = ["🍉", "🍊", "🍎", "🍐", "🍑", "🥝", "🍋", "🍇"];
const GRAVITY = 620;              /* px/s² — gentle, so a sum can be read and found in the air */
const READ_MS = 900;              /* the sum is shown this long before its fruit is tossed */
const LIVES = 3;
const SLICE_SPEED = 250;          /* px/s — slower than this is a rest, not a swipe */

type Fruit = {
  id: number; emoji: string; value: number | null; bomb: boolean;
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  sliced: boolean; sliceAt: number; wave: number;
};
type Wave = { id: number; prompt: string; answer: number; pending: number };

/* Only called from handlers and frames, never during render. */
const clock = () => performance.now();
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pickFruit = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

export function NinjaSlice({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [wave, setWave] = useState<Wave | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [waveNo, setWaveNo] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [pop, setPop] = useState<{ k: number; x: number; y: number; text: string; cls: string } | null>(null);
  const [tierBanner, setTierBanner] = useState<number | null>(null);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<SVGPolylineElement | null>(null);
  const fruitEls = useRef(new Map<number, HTMLDivElement>());
  const s = useRef({
    raf: 0, last: 0, fruits: [] as Fruit[], nextId: 1, waveNo: 0, wave: null as Wave | null,
    nextToss: 0, score: 0, combo: 0, lives: LIVES, over: false, popK: 0,
    queued: [] as { value: number | null; bomb: boolean; wave: number }[], launchAt: 0,
    trail: [] as { x: number; y: number; t: number }[], pointerDown: false,
  });

  function stopAll() { cancelAnimationFrame(s.current.raf); }
  useEffect(() => () => stopAll(), []);

  function size() {
    const el = arenaRef.current;
    return { w: el?.clientWidth ?? 360, h: el?.clientHeight ?? 420 };
  }

  /* toss one wave's fruit from the bottom in a spread, a touch apart in time */
  function toss() {
    const st = s.current;
    const n = st.waveNo;
    const built = buildNinjaWave(n);
    st.wave = { id: n, prompt: built.prompt, answer: built.answer, pending: built.items.filter((i) => !i.bomb && i.value === built.answer).length };
    setWave(st.wave);
    setWaveNo(n + 1);
    /* the sum appears first; the fruit follow after READ_MS (see frame) */
    st.queued = built.items.map((it) => ({ ...it, wave: n }));
    st.launchAt = clock() + READ_MS;
    st.nextToss = Infinity;
    const tier = 1 + Math.floor(n / NINJA_WAVES_PER_TIER);
    if (n > 0 && n % NINJA_WAVES_PER_TIER === 0) { setTierBanner(tier); sound.levelUp(); setTimeout(() => setTierBanner(null), 1800); }
    st.waveNo = n + 1;
  }
  function launch() {
    const st = s.current;
    const { w, h } = size();
    const items = st.queued; st.queued = [];
    const count = items.length;
    items.forEach((it, i) => {
      const x = w * (0.15 + (0.7 * (i + 0.5)) / count) + rand(-14, 14);
      /* aim the apex at 55–75% of the way up, under gravity */
      const apex = h * rand(0.22, 0.4);
      const vy = -Math.sqrt(2 * GRAVITY * (h - apex));
      const vx = (w / 2 - x) * rand(0.15, 0.4) + rand(-30, 30);
      st.fruits.push({
        id: st.nextId++, emoji: it.bomb ? "💣" : pickFruit(), value: it.value, bomb: it.bomb,
        x, y: h + 30 + i * 18, vx, vy, rot: rand(-30, 30), vr: rand(-120, 120), sliced: false, sliceAt: 0, wave: it.wave,
      });
    });
    setFruits([...st.fruits]);
  }

  function frame(now: number) {
    const st = s.current;
    if (st.over) return;
    const dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    const { h } = size();
    let changed = false;
    for (const f of st.fruits) {
      stepFruit(f, dt);
      const el = fruitEls.current.get(f.id);
      if (el) {
        /* the fruit spins; its number label stays upright and readable */
        el.style.transform = `translate3d(${f.x - 28}px,${f.y - 28}px,0)${f.sliced ? " scale(.6)" : ""}`;
        const emoji = el.firstElementChild as HTMLElement | null;
        if (emoji) emoji.style.transform = `rotate(${f.rot}deg)`;
      }
    }
    /* fruit that fell off the bottom: a right one lost is a miss */
    const fallen = st.fruits.filter((f) => f.y > h + 60);
    if (fallen.length) {
      for (const f of fallen) {
        if (!f.sliced && !f.bomb && st.wave && f.wave === st.wave.id && f.value === st.wave.answer) {
          st.wave.pending -= 1;
          loseLife(f.x, h - 40, ja ? "おちた！" : "Dropped!");
        }
      }
      st.fruits = st.fruits.filter((f) => f.y <= h + 60);
      changed = true;
    }
    /* sliced halves fade out after a moment */
    const before = st.fruits.length;
    st.fruits = st.fruits.filter((f) => !f.sliced || now - f.sliceAt < 600);
    if (st.fruits.length !== before) changed = true;
    if (changed) setFruits([...st.fruits]);
    if (st.queued.length && now >= st.launchAt) launch();
    /* wave over → toss the next after a beat */
    const live = st.fruits.some((f) => !f.sliced) || st.queued.length > 0;
    if (!live && st.nextToss === Infinity) st.nextToss = now + 700;
    if (now >= st.nextToss) toss();
    /* trail fades: keep the last 120 ms */
    st.trail = st.trail.filter((p) => now - p.t < 120);
    if (trailRef.current) trailRef.current.setAttribute("points", st.trail.map((p) => `${p.x},${p.y}`).join(" "));
    if (st.lives <= 0) { end(); return; }
    st.raf = requestAnimationFrame(frame);
  }

  function flash(x: number, y: number, text: string, cls: string) {
    const st = s.current;
    setPop({ k: ++st.popK, x, y, text, cls });
  }
  function loseLife(x: number, y: number, text: string) {
    const st = s.current;
    st.lives -= 1; setLives(Math.max(0, st.lives));
    st.combo = 0; setCombo(0);
    flash(x, y, text, "bad");
    sound.wrong(); haptic(40);
  }

  function slice(f: Fruit, now: number) {
    const st = s.current;
    f.sliced = true; f.sliceAt = now;
    f.vy = -200; f.vx *= 0.5;
    if (f.bomb) { loseLife(f.x, f.y, ja ? "ばくだん！" : "BOMB!"); return; }
    if (!st.wave || f.wave !== st.wave.id || f.value !== st.wave.answer) { loseLife(f.x, f.y, ja ? "ちがう！" : "Wrong!"); return; }
    st.wave.pending -= 1;
    st.combo += 1; setCombo(st.combo);
    const pts = 10 + Math.min(st.combo, 15) * 2;
    st.score += pts; setScore(st.score);
    flash(f.x, f.y, `+${pts}`, "good");
    sound.hit(); haptic(12); onCorrect?.(1);
    if (st.combo % 10 === 0) celebrate();
    /* all the right fruit sliced: the rest of the wave is just scenery */
    if (st.wave.pending <= 0) retireWave(st.fruits, st.wave.id);
  }

  /* ---- the swipe ---- */
  function at(e: React.PointerEvent) {
    const r = arenaRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: clock() };
  }
  function onDown(e: React.PointerEvent) {
    if (phase !== "play") return;
    e.preventDefault();
    const st = s.current;
    st.pointerDown = true;
    st.trail = [at(e)];
    arenaRef.current?.setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const st = s.current;
    if (!st.pointerDown || phase !== "play") return;
    const p = at(e);
    const prev = st.trail[st.trail.length - 1];
    st.trail.push(p);
    if (!prev) return;
    const dt = Math.max(1, p.t - prev.t) / 1000;
    const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt;
    if (speed < SLICE_SPEED) return;
    /* any un-sliced fruit the segment prev→p passes near */
    for (const f of st.fruits) {
      if (f.sliced) continue;
      if (segDist(prev.x, prev.y, p.x, p.y, f.x, f.y) < 30) slice(f, p.t);
    }
  }
  function onUp(e: React.PointerEvent) {
    const st = s.current;
    st.pointerDown = false;
    st.trail = [];
    arenaRef.current?.releasePointerCapture?.(e.pointerId);
  }

  function start() {
    stopAll();
    const st = s.current;
    Object.assign(st, { fruits: [], nextId: 1, waveNo: 0, wave: null, nextToss: 0, score: 0, combo: 0, lives: LIVES, over: false, trail: [], pointerDown: false, queued: [], launchAt: 0 });
    setFruits([]); setWave(null); setScore(0); setCombo(0); setLives(LIVES); setWaveNo(0); setNewBest(false); setPop(null);
    setBest(readBest());
    setPhase("play");
    st.last = clock();
    st.nextToss = st.last + 500;
    st.raf = requestAnimationFrame(frame);
  }
  function end() {
    const st = s.current;
    if (st.over) return;
    st.over = true; stopAll();
    const prev = readBest();
    if (st.score > prev) { writeBest(st.score); setBest(st.score); setNewBest(true); celebrate(); } else setBest(prev);
    setPhase("over");
  }
  function readBest() { try { return Number(localStorage.getItem(NINJA_KEY) || 0); } catch { return 0; } }
  function writeBest(v: number) { try { localStorage.setItem(NINJA_KEY, String(v)); } catch {} }

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "スコア" : "Score"}</span><span className="match-stat-v mono">{score}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "コンボ" : "Combo"}</span><span className="match-stat-v mono">{combo > 1 ? `×${combo}` : "–"}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "ライフ" : "Lives"}</span><span className="match-stat-v castle-hearts">{"❤️".repeat(Math.max(0, lives))}{"🖤".repeat(LIVES - Math.max(0, lives))}</span></div>
      </div>

      <div className="ninja-arena" ref={arenaRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="ninja-bg" aria-hidden="true"><span className="ninja-moon" /><span className="ninja-hills" /></div>
        {phase === "play" && wave && (
          <div className="ninja-q mono">{wave.prompt} = ?<span className="ninja-wave">{ja ? `ウェーブ ${waveNo}` : `Wave ${waveNo}`}</span></div>
        )}
        {fruits.map((f) => (
          <div key={f.id} className={`ninja-fruit${f.sliced ? " sliced" : ""}${f.bomb ? " bomb" : ""}`}
            ref={(el) => { if (el) fruitEls.current.set(f.id, el); else fruitEls.current.delete(f.id); }}>
            <span className="ninja-emoji">{f.emoji}</span>
            {!f.bomb && <span className="ninja-num mono">{fmt(f.value ?? 0)}</span>}
          </div>
        ))}
        <svg className="ninja-trail" aria-hidden="true"><polyline ref={trailRef} points="" /></svg>
        {pop && <span key={pop.k} className={`ninja-pop ${pop.cls}`} style={{ left: pop.x, top: pop.y }}>{pop.text}</span>}
        {tierBanner && <div key={tierBanner} className="sushi-levelup"><b>{ja ? `レベル ${tierBanner}！` : `Level ${tierBanner}!`}</b><span>{ja ? "計算がむずかしくなる！" : "Harder sums!"}</span></div>}
        <span className="ninja-sensei" aria-hidden="true"><Mascot animated={phase === "play"} mood="excited" /></span>

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🥷 忍者スライス" : "🥷 Ninja Slice"}</div>
            <p className="rg-card-sub">
              {ja ? "数字のついたフルーツが飛んでくる！答えのフルーツを指でスパッと切ろう。ばくだんはさわらないで！"
                  : "Fruit flies up with numbers on it. Swipe through the fruit that equals the sum — and don't touch the bombs!"}
            </p>
            <button className="btn btn-primary" onClick={start}>{ja ? "いざ、参る！" : "Begin!"}</button>
          </div>
        )}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && score > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "修行おわり" : "Training over")}</div>
            <div className="match-done-line mono">{score} {ja ? "点" : "pts"} · {ja ? `ウェーブ ${waveNo}` : `Wave ${waveNo}`} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回" : "Again"}</button>
          </div>
        )}
      </div>
      {phase === "play" && <p className="match-hint">{ja ? "👆 指でスワイプして切る" : "👆 Swipe to slice"}</p>}
    </div>
  );
}

/* physics step and wave retirement live outside the component: they mutate
   the fruit objects, which only ever live in the ref */
function stepFruit(f: Fruit, dt: number) {
  f.vy += GRAVITY * dt;
  f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
}
function retireWave(fruits: Fruit[], waveId: number) {
  for (const g of fruits) if (g.wave === waveId) g.wave = -1;
}

/* distance from point (px,py) to the segment (ax,ay)→(bx,by) */
function segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
