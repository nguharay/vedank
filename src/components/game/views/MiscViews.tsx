"use client";

import { fmt } from "../util";
import { CountdownTimer } from "./PracticeView";
import type { UIDict } from "../i18n";
import { DAILY_QUESTIONS } from "@/lib/game/daily";
import type { DailyQuestion } from "@/lib/game/daily";
import type { DailyStatus } from "@/lib/game/league";
import { gradCss } from "@/lib/game/topics";
import type { Lang, Problem } from "@/lib/game/topics";
import { TRICKS, TRICK_BY_ID } from "@/lib/game/tricks";

export function DailyView({
  qs,
  idx,
  pick,
  done,
  status,
  lang,
  onPick,
  onHome,
}: {
  qs: DailyQuestion[];
  idx: number;
  pick: number | null;
  done: { points: number; correct: number } | null;
  status: DailyStatus | null;
  lang: Lang;
  onPick: (v: number) => void;
  onHome: () => void;
}) {
  if (done || status?.played) {
    const correct = done?.correct ?? status?.correct ?? 0;
    const points = done?.points ?? status?.points ?? 0;
    return (
      <section className="view active">
        <div className="daily-done">
          <div className="daily-done-icon">{correct >= 6 ? "🎉" : correct >= 4 ? "👏" : "💪"}</div>
          <h1>{lang === "ja" ? "今日の挑戦は完了！" : "Today's challenge is done!"}</h1>
          <div className="daily-done-score mono">{correct} / {DAILY_QUESTIONS}</div>
          <div className="daily-done-points">+{points} {lang === "ja" ? "リーグポイント" : "league points"}</div>
          <p className="daily-done-note">
            {lang === "ja"
              ? "同じ問題を世界中のみんなが解いています。また明日！"
              : "Everyone in the world got these same questions today. Come back tomorrow!"}
          </p>
          <button className="btn btn-primary" onClick={onHome}>
            {lang === "ja" ? "ホームへ" : "Back home"}
          </button>
        </div>
      </section>
    );
  }

  const q = qs[idx];
  if (!q) return null;
  return (
    <section className="view active">
      <div className="daily-top">
        <div className="daily-chip">🗓️ {lang === "ja" ? "デイリー" : "Daily"}</div>
        <div className="daily-count">{idx + 1} / {qs.length}</div>
      </div>
      <div className="daily-progress">
        {qs.map((_, i) => (
          <i key={i} className={i < idx ? "done" : i === idx ? "now" : ""} />
        ))}
      </div>
      <div className="practice-card daily-card">
        <div className="question mono">{q.problem.prompt} = ?</div>
        <div className="tile-grid">
          {q.options.map((o) => {
            const state =
              pick === null
                ? ""
                : o === q.problem.answer
                ? " daily-right"
                : o === pick
                ? " daily-wrong"
                : " eliminated";
            return (
              <button
                key={o}
                className={`choice-tile mono${state}`}
                disabled={pick !== null}
                onClick={() => onPick(o)}
              >
                {fmt(o)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TricksView({
  trickId,
  step,
  num,
  lang,
  onOpen,
  onStep,
  onReroll,
  onBackToList,
}: {
  trickId: string | null;
  step: number;
  num: number;
  lang: Lang;
  onOpen: (id: string) => void;
  onStep: (d: number) => void;
  onReroll: () => void;
  onBackToList: () => void;
}) {
  if (!trickId) {
    return (
      <section className="view active">
        <div className="topic-head">
          <div className="eyebrow-tag">{lang === "ja" ? "マジック" : "Magic"}</div>
          <h1>{lang === "ja" ? "友だちをおどろかせよう" : "Amaze your friends"}</h1>
          <p className="trick-intro">
            {lang === "ja"
              ? "どれも本物の数学。タネも仕掛けもありません――だから絶対に失敗しません。"
              : "Every one of these is real maths, not sleight of hand — which is why they never fail."}
          </p>
        </div>
        <div className="trick-list">
          {TRICKS.map((tk) => (
            <button key={tk.id} className="trick-card" onClick={() => onOpen(tk.id)}>
              <span className="trick-card-icon" style={{ background: gradCss(tk.grad) }}>{tk.icon}</span>
              <span className="trick-card-body">
                <span className="trick-card-title">{lang === "ja" ? tk.titleJa : tk.title}</span>
                <span className="trick-card-hook">{lang === "ja" ? tk.hookJa : tk.hook}</span>
              </span>
              <span className="trick-card-go">›</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const tk = TRICK_BY_ID[trickId];
  const total = tk.steps.length;
  const done = step >= total;
  const cur = done ? null : tk.steps[step];
  const secret = cur && (lang === "ja" ? cur.secretJa?.(num) : cur.secret?.(num));

  return (
    <section className="view active">
      <button className="trick-back" onClick={onBackToList}>
        ‹ {lang === "ja" ? "マジック一覧" : "All tricks"}
      </button>
      <div className="trick-hero" style={{ background: gradCss(tk.grad) }}>
        <div className="trick-hero-icon">{tk.icon}</div>
        <div className="trick-hero-title">{lang === "ja" ? tk.titleJa : tk.title}</div>
      </div>

      <div className="trick-rehearse">
        <span>{lang === "ja" ? "練習用の数" : "Rehearse with"}</span>
        <b className="mono">{num}</b>
        <button onClick={onReroll}>{lang === "ja" ? "べつの数" : "New number"}</button>
      </div>

      {done ? (
        <div className="trick-finale">
          <div className="trick-finale-label">{lang === "ja" ? "答えはいつも" : "The answer is always"}</div>
          <div className="trick-finale-value mono">{lang === "ja" ? tk.revealJa(num) : tk.reveal(num)}</div>
          <div className="trick-why">
            <b>{lang === "ja" ? "なぜ？" : "Why it works"}</b>
            <p>{lang === "ja" ? tk.whyJa : tk.why}</p>
          </div>
          <button className="btn btn-primary" onClick={() => onStep(-total)}>
            {lang === "ja" ? "もう一度" : "Run it again"}
          </button>
        </div>
      ) : (
        <>
          <div className="trick-progress">
            {tk.steps.map((_, i) => (
              <i key={i} className={i <= step ? "on" : ""} />
            ))}
          </div>
          <div className="trick-say">
            <div className="trick-say-label">{lang === "ja" ? "こう言おう" : "Say this out loud"}</div>
            <p>{lang === "ja" ? cur!.sayJa : cur!.say}</p>
          </div>
          {secret && (
            <div className="trick-secret">
              <div className="trick-secret-label">🤫 {lang === "ja" ? "きみだけのメモ" : "Only you see this"}</div>
              <p className="mono">{secret}</p>
            </div>
          )}
          <div className="trick-nav">
            <button className="btn btn-ghost" disabled={step === 0} onClick={() => onStep(-1)}>
              {lang === "ja" ? "◀ もどる" : "◀ Back"}
            </button>
            <button className="btn btn-primary" onClick={() => onStep(1)}>
              {step === total - 1 ? (lang === "ja" ? "ネタばらし" : "Reveal") : lang === "ja" ? "つぎへ ▶" : "Next ▶"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function BlitzView({
  problem,
  options,
  score,
  best,
  levelName,
  levelIcon,
  hearts,
  timerKey,
  timerMs,
  feedback,
  cardRef,
  onSelect,
  lang,
  t,
}: {
  problem: Problem;
  options: number[];
  score: number;
  best: number;
  levelName: string;
  levelIcon: string;
  hearts: number;
  timerKey: number;
  timerMs: number;
  feedback: "ok" | "bad" | null;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (v: number) => void;
  lang: Lang;
  t: UIDict;
}) {
  return (
    <section className="view active">
      <div className="blitz-hud">
        <div className="blitz-header">
          <div className="blitz-stat">
            <span className="blitz-stat-ico" aria-hidden="true">⚡</span>
            {t.blitz.score} <b>{score}</b>
          </div>
          <div
            className="blitz-hearts"
            role="img"
            aria-label={lang === "ja" ? `残りライフ ${hearts}` : `${hearts} lives left`}
          >
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={i < hearts ? "on" : "off"} aria-hidden="true">❤️</span>
            ))}
          </div>
          <div className="blitz-stat">
            <span className="blitz-stat-ico" aria-hidden="true">🏆</span>
            {t.blitz.best} <b>{best}</b>
          </div>
        </div>
        <div className="blitz-level-tag">
          <span aria-hidden="true">{levelIcon}</span> {levelName}
        </div>
        <div className="blitz-timer-row">
          <CountdownTimer
            key={timerKey}
            timerMs={timerMs}
            paused={feedback !== null}
            midMs={timerMs * 0.6}
            lowMs={timerMs * 0.3}
          />
          <div className="timer-bar-wrap">
            <div
              key={timerKey}
              className={`timer-bar-fill${feedback !== null ? " paused" : ""}`}
              style={{ animationDuration: `${timerMs}ms` }}
            />
          </div>
        </div>
      </div>
      <div
        key={problem.prompt}
        className={`practice-card blitz-card${feedback === "ok" ? " correct-glow" : feedback === "bad" ? " wrong-glow" : ""}`}
        ref={cardRef}
      >
        <div className="mode-eyebrow">⚡ {lang === "ja" ? "スピード勝負！" : "Beat the clock!"}</div>
        <div className="question mono">{problem.prompt} = ?</div>
        <div className="tile-grid">
          {options.map((o) => (
            <button key={o} className="choice-tile" onClick={() => onSelect(o)}>
              {fmt(o)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
