"use client";

import { fmt } from "../util";
import type { Mode } from "../util";
import type { UIDict } from "../i18n";
import { QUESTIONS_PER_STAGE, STAGE_COUNT } from "@/lib/game/topics";
import type { Lang, Problem, Topic } from "@/lib/game/topics";
import { useEffect, useRef, useState } from "react";

export function CountdownTimer({ timerMs, paused, midMs = 10000, lowMs = 5000 }:
  { timerMs: number; paused: boolean; midMs?: number; lowMs?: number }) {
  const [left, setLeft] = useState(timerMs);
  const startRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) pausedAtRef.current = Date.now();
    else if (pausedAtRef.current !== null) {
      startRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [paused]);

  useEffect(() => {
    startRef.current = Date.now();
    pausedAtRef.current = null;
    const id = setInterval(() => {
      if (pausedAtRef.current !== null) return;
      setLeft(Math.max(0, timerMs - (Date.now() - startRef.current)));
    }, 100);
    return () => clearInterval(id);
  }, [timerMs]);

  const secs = Math.ceil(left / 1000);
  const label = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : `${secs}`;
  return (
    <div className={`timer-count${left <= lowMs ? " low" : left <= midMs ? " mid" : ""}`} aria-live="off">
      <span className="timer-count-icon" aria-hidden="true">⏱</span>
      <span className="timer-count-num mono">{label}</span>
    </div>
  );
}

export function PracticeView({
  topic,
  stageN,
  qIndex,
  correct,
  problem,
  mode,
  tileOptions,
  curSelection,
  tfShown,
  checkEnabled,
  marks,
  shakeQuestion,
  wrongFlash,
  shakeTile,
  streakPop,
  feedbackOk,
  eliminated,
  timerKey,
  timerMs,
  timerPaused,
  runs,
  runReady,
  swingAnim,
  isBoss,
  comboStreak,
  skinId,
  typeInputRef,
  practiceCardRef,
  onSelect,
  onInputChange,
  onCheck,
  onAddRun,
  lang,
  t,
}: {
  topic: Topic;
  stageN: number;
  qIndex: number;
  correct: number;
  problem: Problem;
  mode: Mode;
  tileOptions: number[];
  curSelection: number | boolean | null;
  tfShown: number;
  checkEnabled: boolean;
  marks: (boolean | null)[];
  shakeQuestion: boolean;
  wrongFlash: boolean;
  shakeTile: boolean;
  streakPop: boolean;
  feedbackOk: boolean | null;
  eliminated: number[];
  timerKey: number;
  timerMs: number;
  timerPaused: boolean;
  runs: number;
  runReady: boolean;
  swingAnim: "hit" | "miss" | null;
  isBoss: boolean;
  comboStreak: number;
  skinId: string;
  typeInputRef: React.RefObject<HTMLInputElement | null>;
  practiceCardRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (v: number | boolean) => void;
  onInputChange: (v: string) => void;
  onCheck: () => void;
  onAddRun: () => void;
  lang: Lang;
  t: UIDict;
}) {
  const comboTier = comboStreak >= 9 ? 3 : comboStreak >= 6 ? 2 : comboStreak >= 3 ? 1 : 0;
  const modeTag = t.practice.modeTags[mode];
  const title = lang === "ja" ? topic.titleJa : topic.title;

  return (
    <section className="view active">
      {/* Progress and the countdown stay pinned: on a phone the question and
          its options are taller than the viewport, and a timer you have to
          scroll back up to find is a timer you cannot play against. */}
      <div className="practice-hud">
        {/* A bar says how far in you are; these say how it is going. Five
            questions is few enough to show each one. */}
        <div className="q-pips" aria-hidden="true">
          {Array.from({ length: QUESTIONS_PER_STAGE }, (_, i) => {
            const mark = marks[i];
            const state = i === qIndex ? "now" : mark === true ? "hit" : mark === false ? "miss" : "todo";
            return <span key={i} className={`q-pip ${state}`} />;
          })}
        </div>
        <CountdownTimer key={timerKey} timerMs={timerMs} paused={timerPaused} />
      </div>
      <div className="topic-head" style={{ marginTop: 2 }}>
        <div className={`eyebrow-tag${isBoss ? " boss-tag" : ""}`}>{isBoss ? t.practice.bossStage : t.practice.stageOf(stageN, STAGE_COUNT)}</div>
        <h1>{title}</h1>
      </div>
      {/* Marking a tile green is invisible to a screen reader; this says it. */}
      <div className="sr-only" role="status" aria-live="polite">
        {feedbackOk === null
          ? `${t.practice.question} ${qIndex + 1} / ${QUESTIONS_PER_STAGE}. ${problem.prompt}`
          : feedbackOk
            ? t.practice.correct
            : t.practice.incorrect}
      </div>
      <div
        key={qIndex}
        className={`practice-card${isBoss ? " boss-card" : ""}${feedbackOk === true ? " correct-glow" : feedbackOk === false ? " wrong-glow" : ""}`}
        ref={practiceCardRef}
      >
        <div className="practice-meta">
          <span>{t.practice.question} {qIndex + 1} / {QUESTIONS_PER_STAGE}</span>
          <span className={`streak-flame${streakPop ? " pop" : ""}${correct >= 3 ? " combo3" : ""}`}>🔥 {correct}</span>
          {comboTier > 0 && <span className="combo-badge">×{comboTier + 1}</span>}
        </div>
        <div className="mode-eyebrow">{modeTag}</div>
        {mode !== "truefalse" && (
          <div className={`question mono${shakeQuestion ? " shake" : ""}`}>{problem.prompt} = ?</div>
        )}
        {mode === "truefalse" && <div className={`question mono${shakeQuestion ? " shake" : ""}`} />}

        {mode === "type" && (
          <input
            ref={typeInputRef}
            className={`answer-input${wrongFlash ? " wrong-flash" : ""}`}
            inputMode="numeric"
            placeholder="?"
            autoComplete="off"
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && checkEnabled) onCheck(); }}
          />
        )}
        {mode === "choice" && (
          <div className="tile-grid">
            {tileOptions.map((o, i) => (
              <button
                key={o}
                className={`choice-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
                <span className="tile-key" aria-hidden="true">{i + 1}</span>
              </button>
            ))}
          </div>
        )}
        {mode === "target" && (
          <div className="tile-grid cols-3">
            {tileOptions.map((o, i) => (
              <button
                key={o}
                className={`target-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
                <span className="tile-key" aria-hidden="true">{i + 1}</span>
              </button>
            ))}
          </div>
        )}
        {mode === "balloon" && (
          <div className="balloon-grid">
            {tileOptions.map((o, i) => (
              <button
                key={o}
                className={`balloon-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                <span className="balloon-body">{fmt(o)}</span>
                <span className="tile-key" aria-hidden="true">{i + 1}</span>
                <span className="balloon-string" />
              </button>
            ))}
          </div>
        )}
        {mode === "numberline" && (
          <div className="numberline-wrap">
            <div className="numberline-track" />
            <div className="numberline-dots">
              {[...tileOptions].sort((a, b) => a - b).map((o) => (
                <button
                  key={o}
                  className={`numberline-dot${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                  disabled={eliminated.includes(o)}
                  onClick={() => onSelect(o)}
                >
                  <span className="numberline-dot-label">{fmt(o)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === "arcade" && (
          <div className={`arcade-board skin-${skinId}${swingAnim ? ` swing-${swingAnim}` : ""}`}>
            <div className="scoreboard">
              <span className="scoreboard-label">{t.practice.runs}</span>
              <span className="scoreboard-runs mono">{runs}</span>
              {runReady ? (
                <button className="scoreboard-addrun" onClick={onAddRun}>{t.practice.scoreIt}</button>
              ) : (
                <span className="scoreboard-bat">⚾</span>
              )}
            </div>
            <div className="ballfield">
              <div className={`batter${swingAnim === "hit" ? " swing-hit" : swingAnim === "miss" ? " swing-miss" : ""}`}>
                <span className="batter-bat">🏏</span>
                <span className="batter-fig">🧍</span>
              </div>
              {swingAnim === "hit" && <div className="hit-ball">⚾</div>}
            </div>
            <div className="diamond-tile-grid">
              {tileOptions.map((o) => (
                <button
                  key={o}
                  className={`ball-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}`}
                  onClick={() => onSelect(o)}
                >
                  {fmt(o)}
                </button>
              ))}
            </div>
            {swingAnim === "hit" && <div className="homerun-fx">{t.practice.homeRun}</div>}
            {swingAnim === "miss" && <div className="strike-fx">{t.practice.strike}</div>}
          </div>
        )}
        {mode === "catch" && (
          <div className={`catch-field skin-${skinId}`}>
            {tileOptions.map((o, i) => (
              <button
                key={o}
                className={`catch-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                style={{
                  "--col": i % 3,
                  "--delay": `${(i % 3) * 0.7 + Math.floor(i / 3) * 0.35}s`,
                  "--dur": `${3.4 + (i % 3) * 0.5}s`,
                } as React.CSSProperties}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
              </button>
            ))}
          </div>
        )}
        {mode === "truefalse" && (
          <>
            <div className="tf-equation mono">{problem.prompt} = {fmt(tfShown)}</div>
            <div className="tf-row">
              <button
                className={`tf-btn${curSelection === true ? " picked true" : ""}${curSelection === true && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(true)}
              >
                <span className="ic">✅</span>{t.practice.true}
              </button>
              <button
                className={`tf-btn${curSelection === false ? " picked false" : ""}${curSelection === false && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(false)}
              >
                <span className="ic">❌</span>{t.practice.false}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
