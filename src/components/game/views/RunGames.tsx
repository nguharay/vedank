"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "../Mascot";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import {
  raceCreateAction, raceJoinAction, raceRoomAction, raceStartAction, raceAnswerAction,
} from "@/lib/actions/game-actions";
import type { RaceRoomView } from "@/lib/game/raceOnline";
import {
  raceQuestion, RACE_ROOM_MAX,
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

function CpuRace({ lang, sound, celebrate, onCorrect, onOnline }: Props & { onOnline: () => void }) {
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
            <button className="btn race-online-btn" onClick={onOnline}>🌐 {ja ? "友だちとオンライン対戦" : "Race friends online"}</button>
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

/* ---------- Math Race: the mode switch ----------
   vs CPU (levels) or online with friends. A shared link (?rr=CODE) opens
   straight into the online room. */
export function RaceGame(props: Props & { guest: boolean; onNeedAccount: () => void; joinCode: string | null; onJoined: () => void }) {
  const [mode, setMode] = useState<"cpu" | "online">(props.joinCode ? "online" : "cpu");
  if (mode === "online") {
    return <OnlineRace {...props} onBack={() => setMode("cpu")} />;
  }
  return (
    <CpuRace {...props} onOnline={() => {
      if (props.guest) { props.onNeedAccount(); return; }
      setMode("online");
    }} />
  );
}

/* ---------- Math Race: online ----------
   2–4 friends, one room code, the same sums for everyone. The room is polled
   once a second — like online tic-tac-toe, no socket needed; your own runner
   moves the instant you answer and the server confirms it. */
const FRIEND_AVATARS = ["🐶", "🐱", "🐼", "🦁"];

function OnlineRace({ lang, sound, celebrate, onCorrect, joinCode, onJoined, onBack }: Props & {
  joinCode: string | null; onJoined: () => void; onBack: () => void;
}) {
  const ja = lang === "ja";
  const [room, setRoom] = useState<RaceRoomView | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myDone, setMyDone] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [stumble, setStumble] = useState(false);
  const [now, setNow] = useState(0);
  const offset = useRef(0);
  const round = useRef(-1);
  const celebrated = useRef(-1);
  const stumbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Every room update goes through here: line the clock up with the server
     and, on a new round, reset our own runner. */
  function take(v: RaceRoomView) {
    offset.current = v.now - Date.now();
    if (v.round !== round.current) {
      round.current = v.round;
      setMyDone(0); setPicked(null); setStumble(false);
    }
    const mine = v.players.find((p) => p.me);
    /* never step backwards, but accept the server's count if it is ahead */
    if (mine) setMyDone((d) => Math.max(d, mine.done));
    setRoom(v);
  }

  async function create() {
    setBusy(true); setNote(null);
    try { take(await raceCreateAction()); } catch { setNote(ja ? "部屋を作れませんでした" : "Could not make a room"); }
    setBusy(false);
  }
  async function join(c: string) {
    setBusy(true); setNote(null);
    try {
      const res = await raceJoinAction(c);
      if ("error" in res) setNote(res.error); else take(res);
    } catch { setNote(ja ? "参加できませんでした" : "Could not join"); }
    setBusy(false);
  }
  async function startRace() {
    if (!room) return;
    setBusy(true);
    try { const res = await raceStartAction(room.code); if ("error" in res) setNote(res.error); else { setNote(null); take(res); } } catch {}
    setBusy(false);
  }

  /* A shared link joins straight away. */
  const joinedRef = useRef(false);
  useEffect(() => {
    if (!joinCode || joinedRef.current) return;
    joinedRef.current = true;
    onJoined();
    void (async () => {
      try {
        const res = await raceJoinAction(joinCode);
        if ("error" in res) setNote(res.error); else take(res);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  /* Poll the room; tick a local clock for the countdown and timer. */
  const roomCode = room?.code;
  useEffect(() => {
    if (!roomCode) return;
    const poll = setInterval(async () => {
      try { const r = await raceRoomAction(roomCode); if (r) take(r); } catch {}
    }, 1000);
    const tick = setInterval(() => setNow(Date.now() + offset.current), 100);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [roomCode]);
  useEffect(() => () => { if (stumbleTimer.current) clearTimeout(stumbleTimer.current); }, []);

  async function share() {
    if (!room) return;
    const url = `${window.location.origin}/?rr=${room.code}`;
    try { if (navigator.share) { await navigator.share({ title: "Sutra Sprint", text: ja ? "計算レースで勝負しよう！" : "Race me in Math Race!", url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); setNote(ja ? "リンクをコピーしました" : "Link copied"); } catch {}
  }

  /* status, derived from the local clock so the countdown flips on time */
  const status = !room ? null
    : room.status === "countdown" && room.startAt !== null && now >= room.startAt ? "racing" : room.status;
  const goal = room?.goal ?? RACE_GOAL;
  const iFinished = myDone >= goal;
  const q = room && status === "racing" && !iFinished ? raceQuestion(room.seed, myDone) : null;

  async function pick(v: number) {
    if (!room || !q || stumble || picked !== null) return;
    setPicked(v);
    if (v !== q.answer) {
      setStumble(true); sound.wrong(); haptic(34);
      stumbleTimer.current = setTimeout(() => { setStumble(false); setPicked(null); }, 800);
      return;
    }
    sound.correct(); haptic(12); onCorrect?.(1);
    const idx = myDone;
    setMyDone(idx + 1);
    setTimeout(() => setPicked(null), 150);
    try { const res = await raceAnswerAction(room.code, idx, v); if (!("error" in res)) take(res); } catch {}
  }

  const at = (p: number) => `calc(${4 + Math.min(1, p) * 80}%)`;
  const medal = ["🥇", "🥈", "🥉", "4️⃣"];
  /* standings: finished first by time, then by how far along */
  const ranked = room ? [...room.players].sort((a, b) =>
    (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity) || b.done - a.done) : [];
  const placeOf = (key: string) => ranked.findIndex((p) => p.key === key) + 1;
  const me = room?.players.find((p) => p.me);
  const elapsed = room?.startAt && now > room.startAt ? (now - room.startAt) / 1000 : 0;

  /* celebrate a win once per round */
  useEffect(() => {
    if (status === "done" && room && me && placeOf(me.key) === 1 && celebrated.current !== room.round) {
      celebrated.current = room.round;
      celebrate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, room?.round]);

  /* ---- no room yet: make one or type a code ---- */
  if (!room) {
    return (
      <div className="rg">
        <div className="race-online-menu">
          <div className="rg-card-title">🌐 {ja ? "オンライン計算レース" : "Online Math Race"}</div>
          <p className="rg-card-sub">
            {ja ? `2〜${RACE_ROOM_MAX}人で同じ問題を解いて競争！部屋を作ってコードを友だちに送ろう。`
                : `2–${RACE_ROOM_MAX} friends, the same sums, one race. Make a room and send your friends the code.`}
          </p>
          <button className="btn btn-primary" onClick={create} disabled={busy}>{ja ? "部屋を作る" : "Make a room"}</button>
          <div className="race-join">
            <input className="race-join-input mono" value={code} maxLength={4} placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} aria-label={ja ? "部屋のコード" : "Room code"} />
            <button className="btn" onClick={() => join(code)} disabled={busy || code.length !== 4}>{ja ? "参加" : "Join"}</button>
          </div>
          {note && <p className="race-note">{note}</p>}
          <button className="btn btn-ghost" onClick={onBack}>← {ja ? "CPUとレース" : "Race the CPU"}</button>
        </div>
      </div>
    );
  }

  const n = room.players.length;
  const laneLeft = (i: number) => `${((i + 0.5) / n) * 100}%`;

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "順位" : "Place"}</span>
          <span className="match-stat-v rg-nowrap">{me && status !== "lobby" && status !== "countdown" ? `${medal[placeOf(me.key) - 1]}` : "–"}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "のこり" : "To go"}</span><span className="match-stat-v mono">{goal - myDone}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "タイム" : "Time"}</span><span className="match-stat-v mono">{elapsed.toFixed(1)}s</span></div>
      </div>

      <div className={`race-track${status === "racing" ? " moving" : ""}`}>
        <div className="race-side left" aria-hidden="true">🌳<br />🌷<br />🌲<br />🌼<br />🌳</div>
        <div className="race-road lanes-custom">
          <div className="race-finish" aria-hidden="true"><span>GOAL</span></div>
          {Array.from({ length: n - 1 }, (_, i) => (
            <div key={i} className="race-divider" style={{ left: `${((i + 1) / n) * 100}%` }} aria-hidden="true" />
          ))}
          {room.players.map((p, i) => {
            const done = p.me ? myDone : p.done;
            return (
              <div key={p.key} className="race-lane" style={{ left: laneLeft(i) }}>
                <div className={`race-runner online${p.me ? " me" : ""}${p.me && stumble ? " stumble" : ""}`} style={{ bottom: at(done / goal) }}>
                  {p.me
                    ? <span className="race-boy"><Mascot mood={stumble ? "sad" : "excited"} animated={false} /></span>
                    : <span className="race-emoji">{FRIEND_AVATARS[i % FRIEND_AVATARS.length]}</span>}
                  <span className={`race-name${p.me ? " you" : ""}`}>{p.me ? (ja ? "きみ" : "You") : p.name}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="race-side right" aria-hidden="true">🌲<br />🌻<br />🌳<br />🌷<br />🌲</div>

        {status === "countdown" && room.startAt !== null && (
          <div key={Math.ceil((room.startAt - now) / 1000)} className="race-count mono">{Math.max(1, Math.ceil((room.startAt - now) / 1000))}</div>
        )}

        {status === "lobby" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "部屋のコード" : "Room code"}</div>
            <div className="race-code mono">{room.code}</div>
            <button className="btn" onClick={share}>🔗 {ja ? "友だちに送る" : "Send to friends"}</button>
            <ul className="race-players">
              {room.players.map((p, i) => (
                <li key={p.key}>{p.me ? "🧒" : FRIEND_AVATARS[i % FRIEND_AVATARS.length]} {p.me ? (ja ? `${p.name}（きみ）` : `${p.name} (you)`) : p.name}{p.host ? " 👑" : ""}</li>
              ))}
              {n < RACE_ROOM_MAX && <li className="race-wait">{ja ? "友だちを待っています…" : "Waiting for friends…"}</li>}
            </ul>
            {room.isHost
              ? <button className="btn btn-primary" onClick={startRace} disabled={busy || n < 2}>{n < 2 ? (ja ? "2人以上でスタート" : "Needs 2 racers") : (ja ? "よーい、スタート！" : "Start the race!")}</button>
              : <p className="race-note">{ja ? "ホストがスタートするのを待っています" : "Waiting for the host to start"}</p>}
            {note && <p className="race-note">{note}</p>}
          </div>
        )}

        {(status === "done" || (status === "racing" && iFinished)) && (
          <div className="rg-card">
            {me && <div className="rg-card-medal">{medal[placeOf(me.key) - 1]}</div>}
            <div className="rg-card-title">
              {status === "done"
                ? (me && placeOf(me.key) === 1 ? (ja ? "1位！きみの勝ち！" : "You won!") : (ja ? "レース終了！" : "Race over!"))
                : (ja ? "ゴール！みんなを待っています…" : "Finished! Waiting for the others…")}
            </div>
            <ol className="race-results">
              {ranked.map((p) => (
                <li key={p.key} className={p.me ? "me" : ""}>
                  <span>{p.me ? (ja ? "きみ" : "You") : p.name}</span>
                  <span className="mono">{p.finishMs !== null ? `${(p.finishMs / 1000).toFixed(1)}s` : `${p.done}/${goal}`}</span>
                </li>
              ))}
            </ol>
            {status === "done" && (room.isHost
              ? <button className="btn btn-primary" onClick={startRace} disabled={busy}>{ja ? "もう一回レース" : "Race again"}</button>
              : <p className="race-note">{ja ? "ホストが次のレースを始めるのを待っています" : "Waiting for the host to start the next race"}</p>)}
          </div>
        )}
      </div>

      {q && (
        <>
          <div className="race-q mono">{q.prompt} = ?</div>
          <Answers round={q} onPick={pick} picked={picked} disabled={stumble} />
        </>
      )}
      <div className="race-online-foot">
        <span className="mono">{ja ? "部屋" : "Room"} {room.code}</span>
        <button className="btn btn-ghost" onClick={() => { setRoom(null); onBack(); }}>{ja ? "退出" : "Leave"}</button>
      </div>
    </div>
  );
}
