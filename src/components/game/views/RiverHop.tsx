"use client";

import { useEffect, useRef, useState } from "react";
import { RunResults } from "./RunResults";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import { castleQuestion } from "@/lib/game/minigames";

type Sound = ReturnType<typeof useSound>;
type Props = { lang: "en" | "ja"; sound: Sound; celebrate: () => void; autoStart?: boolean; onCorrect?: (n: number) => void; onFriends?: () => void };

/* ---------- 🐸 River Hop ----------
   A frog crosses a river of LANES lanes of drifting lily pads. Each hop is a
   sum: the pads in the lane just ahead carry numbers, and tapping the pad
   with the answer makes the frog jump onto it. The frog then rides that pad
   with the current — if it is carried off the edge of the river, splash.
   A wrong pad sinks under the frog's nose (a life, but the frog stays put).
   The last hop is onto one of the far bank's flowers; then a new river with
   a faster current and a new time of day. Three lives.

   Pads move on a loop wider than the screen, so every pad comes round again.
   Positions are stepped per frame and drawn with transforms only. */
const BEST_KEY = "sutraSprint.riverBest";
const LIVES = 3;
const LANES = 4;
const PADS = 3;
const PAD_HALF = 38;               /* pads are 76px wide */
const HOP_MS = 360;
const SCENES = 4;                  /* day, sunset, night, autumn — one per river */
const laneSpeed = (river: number, lane: number) => Math.min(70, 18 + river * 7) * (0.8 + 0.14 * lane);   /* px/s */

type Pad = { id: number; lane: number; base: number; value: number | null; sunk: number };
type Spot = { lane: number; padId: number | null; x: number };   /* lane -1 = start bank, LANES = far bank */
type Hop = { from: { x: number; y: number }; to: Spot; at: number };

const clock = () => performance.now();
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
function readBest() { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; } }
function writeBest(v: number) { try { localStorage.setItem(BEST_KEY, String(v)); } catch {} }

export function RiverHop({ lang, sound, celebrate, autoStart, onCorrect, onFriends }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [pads, setPads] = useState<Pad[]>([]);
  const [goal, setGoal] = useState<(number | null)[]>([null, null, null]);
  const [prompt, setPrompt] = useState("");
  const [ahead, setAhead] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [river, setRiver] = useState(1);
  const [hops, setHops] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [pop, setPop] = useState<{ k: number; x: number; y: number; text: string; cls: string } | null>(null);
  const [splash, setSplash] = useState<{ k: number; x: number; y: number } | null>(null);
  const [banner, setBanner] = useState<{ k: number; big: string; small: string } | null>(null);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const padEls = useRef(new Map<number, HTMLButtonElement>());
  const frogEl = useRef<HTMLDivElement | null>(null);
  const s = useRef({
    raf: 0, last: 0, t0: 0, pads: [] as Pad[], frog: { lane: -1, padId: null, x: 0 } as Spot, hop: null as Hop | null,
    answer: 0, river: 1, score: 0, combo: 0, lives: LIVES, hops: 0, over: false, k: 0, askedAt: 0, busy: 0,
  });

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);

  /* the arena's size, kept in state for drawing (frames read it live) */
  const [box, setBox] = useState({ w: 360, h: 480 });
  useEffect(() => {
    const el = arenaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  function size() {
    const el = arenaRef.current;
    return { w: el?.clientWidth ?? 360, h: el?.clientHeight ?? 480 };
  }
  const laneY = (lane: number) => laneAt(lane, size().h);
  function loop() { return size().w + PAD_HALF * 4; }
  function padX(p: Pad, now: number) {
    const st = s.current;
    const L = loop();
    const dir = p.lane % 2 === 0 ? 1 : -1;
    const d = (((p.base + dir * laneSpeed(st.river, p.lane) * ((now - st.t0) / 1000)) % L) + L) % L;
    return d - PAD_HALF * 2;
  }
  const goalX = (i: number) => goalAt(i, size().w);

  function buildRiver() {
    const st = s.current;
    const L = loop();
    const list: Pad[] = [];
    let id = 1;
    for (let lane = 0; lane < LANES; lane++) {
      const shift = rand(0, L);
      for (let i = 0; i < PADS; i++) list.push({ id: id++, lane, base: shift + (L / PADS) * i, value: null, sunk: 0 });
    }
    st.pads = list;
  }

  /* the next sum, written on the lane ahead (or the far bank's flowers) */
  function ask() {
    const st = s.current;
    const next = st.frog.lane + 1;
    const q = castleQuestion(Math.min(6, st.river + Math.floor(next / 2)));
    st.answer = q.answer; st.askedAt = clock();
    const opts = [...q.options].sort(() => Math.random() - 0.5);
    labelPads(st.pads, -1, []);
    if (next >= LANES) setGoal(opts.slice(0, 3));
    else {
      setGoal([null, null, null]);
      /* the answer always goes on a pad that is on screen now; decoys anywhere */
      const now = clock(), { w } = size();
      const lane = st.pads.filter((p) => p.lane === next);
      const seen = lane.filter((p) => { const x = padX(p, now); return x > PAD_HALF + 10 && x < w - PAD_HALF - 10; });
      const home = (seen.length ? seen : lane)[Math.floor(rand(0, seen.length || lane.length))];
      const decoys = opts.filter((v) => v !== q.answer);
      labelPads(st.pads, next, lane.map((p) => (p.id === home.id ? q.answer : decoys.shift() ?? q.answer + 1 + p.id)));
    }
    setPads(st.pads.map((p) => ({ ...p })));
    setPrompt(q.prompt); setAhead(next);
  }

  function frame(now: number) {
    const st = s.current;
    if (st.over) return;
    st.last = now;
    const { w } = size();
    for (const p of st.pads) {
      const el = padEls.current.get(p.id);
      if (el) el.style.transform = `translate3d(${padX(p, now) - PAD_HALF}px,${laneY(p.lane) - PAD_HALF}px,0)`;
    }
    /* the frog: mid-hop, riding a pad, or sitting on a bank */
    let fx = st.frog.x, fy = laneY(st.frog.lane), lift = 0;
    if (st.hop) {
      const h = st.hop;
      const k = Math.min(1, (now - h.at) / HOP_MS);
      const to = h.to.padId !== null ? padX(st.pads.find((p) => p.id === h.to.padId)!, now) : h.to.x;
      fx = h.from.x + (to - h.from.x) * k;
      fy = h.from.y + (laneY(h.to.lane) - h.from.y) * k;
      lift = Math.sin(k * Math.PI) * 30;
      if (k >= 1) { st.hop = null; st.frog = { ...h.to, x: to }; landed(); }
    } else if (st.frog.padId !== null) {
      fx = padX(st.pads.find((p) => p.id === st.frog.padId)!, now);
      st.frog = { ...st.frog, x: fx };
      /* carried off the edge */
      if (fx < 6 || fx > w - 6) { fall(fx, fy, ja ? "ながされた！" : "Swept away!"); fx = st.frog.x; fy = laneY(st.frog.lane); }
    }
    if (frogEl.current) frogEl.current.style.transform = `translate3d(${fx - 26}px,${fy - 26 - lift}px,0) scale(${1 + lift / 120})`;
    if (st.lives <= 0) { end(); return; }
    st.raf = requestAnimationFrame(frame);
  }

  function landed() {
    const st = s.current;
    if (st.frog.lane >= LANES) {
      /* across! a new river */
      const bonus = 50 + st.river * 10;
      st.score += bonus; setScore(st.score);
      flash(st.frog.x, laneY(LANES) + 10, `+${bonus}`, "boss");
      st.river += 1; setRiver(st.river);
      setBanner({ k: ++st.k, big: ja ? "わたりきった！" : "Made it across!", small: ja ? `川 ${st.river}・流れがはやくなる！` : `River ${st.river} · faster current!` });
      sound.stageClear(); celebrate();
      st.busy = clock() + 1300;
      setTimeout(() => {
        if (st.over) return;
        st.t0 = clock(); buildRiver();
        st.frog = { lane: -1, padId: null, x: size().w / 2 };
        ask();
      }, 1300);
      return;
    }
    ask();
  }

  function fall(x: number, y: number, text: string) {
    const st = s.current;
    setSplash({ k: ++st.k, x, y });
    st.lives -= 1; setLives(Math.max(0, st.lives));
    st.combo = 0; setCombo(0);
    flash(x, y - 30, text, "bad");
    sound.wrong(); haptic(50);
    /* back to the start bank of this river */
    st.frog = { lane: -1, padId: null, x: size().w / 2 };
    if (st.lives > 0) ask();
  }

  function flash(x: number, y: number, text: string, cls: string) { setPop({ k: ++s.current.k, x, y, text, cls }); }

  function tryHop(target: Spot, value: number | null, pad?: Pad) {
    const st = s.current;
    const now = clock();
    if (phase !== "play" || st.hop || now < st.busy || value === null || target.lane !== st.frog.lane + 1) return;
    if (value !== st.answer) {
      /* the wrong pad sinks; the frog stays */
      if (pad) {
        setPads(st.pads.map((p) => ({ ...p, sunk: p.id === pad.id ? now : p.sunk })));
        setTimeout(() => setPads(s.current.pads.map((p) => ({ ...p }))), 700);
      }
      st.lives -= 1; setLives(Math.max(0, st.lives));
      st.combo = 0; setCombo(0);
      st.busy = now + 600;
      flash(pad ? padX(pad, now) : target.x, laneY(target.lane) - 30, ja ? "ちがう！" : "Wrong!", "bad");
      sound.wrong(); haptic(40);
      return;
    }
    st.hop = { from: { x: st.frog.x, y: laneY(st.frog.lane) }, to: target, at: now };
    /* quick answers score more */
    const quick = Math.max(0, 5 - Math.floor((now - st.askedAt) / 1000));
    st.combo += 1; setCombo(st.combo);
    st.hops += 1; setHops(st.hops);
    const pts = 10 + quick * 2 + Math.min(st.combo, 10);
    st.score += pts; setScore(st.score);
    flash(pad ? padX(pad, now) : target.x, laneY(target.lane) - 34, `+${pts}`, "good");
    sound.hit(); haptic(12); onCorrect?.(1);
    setPrompt("");
  }

  function start() {
    cancelAnimationFrame(s.current.raf);
    const st = s.current;
    Object.assign(st, { river: 1, score: 0, combo: 0, lives: LIVES, hops: 0, over: false, hop: null, busy: 0 });
    st.t0 = clock(); st.last = st.t0;
    buildRiver();
    st.frog = { lane: -1, padId: null, x: size().w / 2 };
    setScore(0); setCombo(0); setLives(LIVES); setRiver(1); setHops(0); setNewBest(false); setPop(null); setSplash(null); setBanner(null);
    setBest(readBest());
    setPhase("play");
    ask();
    st.raf = requestAnimationFrame(frame);
  }
  function end() {
    const st = s.current;
    if (st.over) return;
    st.over = true; cancelAnimationFrame(st.raf);
    const prev = readBest();
    if (st.score > prev) { writeBest(st.score); setBest(st.score); setNewBest(true); celebrate(); } else setBest(prev);
    setPhase("over");
  }
  /* opened from its "watch first" demo: skip the ready card */
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(() => start(), 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className="rg">
      <div className={`river-arena scene-${(river - 1) % SCENES}`} ref={arenaRef}>
        <div className="river-bg" aria-hidden="true">
          <span className="river-bank far"><i className="reed r1" /><i className="reed r2" /><i className="reed r3" /></span>
          <span className="river-water">{Array.from({ length: LANES }, (_, i) => <i key={i} className={`river-flow ${i % 2 ? "left" : "right"}`} />)}</span>
          <span className="river-bank near"><i className="reed r4" /><i className="reed r5" /></span>
          <span className="river-sky" />
        </div>
        <div className="river-hud">
          <span className="river-score mono">{score}</span>
          <span className="river-level">{ja ? `川 ${river}` : `River ${river}`}{combo > 1 && <em className="mono">×{combo}</em>}</span>
          <span className="river-lives">{"🐸".repeat(Math.max(0, lives))}<s>{"🐸".repeat(LIVES - Math.max(0, lives))}</s></span>
        </div>
        {phase === "play" && prompt && <div className="river-sign mono" key={prompt + hops}>{prompt} = ?</div>}

        {/* the far bank's flowers: the last hop */}
        {[0, 1, 2].map((i) => (
          <button key={i} className={`river-flower${goal[i] !== null && ahead >= LANES ? " live" : ""}`} style={{ left: goalAt(i, box.w) - 30, top: laneAt(LANES, box.h) - 26 }}
            onPointerDown={(e) => { e.preventDefault(); tryHop({ lane: LANES, padId: null, x: goalX(i) }, goal[i]); }} aria-label={goal[i] !== null ? String(goal[i]) : undefined}>
            <span className="river-flower-art" />
            {goal[i] !== null && ahead >= LANES && <span className="river-num mono">{fmt(goal[i]!)}</span>}
          </button>
        ))}

        {pads.map((p) => (
          <button key={p.id} className={`river-pad${p.lane === ahead && p.value !== null ? " live" : ""}${p.sunk ? " sunk" : ""}`}
            ref={(el) => { if (el) padEls.current.set(p.id, el); else padEls.current.delete(p.id); }}
            onPointerDown={(e) => { e.preventDefault(); const live = s.current.pads.find((x) => x.id === p.id)!; tryHop({ lane: p.lane, padId: p.id, x: 0 }, live.value, live); }}
            aria-label={p.value !== null ? String(p.value) : undefined}>
            <svg className="river-pad-art" viewBox="0 0 76 56" aria-hidden="true">
              <path d="M38 4 C60 4 74 16 74 28 C74 42 58 52 38 52 C18 52 2 42 2 28 C2 16 14 6 30 4 L38 28Z" fill="#5cbf5a" stroke="#1d4a2a" strokeWidth="3" strokeLinejoin="round" />
              <path d="M38 28 L20 16 M38 28 L56 14 M38 28 L60 38 M38 28 L16 40" stroke="#3f9a43" strokeWidth="2" fill="none" />
            </svg>
            {p.lane === ahead && p.value !== null && <span className="river-num mono">{fmt(p.value)}</span>}
          </button>
        ))}

        <div className="river-frog" ref={frogEl} aria-hidden="true">
          <svg viewBox="0 0 52 52" width="52" height="52">
            <ellipse cx="26" cy="32" rx="19" ry="15" fill="#7ed957" stroke="#1d4a2a" strokeWidth="3" />
            <path d="M8 40 Q2 46 10 48 M44 40 Q50 46 42 48" stroke="#1d4a2a" strokeWidth="3" fill="#7ed957" strokeLinecap="round" />
            <circle cx="16" cy="17" r="8" fill="#7ed957" stroke="#1d4a2a" strokeWidth="3" /><circle cx="36" cy="17" r="8" fill="#7ed957" stroke="#1d4a2a" strokeWidth="3" />
            <circle cx="16" cy="16" r="4" fill="#fff" /><circle cx="36" cy="16" r="4" fill="#fff" />
            <circle cx="17" cy="16" r="2.2" fill="#1d1b33" /><circle cx="37" cy="16" r="2.2" fill="#1d1b33" />
            <path d="M17 34 Q26 41 35 34" stroke="#1d4a2a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="12" cy="31" r="2.6" fill="#ff9aa8" opacity=".8" /><circle cx="40" cy="31" r="2.6" fill="#ff9aa8" opacity=".8" />
          </svg>
        </div>

        {splash && <span key={splash.k} className="river-splash" style={{ left: splash.x, top: splash.y }} aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * 45}deg` }} />)}</span>}
        {pop && <span key={pop.k} className={`space-pop ${pop.cls}`} style={{ left: pop.x, top: pop.y }}>{pop.text}</span>}
        {banner && <div key={banner.k} className="space-banner river"><b>{banner.big}</b><span>{banner.small}</span></div>}

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🐸 かえるジャンプ" : "🐸 River Hop"}</div>
            <p className="rg-card-sub">
              {ja ? "答えの数字がかいてあるハスの葉をタップして、かえるをジャンプさせよう！流されて川のはしまで行くとドボン。むこう岸まで行けたらクリア！"
                  : "Tap the lily pad with the answer to hop the frog onto it. Don't drift off the edge! Reach the far bank to cross the river."}
            </p>
            <button className="btn btn-primary" onClick={start}>{ja ? "ケロッとスタート！" : "Hop in!"}</button>
            {onFriends && <button className="btn arcade-friends" onClick={onFriends}>👥 {ja ? "友だちと対戦" : "Race your friends"}</button>}
          </div>
        )}
        {phase === "over" && <RunResults game="river" score={score} prevBest={best} newBest={newBest} lang={lang} onAgain={start} sound={sound} detail={ja ? `川 ${river}・${hops}ジャンプ` : `River ${river} · ${hops} hops`} />}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && score > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "ドボン！おしまい" : "Splash! Game over")}</div>
            <div className="match-done-line mono">{score} {ja ? "点" : "pts"} · {ja ? `川 ${river}` : `River ${river}`} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回" : "Again"}</button>
            {onFriends && <button className="btn arcade-friends" onClick={onFriends}>👥 {ja ? "友だちと対戦" : "Race your friends"}</button>}
          </div>
        )}
      </div>
      {phase === "play" && <p className="match-hint">{ja ? "👆 答えのハスの葉をタップしてジャンプ" : "👆 Tap the pad with the answer to hop"}</p>}
    </div>
  );
}

/* lane geometry: the start bank at the bottom, the far bank at the top */
function laneAt(lane: number, h: number) {
  const bank = 70, water = (h - bank * 2) / LANES;
  if (lane < 0) return h - bank / 2;
  if (lane >= LANES) return bank / 2;
  return h - bank - water * (lane + 0.5);
}
const goalAt = (i: number, w: number) => w * (0.2 + 0.3 * i);

/* write a sum's options on one lane's pads (and wipe the rest) — pads only live in the ref */
function labelPads(pads: Pad[], lane: number, values: number[]) {
  let i = 0;
  for (const p of pads) p.value = p.lane === lane ? values[i++] : null;
}
