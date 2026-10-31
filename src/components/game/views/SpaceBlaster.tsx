"use client";

import { useEffect, useRef, useState } from "react";
import { RunResults } from "./RunResults";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import { castleQuestion } from "@/lib/game/minigames";

type Sound = ReturnType<typeof useSound>;
type Props = { lang: "en" | "ja"; sound: Sound; celebrate: () => void; autoStart?: boolean; onCorrect?: (n: number) => void };

/* ---------- 🚀 Space Blaster ----------
   Asteroids drift down from the top of space, each carrying a number. A sum
   is shown on the cockpit screen; tap the asteroid with the answer and the
   ship slides over and fires a laser at it. A wrong tap, or letting the right
   rock reach the ship, costs a shield. Three shields.

   Every BOSS_EVERY right answers a UFO arrives with BOSS_HP armour: it sinks
   slowly and throws the rocks, and every right answer also zaps it. Beat it
   before it reaches the ship for a big bonus and a shield back.

   Rocks fall on positions stepped every frame and drawn with transforms only
   (like Ninja Slice); taps are plain pointer-downs on the rocks. */
const BEST_KEY = "sutraSprint.spaceBest";
const SHIELDS = 3;
const ROCK_HALF = 34;             /* rocks are 68px; positions are their centres */
const SHIP_Y = 58;                /* the ship's centre, from the bottom */
const TOP = 100;                  /* the cockpit bar: rocks and the UFO come out from under it */
const BOSS_EVERY = 8;
const BOSS_HP = 3;
const PER_LEVEL = 6;              /* right answers per level: sums get harder, rocks faster */
const fallSpeed = (level: number) => Math.min(78, 30 + (level - 1) * 7);   /* px/s */

/* The planets you fly past, one per level. They are scenery only — nothing
   ever hits a planet; the rocks you blast are stray asteroids. Each is drawn
   friendly: a soft glow, a little shine, a smile. */
export type Planet = { en: string; ja: string; a: string; b: string; c: string; ring?: string; bands?: string; spots?: string };
const PLANETS: Planet[] = [
  { en: "Saturn", ja: "土星", a: "#ffe2a8", b: "#f0b45a", c: "#b9783a", ring: "#ffe9b8" },
  { en: "Earth", ja: "地球", a: "#9fe3ff", b: "#3f9be0", c: "#1d5fa8", spots: "#6fd16a" },
  { en: "Jupiter", ja: "木星", a: "#ffe9d0", b: "#e6a77a", c: "#a8643e", bands: "#c98a5e" },
  { en: "Neptune", ja: "海王星", a: "#b8d4ff", b: "#5a7fe8", c: "#2c3fa8" },
  { en: "Mars", ja: "火星", a: "#ffc2a0", b: "#e8704a", c: "#a83a2a", spots: "#c4553a" },
  { en: "Uranus", ja: "天王星", a: "#d8fff8", b: "#7fd8d0", c: "#3a9a98", ring: "#c8f4ff" },
];
export const planetFor = (level: number) => PLANETS[(level - 1) % PLANETS.length];

type Rock = { id: number; x: number; y: number; vy: number; spin: number; value: number; wave: number; gone: boolean };
type Boss = { y: number; hp: number; x: number; t: number };
type Fx = { k: number; kind: "laser" | "boom" | "bossboom" | "zap"; x: number; y: number; x2?: number; y2?: number };

const clock = () => performance.now();
function readBest() { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; } }
function writeBest(v: number) { try { localStorage.setItem(BEST_KEY, String(v)); } catch {} }
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function SpaceBlaster({ lang, sound, celebrate, autoStart, onCorrect }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [prompt, setPrompt] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shields, setShields] = useState(SHIELDS);
  const [level, setLevel] = useState(1);
  const [hits, setHits] = useState(0);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [shipX, setShipX] = useState(50);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [pop, setPop] = useState<{ k: number; x: number; y: number; text: string; cls: string } | null>(null);
  const [banner, setBanner] = useState<{ k: number; big: string; small: string } | null>(null);
  const [hurt, setHurt] = useState(0);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const rockEls = useRef(new Map<number, HTMLButtonElement>());
  const bossEl = useRef<HTMLDivElement | null>(null);
  const s = useRef({
    raf: 0, last: 0, rocks: [] as Rock[], nextId: 1, wave: 0, answer: 0, waveLive: false, nextWave: 0,
    score: 0, combo: 0, shields: SHIELDS, hits: 0, level: 1, boss: null as Boss | null, bossDue: BOSS_EVERY,
    over: false, k: 0,
  });

  useEffect(() => () => cancelAnimationFrame(s.current.raf), []);

  function size() {
    const el = arenaRef.current;
    return { w: el?.clientWidth ?? 360, h: el?.clientHeight ?? 460 };
  }

  /* a new sum: three or four rocks in shuffled columns, a little staggered */
  function spawnWave() {
    const st = s.current;
    const { w } = size();
    const q = castleQuestion(Math.min(6, st.level));
    const opts = [...q.options];
    if (st.level >= 3) {
      const extra = [q.answer + 3, q.answer - 3, q.answer + 11].find((v) => v > 0 && !opts.includes(v));
      if (extra !== undefined) insertSomewhere(opts, extra);
    }
    st.wave += 1; st.answer = q.answer; st.waveLive = true;
    setPrompt(q.prompt);
    const n = opts.length;
    const lanes = opts.map((_, i) => i).sort(() => Math.random() - 0.5);
    const from = st.boss;
    opts.forEach((value, i) => {
      const lane = lanes[i];
      const x = w * (0.13 + (0.74 * (lane + 0.5)) / n) + rand(-10, 10);
      /* from the boss (when there is one) or from just above the top */
      const y = from ? from.y + 40 : TOP - ROCK_HALF - rand(0, 50);
      st.rocks.push({ id: st.nextId++, x: from ? from.x : x, y, vy: fallSpeed(st.level) * rand(0.9, 1.12), spin: rand(-40, 40), value, wave: st.wave, gone: false });
      /* rocks thrown by the boss fan out to their columns */
      if (from) st.rocks[st.rocks.length - 1].x = x;
    });
    setRocks([...st.rocks]);
  }

  function frame(now: number) {
    const st = s.current;
    if (st.over) return;
    const dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    const { w, h } = size();
    const shipLine = h - SHIP_Y - 26;
    let changed = false;

    for (const r of st.rocks) {
      if (r.gone) continue;
      stepRock(r, dt);
      const el = rockEls.current.get(r.id);
      if (el) {
        el.style.transform = `translate3d(${r.x - ROCK_HALF}px,${r.y - ROCK_HALF}px,0)`;
        const body = el.firstElementChild as HTMLElement | null;
        if (body) body.style.transform = `rotate(${(r.y * r.spin) / 60}deg)`;
      }
      /* reached the ship: the right one hurts; wrong ones fly past */
      if (r.y > shipLine) {
        setGone(r); changed = true;
        if (r.wave === st.wave && r.value === st.answer && st.waveLive) {
          st.waveLive = false;
          retire(st.wave);
          hurtShip(r.x, shipLine, ja ? "よけられなかった！" : "Hit!");
          st.nextWave = now + 900;
        }
      }
    }
    if (changed) { st.rocks = st.rocks.filter((r) => !r.gone); setRocks([...st.rocks]); }

    /* the boss sinks and sways; at the ship it fires and leaves */
    if (st.boss) {
      const b = st.boss;
      stepBoss(b, dt, w, st.level);
      if (bossEl.current) bossEl.current.style.transform = `translate3d(${b.x - 60}px,${b.y - 34}px,0)`;
      if (b.y > shipLine - 90) {
        st.boss = null; setBoss(null);
        hurtShip(w / 2, shipLine, ja ? "UFOのこうげき！" : "UFO attack!");
        setBanner({ k: ++st.k, big: ja ? "UFOがにげた…" : "The UFO got away…", small: ja ? "つぎはたおそう！" : "Get it next time!" });
      }
    }

    if (!st.waveLive && now >= st.nextWave && st.shields > 0) spawnWave();
    if (st.shields <= 0) { end(); return; }
    st.raf = requestAnimationFrame(frame);
  }

  function retire(wave: number) {
    /* the rest of the wave shatters — scenery now */
    for (const r of shatter(s.current.rocks, wave)) addFx({ kind: "boom", x: r.x, y: r.y });
    s.current.rocks = s.current.rocks.filter((r) => !r.gone);
    setRocks([...s.current.rocks]);
  }

  function addFx(e: Omit<Fx, "k">, ms = 650) {
    const k = ++s.current.k;
    setFx((list) => [...list, { ...e, k }]);
    setTimeout(() => setFx((list) => list.filter((x) => x.k !== k)), ms);
  }
  function flash(x: number, y: number, text: string, cls: string) { setPop({ k: ++s.current.k, x, y, text, cls }); }

  function hurtShip(x: number, y: number, text: string) {
    const st = s.current;
    st.shields -= 1; setShields(Math.max(0, st.shields));
    st.combo = 0; setCombo(0);
    setHurt((n) => n + 1);
    flash(x, y - 20, text, "bad");
    sound.wrong(); haptic(50);
  }

  function shoot(id: number) {
    const st = s.current;
    const r = st.rocks.find((x) => x.id === id);
    if (phase !== "play" || !r || r.gone || r.wave !== st.wave || !st.waveLive) return;
    const { w, h } = size();
    const sy = h - SHIP_Y - 20;
    if (r.value !== st.answer) {
      /* a wrong rock: it cracks and the shields take it */
      setGone(r); addFx({ kind: "zap", x: r.x, y: r.y });
      st.rocks = st.rocks.filter((x) => !x.gone); setRocks([...st.rocks]);
      hurtShip(r.x, r.y + 20, ja ? "ちがう！" : "Wrong!");
      return;
    }
    /* the ship slides under it and fires */
    setShipX(Math.max(8, Math.min(92, (r.x / w) * 100)));
    addFx({ kind: "laser", x: r.x, y: sy, x2: r.x, y2: r.y }, 260);
    st.waveLive = false;
    retire(st.wave);
    addFx({ kind: "boom", x: r.x, y: r.y }, 700);
    st.combo += 1; setCombo(st.combo);
    st.hits += 1; setHits(st.hits);
    const pts = 10 + Math.min(st.combo, 15) * 2;
    st.score += pts; setScore(st.score);
    flash(r.x, r.y, `+${pts}`, "good");
    sound.hit(); haptic(14); onCorrect?.(1);
    st.nextWave = clock() + 450;

    /* the boss takes a zap for every right answer */
    if (st.boss) {
      const b = st.boss;
      hurtBoss(b);
      addFx({ kind: "laser", x: r.x, y: sy, x2: b.x, y2: b.y }, 300);
      if (b.hp <= 0) {
        addFx({ kind: "bossboom", x: b.x, y: b.y }, 1100);
        st.boss = null; setBoss(null);
        st.score += 100; setScore(st.score);
        st.shields = Math.min(SHIELDS, st.shields + 1); setShields(st.shields);
        flash(b.x, b.y, "+100", "boss");
        setBanner({ k: ++st.k, big: ja ? "UFOをたおした！" : "UFO destroyed!", small: ja ? "+100・シールド回復" : "+100 · shield repaired" });
        sound.stageClear(); celebrate();
        st.nextWave = clock() + 1400;
      } else setBoss({ ...b });
    }
    /* level up every PER_LEVEL; a boss every BOSS_EVERY */
    const lv = 1 + Math.floor(st.hits / PER_LEVEL);
    if (lv > st.level) {
      st.level = lv; setLevel(lv); sound.levelUp();
      const pl = planetFor(lv);
      if (!st.boss) setBanner({ k: ++st.k, big: ja ? `レベル ${lv}！` : `Level ${lv}!`, small: ja ? `${pl.ja}のそばを飛行中・いん石がはやくなる！` : `Flying past ${pl.en} · faster rocks!` });
    }
    if (st.hits >= st.bossDue && !st.boss) {
      st.bossDue += BOSS_EVERY;
      st.boss = { y: TOP + 34, hp: BOSS_HP + Math.floor(st.level / 4), x: w / 2, t: 0 };
      setBoss({ ...st.boss });
      setBanner({ k: ++st.k, big: ja ? "⚠ UFO しゅうらい！" : "⚠ UFO incoming!", small: ja ? "正解してビームでたおせ！" : "Every right answer zaps it!" });
      sound.bossFanfare();
      st.nextWave = clock() + 1500;
    }
  }

  function start() {
    cancelAnimationFrame(s.current.raf);
    const st = s.current;
    Object.assign(st, { rocks: [], nextId: 1, wave: 0, answer: 0, waveLive: false, score: 0, combo: 0, shields: SHIELDS, hits: 0, level: 1, boss: null, bossDue: BOSS_EVERY, over: false });
    setRocks([]); setPrompt(""); setScore(0); setCombo(0); setShields(SHIELDS); setLevel(1); setHits(0); setBoss(null);
    setShipX(50); setNewBest(false); setPop(null); setBanner(null); setFx([]);
    setBest(readBest());
    setPhase("play");
    st.last = clock();
    st.nextWave = st.last + 600;
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
      <div className="space-arena" ref={arenaRef}>
        {hurt > 0 && <span key={hurt} className="space-hurt" aria-hidden="true" />}
        <div className="space-bg" aria-hidden="true">
          <span className="space-stars s1" /><span className="space-stars s2" /><span className="space-stars s3" />
          <span className="space-nebula" />
          <PlanetArt key={level} p={planetFor(level)} label={ja ? planetFor(level).ja : planetFor(level).en} />
        </div>
        <div className="space-hud">
          <span className="space-score mono">{score}</span>
          <span className="space-level">{ja ? `Lv ${level}` : `Lv ${level}`}{combo > 1 && <em className="mono">×{combo}</em>}</span>
          <span className="space-shields" aria-label={ja ? "シールド" : "Shields"}>
            {Array.from({ length: SHIELDS }, (_, i) => <i key={i} className={i < shields ? "on" : ""} />)}
          </span>
        </div>
        {phase === "play" && prompt && (
          <div className="space-screen mono" key={prompt + hits}>{prompt} = ?</div>
        )}

        {boss && (
          <div className="space-boss" ref={bossEl} aria-hidden="true">
            <svg viewBox="0 0 120 68" width="120" height="68">
              <ellipse cx="60" cy="30" rx="24" ry="20" fill="#9fe8ff" stroke="#1d1b33" strokeWidth="3" />
              <circle cx="52" cy="28" r="4" fill="#1d1b33" /><circle cx="68" cy="28" r="4" fill="#1d1b33" />
              <ellipse cx="60" cy="44" rx="56" ry="16" fill="#8a5cf5" stroke="#1d1b33" strokeWidth="3" />
              <ellipse cx="60" cy="40" rx="40" ry="7" fill="#b89bff" />
              {[18, 39, 60, 81, 102].map((x, i) => <circle key={x} className={`ufo-light l${i}`} cx={x} cy="48" r="4" fill="#ffd84a" stroke="#1d1b33" strokeWidth="1.5" />)}
            </svg>
            <span className="space-boss-hp">{Array.from({ length: boss.hp }, (_, i) => <i key={i} />)}</span>
          </div>
        )}

        {rocks.map((r) => (
          <button key={r.id} className="space-rock" ref={(el) => { if (el) rockEls.current.set(r.id, el); else rockEls.current.delete(r.id); }}
            onPointerDown={(e) => { e.preventDefault(); shoot(r.id); }} aria-label={String(r.value)}>
            <span className="space-rock-body"><i className="c1" /><i className="c2" /><i className="c3" /></span>
            <span className="space-rock-num mono">{fmt(r.value)}</span>
          </button>
        ))}

        {fx.map((e) => e.kind === "laser" ? (
          <span key={e.k} className="space-laser" style={laserStyle(e)} aria-hidden="true" />
        ) : (
          <span key={e.k} className={`space-boom ${e.kind}`} style={{ left: e.x, top: e.y }} aria-hidden="true">
            {Array.from({ length: e.kind === "bossboom" ? 12 : 8 }, (_, i) => <i key={i} style={{ ["--a" as string]: `${i * (360 / (e.kind === "bossboom" ? 12 : 8))}deg` }} />)}
          </span>
        ))}
        {pop && <span key={pop.k} className={`space-pop ${pop.cls}`} style={{ left: pop.x, top: pop.y }}>{pop.text}</span>}
        {banner && <div key={banner.k} className="space-banner"><b>{banner.big}</b><span>{banner.small}</span></div>}

        <div className="space-ship" style={{ left: `${shipX}%` }} aria-hidden="true">
          <svg viewBox="0 0 64 80" width="56" height="70">
            <path d="M32 4 C44 16 48 34 46 56 L18 56 C16 34 20 16 32 4Z" fill="#f4f1ea" stroke="#1d1b33" strokeWidth="3" />
            <circle cx="32" cy="28" r="8" fill="#5bc8f5" stroke="#1d1b33" strokeWidth="3" />
            <path d="M18 40 L6 60 L18 56Z M46 40 L58 60 L46 56Z" fill="#ff5a5f" stroke="#1d1b33" strokeWidth="3" strokeLinejoin="round" />
            <path d="M24 56 L40 56 L36 64 L28 64Z" fill="#8a8aa0" stroke="#1d1b33" strokeWidth="2.5" />
          </svg>
          {phase === "play" && <span className="space-flame" />}
          {shields > 0 && phase === "play" && <span className={`space-shield n${shields}`} />}
        </div>

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🚀 スペースシューター" : "🚀 Space Blaster"}</div>
            <p className="rg-card-sub">
              {ja ? "数字のいん石がふってくる！答えのいん石をタップしてレーザーでうちおとそう。まちがえるとシールドがへるよ。8問ごとにUFOがやってくる！"
                  : "Number rocks are falling! Tap the rock with the answer to blast it. Wrong taps cost a shield. Every 8 answers a UFO attacks!"}
            </p>
            <button className="btn btn-primary" onClick={start}>{ja ? "発進！" : "Launch!"}</button>
          </div>
        )}
        {phase === "over" && <RunResults game="space" score={score} prevBest={best} newBest={newBest} lang={lang} onAgain={start} sound={sound} detail={ja ? `${hits}こ撃破・Lv ${level}` : `${hits} blasted · Lv ${level}`} />}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && score > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "ミッション終了" : "Mission over")}</div>
            <div className="match-done-line mono">{score} {ja ? "点" : "pts"} · {ja ? `${hits}こ撃破` : `${hits} blasted`} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回" : "Again"}</button>
          </div>
        )}
      </div>
      {phase === "play" && <p className="match-hint">{ja ? "👆 答えのいん石をタップ" : "👆 Tap the rock with the answer"}</p>}
    </div>
  );
}

/* a beam from (x, y) up to (x2, y2): a vertical bar pivoted at its foot */
function laserStyle(e: Fx): React.CSSProperties {
  const dx = (e.x2 ?? e.x) - e.x, up = e.y - (e.y2 ?? e.y);
  const len = Math.hypot(dx, up);
  return { left: e.x - 3, top: e.y - len, height: len, transformOrigin: "50% 100%", transform: `rotate(${Math.atan2(dx, up) * 180 / Math.PI}deg)` };
}

/* these mutate the rocks, which only ever live in the ref */
function stepRock(r: Rock, dt: number) { r.y += r.vy * dt; }
function setGone(r: Rock) { r.gone = true; }
function stepBoss(b: Boss, dt: number, w: number, level: number) {
  b.t += dt;
  b.y += (7 + level) * dt;
  b.x = w / 2 + Math.sin(b.t * 1.1) * (w * 0.28);
}
function hurtBoss(b: Boss) { b.hp -= 1; }
function shatter(rocks: Rock[], wave: number): Rock[] {
  const hit = rocks.filter((r) => r.wave === wave && !r.gone);
  for (const r of hit) r.gone = true;
  return hit;
}
function insertSomewhere<T>(list: T[], v: T) { list.splice(Math.floor(Math.random() * (list.length + 1)), 0, v); }

/* a friendly planet: glow, shading, an optional ring / bands / land, a shine and a smile */
export function PlanetArt({ p, label }: { p: Planet; label: string }) {
  const id = `pl-${p.en}`;
  return (
    <span className="space-planet">
      <svg viewBox="0 0 160 130" width="150" height="122">
        <defs>
          <radialGradient id={`${id}-g`} cx="38%" cy="34%" r="70%"><stop offset="0" stopColor={p.a} /><stop offset=".55" stopColor={p.b} /><stop offset="1" stopColor={p.c} /></radialGradient>
          <radialGradient id={`${id}-glow`}><stop offset=".55" stopColor={p.b} stopOpacity=".45" /><stop offset="1" stopColor={p.b} stopOpacity="0" /></radialGradient>
          <clipPath id={`${id}-clip`}><circle cx="80" cy="65" r="42" /></clipPath>
          <clipPath id={`${id}-front`}><rect x="0" y="65" width="160" height="65" /></clipPath>
        </defs>
        <circle cx="80" cy="65" r="62" fill={`url(#${id}-glow)`} />
        {p.ring && <ellipse cx="80" cy="65" rx="74" ry="16" fill="none" stroke={p.ring} strokeWidth="6" opacity=".55" transform="rotate(-14 80 65)" />}
        <circle cx="80" cy="65" r="42" fill={`url(#${id}-g)`} stroke="#1d1b33" strokeWidth="3" />
        <g clipPath={`url(#${id}-clip)`}>
          {p.bands && [38, 52, 78, 92].map((y, i) => <rect key={y} x="30" y={y} width="100" height={i % 2 ? 5 : 8} fill={p.bands} opacity=".55" rx="3" />)}
          {p.spots && <><ellipse cx="62" cy="50" rx="14" ry="9" fill={p.spots} opacity=".85" /><ellipse cx="98" cy="80" rx="11" ry="8" fill={p.spots} opacity=".85" /><ellipse cx="88" cy="38" rx="6" ry="4" fill={p.spots} opacity=".7" /></>}
        </g>
        {p.ring && <g transform="rotate(-14 80 65)"><ellipse cx="80" cy="65" rx="74" ry="16" fill="none" stroke={p.ring} strokeWidth="6" clipPath={`url(#${id}-front)`} /></g>}
        <ellipse cx="64" cy="46" rx="11" ry="6" fill="#fff" opacity=".55" transform="rotate(-30 64 46)" />
        <circle cx="70" cy="68" r="3" fill="#1d1b33" /><circle cx="90" cy="68" r="3" fill="#1d1b33" />
        <path d="M72 77 Q80 84 88 77" stroke="#1d1b33" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="64" cy="76" r="3.4" fill="#ff8fb1" opacity=".6" /><circle cx="96" cy="76" r="3.4" fill="#ff8fb1" opacity=".6" />
      </svg>
      <em>{label}</em>
    </span>
  );
}
