"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "../Mascot";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import {
  buildChoiceRound, runnerWindowMs, runnerPoints, racePlace, raceLevel, rivalProgress, RACE_GOAL, RACE_LEVELS, type ChoiceRound,
} from "@/lib/game/minigames";

type Sound = ReturnType<typeof useSound>;
type Props = { lang: "en" | "ja"; sound: Sound; celebrate: () => void; onCorrect?: (n: number) => void };

function readBest(key: string) {
  try { return Number(localStorage.getItem(key) || 0); } catch { return 0; }
}
function writeBest(key: string, v: number) {
  try { localStorage.setItem(key, String(v)); } catch {}
}

/* The three answer buttons both games use. */
function Answers({ round, onPick, picked, disabled }: {
  round: ChoiceRound; onPick: (v: number) => void; picked: number | null; disabled: boolean;
}) {
  return (
    <div className="rg-answers">
      {round.options.map((o) => (
        <button
          key={o}
          className={`rg-ans mono${picked === o ? (o === round.answer ? " right" : " wrong") : ""}`}
          onClick={() => onPick(o)}
          disabled={disabled}
        >
          {fmt(o)}
        </button>
      ))}
    </div>
  );
}

/* ---------- Math Runner ----------
   The boy runs through the fields; a rock, log or cactus comes at him. Tap the
   right answer and he sprints and jumps it. A wrong tap — or no tap before it
   arrives — trips him and costs a heart.

   Everything moves at ONE world speed, driven from a single animation frame:
   the ground, trees, hills and the obstacle all scroll by the same distance
   (scaled for parallax), so the obstacle sits on the ground instead of sliding
   over it. A right answer raises the target speed and the real speed eases up
   to it, so the sprint is smooth rather than a jump cut. Only transforms are
   written per frame — nothing that triggers layout. */
const OBSTACLES = ["🪨", "🪵", "🌵", "🦔", "🧱"];
const RUNNER_KEY = "sutraSprint.runnerBest";
/* Kept outside the components: they are only ever called from event handlers
   and animation frames, never during render. */
const clock = () => performance.now();
const randomObstacle = () => OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
/* one half of the scrolling tree line; drawn twice so the loop is seamless */
const TREES = ["🌳", "🌲", "🌳", "🌷", "🌲", "🌳"];
/* background tile widths in px — must match the CSS background-size */
const CLOUD_TILE = 360, HILL_TILE = 340, GROUND_TILE = 88;
const OBS_HALF = 20;

type RunState = "approach" | "cleared" | "wrong" | "crashed";

export function RunnerGame({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "run" | "over">("ready");
  const [round, setRound] = useState<ChoiceRound | null>(null);
  const [obs, setObs] = useState(OBSTACLES[0]);
  const [picked, setPicked] = useState<number | null>(null);
  const [anim, setAnim] = useState<"run" | "jump" | "trip">("run");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [pop, setPop] = useState<{ k: number; text: string } | null>(null);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const obsRef = useRef<HTMLDivElement | null>(null);
  const cloudsRef = useRef<HTMLDivElement | null>(null);
  const hillsRef = useRef<HTMLDivElement | null>(null);
  const treesRef = useRef<HTMLDivElement | null>(null);
  const groundRef = useRef<HTMLDivElement | null>(null);
  const s = useRef({
    raf: 0, last: 0, world: 0, v: 0, target: 0, base: 0, obsX: 0,
    state: "approach" as RunState, jumped: false, over: false,
    streak: 0, lives: 3, score: 0, timer: 0 as unknown as ReturnType<typeof setTimeout>,
  });

  function stopAll() {
    cancelAnimationFrame(s.current.raf);
    clearTimeout(s.current.timer);
  }
  useEffect(() => () => stopAll(), []);

  const width = () => sceneRef.current?.clientWidth ?? 360;
  const boyX = () => width() * 0.14 + 32;
  const tx = (el: HTMLElement | null, x: number) => { if (el) el.style.transform = `translate3d(${x}px,0,0)`; };

  function spawn() {
    const st = s.current;
    const w = width();
    st.obsX = w + OBS_HALF + 10;
    st.state = "approach"; st.jumped = false;
    /* the answer window is the time the obstacle takes to reach him */
    st.base = (st.obsX - boyX()) / (runnerWindowMs(st.streak) / 1000);
    st.target = st.base;
    setRound(buildChoiceRound(st.streak));
    setObs(randomObstacle());
    setPicked(null); setAnim("run");
  }

  function frame(now: number) {
    const st = s.current;
    if (st.over) return;
    const dt = Math.min(0.1, (now - st.last) / 1000);
    st.last = now;
    /* ease toward the target speed; stopping (a trip) is much quicker */
    const k = st.target < st.v ? 14 : 4;
    st.v += (st.target - st.v) * Math.min(1, dt * k);
    const d = st.v * dt;
    st.world += d;
    st.obsX -= d;

    tx(cloudsRef.current, -((st.world * 0.08) % CLOUD_TILE));
    tx(hillsRef.current, -((st.world * 0.3) % HILL_TILE));
    const treeTile = (treesRef.current?.firstElementChild as HTMLElement | null)?.offsetWidth || width();
    tx(treesRef.current, -((st.world * 0.6) % treeTile));
    tx(groundRef.current, -(st.world % GROUND_TILE));
    tx(obsRef.current, st.obsX - OBS_HALF);

    const gap = st.obsX - boyX();
    if (st.state === "cleared" && !st.jumped && gap <= st.v * 0.3) {
      /* the jump peaks ~0.3 s in — start it so the peak is over the obstacle */
      st.jumped = true; setAnim("jump"); sound.hit();
    }
    if ((st.state === "approach" || st.state === "wrong") && gap <= OBS_HALF + 4) crash();
    if (st.state === "cleared" && st.obsX < -OBS_HALF * 3) spawn();

    st.raf = requestAnimationFrame(frame);
  }

  function crash() {
    const st = s.current;
    st.state = "crashed";
    st.target = 0; st.v *= 0.25;
    setAnim("trip"); sound.wrong(); haptic(40);
    st.streak = 0; setStreak(0);
    st.lives -= 1; setLives(st.lives);
    st.timer = setTimeout(() => {
      if (st.lives <= 0) { end(); return; }
      spawn();
    }, 900);
  }

  function pick(v: number) {
    const st = s.current;
    if (!round || st.state !== "approach" || phase !== "run") return;
    setPicked(v);
    if (v !== round.answer) {
      /* the obstacle rushes in and he trips on it */
      st.state = "wrong"; st.target = st.base * 2.2;
      return;
    }
    st.state = "cleared";
    st.target = st.base * 2.4;
    st.streak += 1; setStreak(st.streak);
    const pts = runnerPoints(st.streak);
    st.score += pts; setScore(st.score);
    setPop({ k: st.score, text: `+${pts}` });
    sound.correct(); haptic(12);
    onCorrect?.(1);
    if (st.streak % 10 === 0) celebrate();
  }

  function start() {
    stopAll();
    const st = s.current;
    st.streak = 0; st.lives = 3; st.score = 0; st.over = false;
    setStreak(0); setLives(3); setScore(0); setNewBest(false);
    setBest(readBest(RUNNER_KEY));
    setPhase("run");
    spawn();
    st.v = st.base;
    st.last = clock();
    st.raf = requestAnimationFrame(frame);
  }

  function end() {
    stopAll();
    s.current.over = true;
    const sc = s.current.score;
    const prev = readBest(RUNNER_KEY);
    if (sc > prev) { writeBest(RUNNER_KEY, sc); setBest(sc); setNewBest(true); celebrate(); }
    else setBest(prev);
    setPhase("over");
  }

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "スコア" : "Score"}</span><span className="match-stat-v mono">{score}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "れんぞく" : "Streak"}</span><span className="match-stat-v mono">{streak > 1 ? `×${streak}` : "–"}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "ライフ" : "Lives"}</span><span className="match-stat-v">{"❤️".repeat(Math.max(0, lives))}{"🖤".repeat(3 - Math.max(0, lives))}</span></div>
      </div>

      <div className="run-scene" ref={sceneRef}>
        <div className="run-sun" aria-hidden="true" />
        <div className="run-clouds" ref={cloudsRef} aria-hidden="true" />
        <div className="run-hills" ref={hillsRef} aria-hidden="true" />
        <div className="run-trees" ref={treesRef} aria-hidden="true">
          {[0, 1].map((h) => <span key={h}>{TREES.map((t, i) => <b key={i}>{t}</b>)}</span>)}
        </div>
        <div className="run-ground" ref={groundRef} aria-hidden="true" />
        <div className={`run-boy ${phase === "run" ? anim : "idle"}`} aria-hidden="true">
          <Mascot mood={anim === "trip" ? "sad" : anim === "jump" ? "excited" : "happy"} animated={false} />
        </div>
        {phase === "run" && <div className="run-obs" ref={obsRef} aria-hidden="true">{obs}</div>}
        {pop && phase === "run" && <div key={pop.k} className="run-pop mono">{pop.text}</div>}
        {phase === "run" && round && (
          <div className="run-q mono" aria-live="polite">{round.prompt} = ?</div>
        )}
        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🏃 計算ランナー" : "🏃 Math Runner"}</div>
            <p className="rg-card-sub">{ja ? "じゃまものが来る前に答えをタップしてジャンプ！まちがえるところぶよ。" : "Tap the answer before the obstacle reaches you and you jump it. Miss and you trip!"}</p>
            <button className="btn btn-primary" onClick={start}>{ja ? "スタート！" : "Start!"}</button>
          </div>
        )}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && score > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "ゴール！" : "Run over!")}</div>
            <div className="match-done-line mono">{score} {ja ? "点" : "pts"} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回" : "Run again"}</button>
          </div>
        )}
      </div>

      {phase === "run" && round && (
        <Answers round={round} onPick={pick} picked={picked} disabled={anim === "trip" || picked !== null} />
      )}
      {phase === "run" && <p className="match-hint">{ja ? "正しい答えでジャンプ！" : "Right answer = jump!"}</p>}
    </div>
  );
}

/* ---------- Math Race ----------
   A three-lane road race against two CPU rivals. The sums stay easy at every
   level; what changes is the rivals — slow at Lv1, a real race by Lv4. The
   boy only moves when you answer; RACE_GOAL right answers crosses the line,
   and a wrong one makes him stumble for a moment. Coming 1st unlocks the
   next level. */
const RACE_UNLOCK_KEY = "sutraSprint.raceUnlocked";
/* highest level won — the Games shelf card shows it */
const RACE_WON_KEY = "sutraSprint.raceBest";
const raceBestKey = (lv: number) => `sutraSprint.raceBest.L${lv}`;

export function RaceGame({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "count" | "race" | "over">("ready");
  const [unlocked, setUnlocked] = useState(() => Math.max(1, readBest(RACE_UNLOCK_KEY)));
  const [lvId, setLvId] = useState(() => Math.max(1, readBest(RACE_UNLOCK_KEY)));
  const [count, setCount] = useState(3);
  const [round, setRound] = useState<ChoiceRound | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [stumble, setStumble] = useState(false);
  const [done, setDone] = useState(0);
  const [livePlace, setLivePlace] = useState(1);
  const [result, setResult] = useState<{ secs: number; place: number; best: boolean; unlockedNext: boolean } | null>(null);
  const [best, setBest] = useState(0);
  const level = raceLevel(lvId);

  const rivalRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const s = useRef({ raf: 0, t0: 0, done: 0, streak: 0, over: false, timer: 0 as unknown as ReturnType<typeof setTimeout>, place: 1, lv: 1 });

  function stopAll() {
    cancelAnimationFrame(s.current.raf);
    clearTimeout(s.current.timer);
  }
  useEffect(() => () => stopAll(), []);

  /* bottom offset for a runner at progress p (0 start, 1 finish) */
  const at = (p: number) => `calc(${4 + Math.min(1, p) * 80}%)`;

  function tick(now: number) {
    const st = s.current;
    if (st.over) return;
    const secs = (now - st.t0) / 1000;
    const lv = raceLevel(st.lv);
    const mine = st.done / RACE_GOAL;
    let ahead = 0;
    lv.rivals.forEach((r, i) => {
      const p = rivalProgress(r, secs, i + st.lv);
      if (p > mine) ahead++;
      const el = rivalRefs.current[i];
      if (el) el.style.bottom = at(p);
    });
    if (timeRef.current) timeRef.current.textContent = secs.toFixed(1);
    const place = 1 + ahead;
    if (place !== st.place) { st.place = place; setLivePlace(place); }
    st.raf = requestAnimationFrame(tick);
  }

  function start(lv = lvId) {
    stopAll();
    const st = s.current;
    st.done = 0; st.streak = 0; st.over = false; st.place = 1; st.lv = lv;
    setLvId(lv);
    setDone(0); setResult(null); setPicked(null); setStumble(false); setLivePlace(1);
    setBest(readBest(raceBestKey(lv)));
    rivalRefs.current.forEach((el) => { if (el) el.style.bottom = at(0); });
    setPhase("count"); setCount(3);
    let c = 3;
    const step = () => {
      c -= 1;
      if (c > 0) { setCount(c); sound.click(); st.timer = setTimeout(step, 700); return; }
      setPhase("race"); sound.levelUp();
      setRound(buildChoiceRound(0));
      st.t0 = clock();
      st.raf = requestAnimationFrame(tick);
    };
    sound.click();
    st.timer = setTimeout(step, 700);
  }

  function pick(v: number) {
    const st = s.current;
    if (!round || stumble || phase !== "race" || st.over) return;
    setPicked(v);
    if (v !== round.answer) {
      setStumble(true); sound.wrong(); haptic(34); st.streak = 0;
      st.timer = setTimeout(() => { setStumble(false); setPicked(null); setRound(buildChoiceRound(st.streak)); }, 800);
      return;
    }
    sound.correct(); haptic(12); onCorrect?.(1);
    st.done += 1; st.streak += 1; setDone(st.done);
    if (st.done >= RACE_GOAL) { finish(); return; }
    st.timer = setTimeout(() => { setPicked(null); setRound(buildChoiceRound(st.streak)); }, 180);
  }

  function finish() {
    const st = s.current;
    st.over = true;
    cancelAnimationFrame(st.raf);
    const secs = Math.round(((clock() - st.t0) / 1000) * 10) / 10;
    const lv = raceLevel(st.lv);
    const place = racePlace(lv, secs);
    const prev = readBest(raceBestKey(lv.id));
    const isBest = prev === 0 || secs < prev;
    if (isBest) { writeBest(raceBestKey(lv.id), secs); setBest(secs); } else setBest(prev);
    let unlockedNext = false;
    if (place === 1) {
      celebrate();
      if (lv.id > readBest(RACE_WON_KEY)) writeBest(RACE_WON_KEY, lv.id);
      const nextId = lv.id + 1;
      if (nextId <= RACE_LEVELS.length && nextId > unlocked) {
        writeBest(RACE_UNLOCK_KEY, nextId); setUnlocked(nextId); unlockedNext = true;
      }
    }
    setResult({ secs, place, best: isBest, unlockedNext });
    setPhase("over");
  }

  const medal = ["🥇", "🥈", "🥉"];
  const placeTxt = (p: number) => (ja ? `${p}位` : ["1st", "2nd", "3rd"][p - 1]);
  const hasNext = lvId < RACE_LEVELS.length && lvId + 1 <= unlocked;
  const rivalNames = level.rivals.map((r) => (ja ? r.nameJa : r.name)).join(ja ? "と" : " and ");

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "順位" : "Place"}</span><span className="match-stat-v rg-nowrap">{phase === "race" ? `${medal[livePlace - 1]} ${placeTxt(livePlace)}` : "–"}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "のこり" : "To go"} · Lv.{level.id}</span><span className="match-stat-v mono">{RACE_GOAL - done}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "タイム" : "Time"}</span><span className="match-stat-v mono"><span ref={timeRef}>0.0</span>s</span></div>
      </div>

      <div className={`race-track${phase === "race" ? " moving" : ""}`}>
        <div className="race-side left" aria-hidden="true">🌳<br />🌷<br />🌲<br />🌼<br />🌳</div>
        <div className="race-road">
          <div className="race-finish" aria-hidden="true"><span>GOAL</span></div>
          <div className="race-lane" style={{ left: "16.6%" }}>
            <div className="race-runner rival" ref={(el) => { rivalRefs.current[0] = el; }} style={{ bottom: at(0) }}>
              <span className="race-emoji">{level.rivals[0].emoji}</span>
              <span className="race-name">{ja ? level.rivals[0].nameJa : level.rivals[0].name}</span>
            </div>
          </div>
          <div className="race-lane" style={{ left: "50%" }}>
            <div className={`race-runner me${stumble ? " stumble" : ""}`} style={{ bottom: at(done / RACE_GOAL) }}>
              <span className="race-boy"><Mascot mood={stumble ? "sad" : "excited"} animated={false} /></span>
              <span className="race-name you">{ja ? "きみ" : "You"}</span>
            </div>
          </div>
          <div className="race-lane" style={{ left: "83.3%" }}>
            <div className="race-runner rival" ref={(el) => { rivalRefs.current[1] = el; }} style={{ bottom: at(0) }}>
              <span className="race-emoji">{level.rivals[1].emoji}</span>
              <span className="race-name">{ja ? level.rivals[1].nameJa : level.rivals[1].name}</span>
            </div>
          </div>
        </div>
        <div className="race-side right" aria-hidden="true">🌲<br />🌻<br />🌳<br />🌷<br />🌲</div>

        {phase === "count" && <div key={count} className="race-count mono">{count}</div>}
        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🏁 計算レース" : "🏁 Math Race"}</div>
            <p className="rg-card-sub">
              {ja
                ? `正解でダッシュ！${RACE_GOAL}問正解でゴール。レベルが上がるとライバルが速くなるよ。`
                : `Every right answer is a dash. ${RACE_GOAL} to the finish. Higher levels have faster rivals.`}
            </p>
            <div className="race-levels">
              {RACE_LEVELS.map((l) => {
                const locked = l.id > unlocked;
                return (
                  <button key={l.id} className={`race-lvbtn${l.id === lvId ? " on" : ""}${locked ? " locked" : ""}`}
                    disabled={locked} onClick={() => setLvId(l.id)} aria-pressed={l.id === lvId}>
                    <span className="race-lvbtn-emo">{locked ? "🔒" : `${l.rivals[0].emoji}${l.rivals[1].emoji}`}</span>
                    <span className="race-lvbtn-name">Lv.{l.id}</span>
                    <span className="race-lvbtn-sub">{ja ? l.nameJa : l.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="race-vs">{ja ? `ライバル：${rivalNames}` : `Rivals: ${rivalNames}`}</p>
            <button className="btn btn-primary" onClick={() => start()}>{ja ? "よーい、スタート！" : "Ready, set, go!"}</button>
          </div>
        )}
        {phase === "over" && result && (
          <div className="rg-card">
            <div className="rg-card-medal">{medal[result.place - 1]}</div>
            <div className="rg-card-title">
              {result.place === 1 ? (ja ? "1位でゴール！" : "You won!") : ja ? `${result.place}位でゴール！` : `${placeTxt(result.place)} place!`}
            </div>
            <div className="match-done-line mono">
              Lv.{level.id} · {result.secs}s · {result.best ? (ja ? "ベストタイム！" : "best time!") : `${ja ? "ベスト" : "best"} ${best}s`}
            </div>
            {result.unlockedNext && (
              <div className="race-unlock">{ja ? `🔓 Lv.${lvId + 1} がひらいた！` : `🔓 Lv.${lvId + 1} unlocked!`}</div>
            )}
            {result.place > 1 && (
              <div className="race-unlock soft">{ja ? "1位になると次のレベルがひらくよ" : "Come 1st to unlock the next level"}</div>
            )}
            <div className="race-over-btns">
              <button className="btn" onClick={() => start()}>{ja ? "もう一回" : "Race again"}</button>
              {hasNext && <button className="btn btn-primary" onClick={() => start(lvId + 1)}>{ja ? `Lv.${lvId + 1} へ ▶` : `Lv.${lvId + 1} ▶`}</button>}
              <button className="btn" onClick={() => setPhase("ready")}>{ja ? "レベル" : "Levels"}</button>
            </div>
          </div>
        )}
      </div>

      {phase === "race" && round && (
        <>
          <div className="race-q mono">{round.prompt} = ?</div>
          <Answers round={round} onPick={pick} picked={picked} disabled={stumble} />
        </>
      )}
    </div>
  );
}
