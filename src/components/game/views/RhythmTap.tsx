"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "../Mascot";
import { fmt, haptic } from "../util";
import type { useSound } from "../useSound";
import { castleQuestion, type ChoiceRound } from "@/lib/game/minigames";

type Sound = ReturnType<typeof useSound>;
type Props = { lang: "en" | "ja"; sound: Sound; celebrate: () => void; onCorrect?: (n: number) => void };

/* ---------- 🎵 Rhythm Tap ----------
   A three-lane rhythm game. A row — one sum and three answers — falls down
   the lanes in time with the music and reaches the hit line exactly on a
   beat. Tap the lane with the right answer as it crosses the line: close to
   the beat is PERFECT, a little off is GOOD. The wrong lane, or letting it
   pass, is a MISS; five misses and the song stops.

   The music is synthesised with Web Audio (kick, snare, hats, bass and a
   pentatonic arpeggio over I–V–vi–IV), so there are no audio files. The
   audio clock is the game clock: rows are placed on the same beat grid the
   drums are scheduled on, so the notes land where the music says they will.

   Every STAGE_ROWS rows the stage goes up: the tempo rises, rows come closer
   together, and the sums step up a tier (the Castle Defense ladder, which is
   all mental maths). */
const STAGE_ROWS = 12;
const LIVES = 5;
const PERFECT = 0.14, GOOD = 0.42;           /* seconds either side of the beat */
const RHYTHM_KEY = "sutraSprint.rhythmBest";
const NOTE_Y = 52;

const bpmFor = (stage: number) => Math.min(150, 84 + (stage - 1) * 9);
const beatsPerRowFor = (stage: number) => (stage <= 2 ? 4 : stage <= 5 ? 3 : 2);

type Row = { id: number; time: number; fall: number; q: ChoiceRound; stage: number; result: null | "perfect" | "good" | "miss"; picked: number | null };

/* C-major pentatonic chords, I–V–vi–IV; MIDI note numbers */
const CHORDS = [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]];
const ARP = [0, 1, 2, 1, 3, 2, 1, 2];        /* 3 = root an octave up */
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
/* only called from handlers and the audio setup, never during render */
const rand = () => Math.random();
let judgeKey = 0;
const nextJudgeKey = () => ++judgeKey;

function readBest() { try { return Number(localStorage.getItem(RHYTHM_KEY) || 0); } catch { return 0; } }
function writeBest(v: number) { try { localStorage.setItem(RHYTHM_KEY, String(v)); } catch {} }

export function RhythmTap({ lang, sound, celebrate, onCorrect }: Props) {
  const ja = lang === "ja";
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [rows, setRows] = useState<Row[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [stage, setStage] = useState(1);
  const [judge, setJudge] = useState<{ k: number; text: string; cls: string } | null>(null);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [stageBanner, setStageBanner] = useState<number | null>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const rowEls = useRef(new Map<number, HTMLDivElement>());
  const g = useRef({
    ctx: null as AudioContext | null, master: null as GainNode | null, noise: null as AudioBuffer | null,
    raf: 0, rows: [] as Row[], nextId: 1, rowCount: 0,
    beatIdx: 0, nextBeatTime: 0, beatsSinceRow: 0, beatLen: 60 / bpmFor(1),
    audioBeatIdx: 0, pendingBeats: [] as { time: number; idx: number; stage: number }[],
    score: 0, combo: 0, lives: LIVES, stage: 1, shown: 1, over: false,
  });

  function stopAll() {
    cancelAnimationFrame(g.current.raf);
    const ctx = g.current.ctx;
    g.current.ctx = null;
    if (ctx) { try { void ctx.close(); } catch {} }
  }
  useEffect(() => () => stopAll(), []);

  /* ---- synth voices ---- */
  function kick(t: number) {
    const { ctx, master } = g.current; if (!ctx || !master) return;
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    v.gain.setValueAtTime(0.9, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(v).connect(master); o.start(t); o.stop(t + 0.18);
  }
  function noiseHit(t: number, hp: number, gain: number, len: number) {
    const { ctx, master, noise } = g.current; if (!ctx || !master || !noise) return;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const v = ctx.createGain(); v.gain.setValueAtTime(gain, t); v.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(v).connect(master); src.start(t); src.stop(t + len + 0.02);
  }
  function tone(t: number, midi: number, len: number, type: OscillatorType, gain: number) {
    const { ctx, master } = g.current; if (!ctx || !master) return;
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(hz(midi), t);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(v).connect(master); o.start(t); o.stop(t + len + 0.02);
  }
  /* one beat of music: drums on the beat, arpeggio on eighths, bass on 1 and 3 */
  function playBeat(t: number, idx: number, beatLen: number) {
    const inBar = idx % 4;
    const chord = CHORDS[Math.floor(idx / 4) % CHORDS.length];
    kick(t);
    if (inBar === 1 || inBar === 3) noiseHit(t, 1800, 0.28, 0.12);
    noiseHit(t + beatLen / 2, 7000, 0.07, 0.04);
    noiseHit(t, 7000, 0.05, 0.03);
    if (inBar === 0 || inBar === 2) tone(t, chord[0] - 24, beatLen * 1.6, "sine", 0.32);
    for (let h = 0; h < 2; h++) {
      const step = ARP[(inBar * 2 + h) % ARP.length];
      const note = step === 3 ? chord[0] + 12 : chord[step];
      tone(t + (h * beatLen) / 2, note, beatLen * 0.45, "triangle", 0.11);
    }
  }

  /* ---- the beat grid: generated far enough ahead for rows to fall ---- */
  function extendGrid(now: number) {
    const st = g.current;
    const horizon = now + 2 * beatsPerRowFor(st.stage) * st.beatLen + 1;
    while (st.nextBeatTime < horizon) {
      const idx = st.beatIdx++;
      const time = st.nextBeatTime;
      st.pendingBeats.push({ time, idx, stage: st.stage });
      /* a row lands on every Nth beat, after a one-bar intro */
      if (idx >= 4) {
        st.beatsSinceRow++;
        if (st.beatsSinceRow >= beatsPerRowFor(st.stage)) {
          st.beatsSinceRow = 0;
          const rowStage = 1 + Math.floor(st.rowCount / STAGE_ROWS);
          if (rowStage !== st.stage) {
            st.stage = rowStage;
            st.beatLen = 60 / bpmFor(rowStage);
          }
          const fall = 2 * beatsPerRowFor(rowStage) * st.beatLen;
          st.rowCount++;
          const row: Row = { id: st.nextId++, time, fall, q: castleQuestion(Math.min(8, rowStage)), stage: rowStage, result: null, picked: null };
          st.rows = [...st.rows, row];
          setRows(st.rows);
        }
      }
      st.nextBeatTime += st.beatLen;
    }
  }

  function frame() {
    const st = g.current;
    const ctx = st.ctx;
    if (!ctx || st.over) return;
    const now = ctx.currentTime;
    extendGrid(now);
    /* schedule audio slightly ahead */
    while (st.pendingBeats.length && st.pendingBeats[0].time < now + 0.2) {
      const b = st.pendingBeats.shift()!;
      if (sound.on) playBeat(b.time, b.idx, 60 / bpmFor(b.stage));
    }
    const h = trackRef.current?.clientHeight ?? 380;
    const hitY = h * 0.78;
    let changed = false;
    for (const r of st.rows) {
      const p = 1 - (r.time - now) / r.fall;       /* 0 top → 1 at the hit line */
      const el = rowEls.current.get(r.id);
      /* NOTE_Y: from a row's top to the middle of its answer notes, so the
         notes — not the sum label — cross the line on the beat */
      if (el) el.style.transform = `translate3d(0,${p * hitY - NOTE_Y}px,0)`;
      if (r.result === null && now > r.time + GOOD) { miss(r); changed = true; }
    }
    /* drop rows well past the line */
    const keep = st.rows.filter((r) => now < r.time + 1.2);
    if (keep.length !== st.rows.length || changed) { st.rows = keep; setRows(keep); }
    /* the stage shown is the one of the next row to hit; tracked in the ref,
       because this loop is a closure from the render that started it */
    const shownStage = st.rows.find((r) => r.result === null)?.stage ?? st.stage;
    if (shownStage !== st.shown) {
      st.shown = shownStage;
      setStage(shownStage);
      if (shownStage > 1) { setStageBanner(shownStage); sound.levelUp(); setTimeout(() => setStageBanner(null), 1800); }
    }
    st.raf = requestAnimationFrame(frame);
  }

  function flash(text: string, cls: string) { setJudge({ k: nextJudgeKey(), text, cls }); }

  function miss(r: Row) {
    const st = g.current;
    r.result = "miss";
    st.combo = 0; setCombo(0);
    st.lives -= 1; setLives(st.lives);
    flash(ja ? "ミス" : "MISS", "miss");
    haptic(30);
    if (st.lives <= 0) setTimeout(end, 400);
  }

  function tap(lane: number) {
    const st = g.current;
    const ctx = st.ctx;
    if (!ctx || st.over || phase !== "play") return;
    const now = ctx.currentTime;
    /* the earliest unresolved row inside the timing window */
    const r = st.rows.find((x) => x.result === null && Math.abs(x.time - now) <= GOOD);
    if (!r) return;
    r.picked = r.q.options[lane];
    if (r.q.options[lane] !== r.q.answer) { miss(r); setRows([...st.rows]); sound.wrong(); return; }
    const off = Math.abs(r.time - now);
    r.result = off <= PERFECT ? "perfect" : "good";
    st.combo += 1; setCombo(st.combo);
    const mult = 1 + Math.floor(st.combo / 10) * 0.5;
    st.score += Math.round((r.result === "perfect" ? 100 : 60) * mult); setScore(st.score);
    flash(r.result === "perfect" ? (ja ? "パーフェクト！" : "PERFECT!") : (ja ? "グッド" : "GOOD"), r.result);
    if (sound.on) tone(ctx.currentTime, 84, 0.18, "sine", 0.18);
    haptic(10); onCorrect?.(1);
    if (st.combo > 0 && st.combo % 20 === 0) celebrate();
    setRows([...st.rows]);
  }

  function start() {
    stopAll();
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
    const st = g.current;
    Object.assign(st, {
      ctx, master, noise, rows: [], nextId: 1, rowCount: 0, beatIdx: 0, beatsSinceRow: 0,
      stage: 1, beatLen: 60 / bpmFor(1), nextBeatTime: ctx.currentTime + 0.6, pendingBeats: [],
      score: 0, combo: 0, lives: LIVES, shown: 1, over: false,
    });
    setRows([]); setScore(0); setCombo(0); setLives(LIVES); setStage(1); setNewBest(false); setJudge(null);
    setBest(readBest());
    setPhase("play");
    st.raf = requestAnimationFrame(frame);
  }

  function end() {
    const st = g.current;
    if (st.over) return;
    st.over = true;
    stopAll();
    /* clear the lanes so the results card isn't sitting on frozen rows */
    st.rows = []; setRows([]);
    const prev = readBest();
    if (st.score > prev) { writeBest(st.score); setBest(st.score); setNewBest(true); celebrate(); } else setBest(prev);
    setPhase("over");
  }

  /* keyboard: 1 / 2 / 3 or ← ↓ → */
  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      const k = { "1": 0, "2": 1, "3": 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 }[e.key];
      if (k !== undefined) { e.preventDefault(); tap(k); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="rg">
      <div className="match-head">
        <div className="match-stat"><span className="match-stat-k">{ja ? "スコア" : "Score"}</span><span className="match-stat-v mono">{score}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "コンボ" : "Combo"}</span><span className="match-stat-v mono">{combo > 1 ? `×${combo}` : "–"}</span></div>
        <div className="match-stat"><span className="match-stat-k">{ja ? "ライフ" : "Lives"}</span><span className="match-stat-v castle-hearts">{"💖".repeat(Math.max(0, lives))}</span></div>
      </div>

      <div className="rhythm-track" ref={trackRef}>
        <div className="rhythm-lanes" aria-hidden="true"><i /><i /><i /></div>
        <div className="rhythm-hitline" aria-hidden="true" />
        <div className="rhythm-stage mono">{ja ? `ステージ ${stage}` : `Stage ${stage}`} · {bpmFor(stage)} BPM</div>
        {rows.map((r) => (
          <div key={r.id} className={`rhythm-row${r.result ? ` ${r.result}` : ""}`} ref={(el) => { if (el) rowEls.current.set(r.id, el); else rowEls.current.delete(r.id); }}>
            <span className="rhythm-q mono">{r.q.prompt}</span>
            <span className="rhythm-notes">
              {r.q.options.map((o, i) => (
                <span key={i} className={`rhythm-note${r.result && o === r.q.answer ? " ans" : ""}${r.picked === o && o !== r.q.answer ? " bad" : ""}`}>{fmt(o)}</span>
              ))}
            </span>
          </div>
        ))}
        {judge && <div key={judge.k} className={`rhythm-judge ${judge.cls}`}>{judge.text}</div>}
        {stageBanner && <div key={stageBanner} className="sushi-levelup"><b>{ja ? `ステージ ${stageBanner}！` : `Stage ${stageBanner}!`}</b><span>{ja ? "テンポアップ！" : "Tempo up!"}</span></div>}
        <span className="rhythm-dj" aria-hidden="true"><Mascot animated={phase === "play"} mood="excited" /></span>

        {phase === "ready" && (
          <div className="rg-card">
            <div className="rg-card-title">{ja ? "🎵 リズムタップ" : "🎵 Rhythm Tap"}</div>
            <p className="rg-card-sub">
              {ja ? "音楽にあわせて答えが落ちてくる！線に来たときに正しい答えのレーンをタップ。ぴったりならパーフェクト！（音を出してね）"
                  : "Answers fall to the beat. Tap the lane with the right answer as it hits the line — on the beat for PERFECT! (Sound on!)"}
            </p>
            <button className="btn btn-primary" onClick={start}>{ja ? "スタート ♪" : "Start ♪"}</button>
          </div>
        )}
        {phase === "over" && (
          <div className="rg-card">
            <div className="rg-card-title">{newBest && score > 0 ? (ja ? "自己ベスト更新！" : "New best!") : (ja ? "演奏おわり" : "Song over")}</div>
            <div className="match-done-line mono">{score} {ja ? "点" : "pts"} · {ja ? `ステージ ${stage}` : `Stage ${stage}`} · {ja ? "ベスト" : "best"} {best}</div>
            <button className="btn btn-primary" onClick={start}>{ja ? "もう一回 ♪" : "Play again ♪"}</button>
          </div>
        )}
      </div>

      {phase === "play" && (
        <div className="rhythm-pads">
          {[0, 1, 2].map((i) => (
            <button key={i} className={`rhythm-pad p${i}`} onPointerDown={(e) => { e.preventDefault(); tap(i); }} aria-label={`lane ${i + 1}`}>
              {["◀", "●", "▶"][i]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
