"use client";

import { PATH_POS, fmtDue, msUntilUTCMidnight } from "../util";
import { Mandala, Mascot } from "../Mascot";
import type { ShareFocus } from "../ShareCard";
import type { UIDict } from "../i18n";
import type { CompetitionSummary } from "@/lib/game/competition";
import type { ReviewStats } from "@/lib/game/engagement";
import type { ChallengeRow } from "@/lib/game/friends";
import { PUZZLES } from "@/lib/game/matchstick";
import { levelInfo, topicProgressOf, topicUnlocked } from "@/lib/game/state";
import type { ProgressState } from "@/lib/game/state";
import { RANKS_JA, STAGE_COUNT, TOPICS, gradCss } from "@/lib/game/topics";
import type { Lang, Topic } from "@/lib/game/topics";
import { useEffect, useRef, useState } from "react";

/* ================= sub-views ================= */

export function HomeView({
  progress,
  li,
  solvedCount,
  dailyStreak,
  onOpenTopic,
  onOpenArena,
  onOpenBlitz,
  onOpenTricks,
  onOpenDaily,
  dailyPlayed,
  onContinue,
  onShare,
  reviewCount,
  reviewStats,
  onOpenQuests,
  onOpenShop,
  guest = false,
  guestTopicLimit = Infinity,
  onStartReview,
  gemBalance,
  openDuels,
  liveComps,
  onEnterComp,
  assignment,
  assignedTopic,
  onOpenFriends,
  onAcceptDuel,
  onOpenClasses,
  lang,
  t,
}: {
  progress: ProgressState;
  li: ReturnType<typeof levelInfo>;
  solvedCount: number;
  dailyStreak: number;
  onOpenTopic: (id: string) => void;
  onOpenArena: () => void;
  onOpenBlitz: () => void;
  onOpenTricks: () => void;
  onOpenDaily: () => void;
  dailyPlayed: boolean;
  onContinue: (topicId: string, stageN: number) => void;
  onShare: (f: ShareFocus) => void;
  reviewCount: number;
  reviewStats: ReviewStats | null;
  onOpenQuests: () => void;
  onOpenShop: () => void;
  guest?: boolean;
  /* Topics at or past this index are drawn locked for a guest. */
  guestTopicLimit?: number;
  onStartReview: () => void;
  gemBalance: number | null;
  openDuels: ChallengeRow[];
  liveComps: CompetitionSummary[];
  onEnterComp: (c: CompetitionSummary) => void;
  assignment: { name: string; teacherName: string; assignedNote: string | null } | undefined;
  assignedTopic: Topic | undefined;
  onOpenClasses?: () => void;
  onOpenFriends: () => void;
  onAcceptDuel: (d: ChallengeRow) => void;
  lang: Lang;
  t: UIDict;
}) {
  const firstIncompleteIdx = (() => {
    const idx = TOPICS.findIndex((tp) => topicProgressOf(progress, tp.id).cleared < STAGE_COUNT);
    return idx === -1 ? TOPICS.length - 1 : idx;
  })();
  const continueTopic = TOPICS[firstIncompleteIdx];
  const continueStageN = Math.min(topicProgressOf(progress, continueTopic.id).cleared + 1, STAGE_COUNT);
  const rank = lang === "ja" ? RANKS_JA[li.rank] || li.rank : li.rank;

  const [resetIn, setResetIn] = useState(() => msUntilUTCMidnight());
  useEffect(() => {
    const id = setInterval(() => setResetIn(msUntilUTCMidnight()), 60000);
    return () => clearInterval(id);
  }, []);
  const resetHours = Math.floor(resetIn / 3600000);
  const resetMins = Math.floor((resetIn % 3600000) / 60000);

  const pathWrapRef = useRef<HTMLDivElement | null>(null);
  const [mapGeo, setMapGeo] = useState<{ w: number; h: number; d: string }>({ w: 0, h: 0, d: "" });
  /* The path is 44 topics long and nearly all of them start locked, so a new
     player scrolled past three dozen padlocks to reach the bottom. Show what
     they can reach plus the next few — enough to see where this is going —
     and put the rest behind one tap. */
  const [showAllTopics, setShowAllTopics] = useState(false);
  const PEEK_AHEAD = 3;
  const visibleTopics = showAllTopics
    ? TOPICS.length
    : Math.max(8, firstIncompleteIdx + 1 + PEEK_AHEAD);   /* 8 keeps the dojo row */
  const hiddenTopics = Math.max(0, TOPICS.length - visibleTopics);

  useEffect(() => {
    const wrap = pathWrapRef.current;
    if (!wrap) return;
    function computePath() {
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const nodeEls = Array.from(wrap.querySelectorAll<HTMLElement>(".node, .boss-node"));
      const pts = nodeEls.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top };
      });
      if (pts.length < 2) {
        setMapGeo({ w: wrapRect.width, h: wrapRect.height, d: "" });
        return;
      }
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const midY = (p0.y + p1.y) / 2;
        d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
      }
      setMapGeo({ w: wrapRect.width, h: wrapRect.height, d });
    }
    computePath();
    const ro = new ResizeObserver(computePath);
    ro.observe(wrap);
    window.addEventListener("resize", computePath);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computePath);
    };
  }, [progress, lang]);

  return (
    <section className="view active home-view">
      <div className="unit-banner">
        <svg className="mandala" viewBox="0 0 100 100"><Mandala stroke="#fff" /></svg>
        <div className="mascot"><Mascot mood="happy" /></div>
        <div className="eyebrow">{t.home.eyebrow}</div>
        <h1>{t.home.title}</h1>
        <div className="home-byline">
          <img src="/brand/vedank-mark.png" alt="" />
          <span>{t.home.brand}</span>
        </div>
        <button className="levelrow levelrow-share" onClick={() => onShare("level")} aria-label={`${t.share.statLevel} ${li.level} — ${t.share.shareBtn}`}>
          <span>{t.home.level} {li.level} · {rank}</span>
          <span className="levelrow-right">{li.into} / 150 <span className="levelrow-share-ico" aria-hidden="true">📤</span></span>
        </button>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${li.pct}%` }} /></div>
      </div>

      <div className="continue-card" style={{ background: gradCss(continueTopic.grad) }} onClick={() => onContinue(continueTopic.id, continueStageN)}>
        <div className="continue-card-label">{lang === "ja" ? "続きから" : "Continue"}</div>
        <div className="continue-card-title">
          {(lang === "ja" ? continueTopic.titleJa : continueTopic.title)} — {lang === "ja" ? `ステージ ${continueStageN}` : `Stage ${continueStageN}`}
        </div>
        <span className="continue-card-arrow">▶</span>
      </div>

      {dailyStreak > 0 && (
        <div className="streak-calendar">
          <span className="streak-calendar-label">🔥 {dailyStreak}{t.home.streakSuffix}</span>
          <div className="streak-days">
            {Array.from({ length: 7 }, (_, i) => i).map((daysAgo) => (
              <span key={daysAgo} className={`streak-day${daysAgo < dailyStreak ? " lit" : ""}`}>
                🔥
              </span>
            ))}
          </div>
          {resetHours < 6 && (
            <div className="streak-urgent">
              ⏳ {lang === "ja" ? `あと${resetHours}時間${resetMins}分でリセット！` : `Resets in ${resetHours}h ${resetMins}m — play today!`}
            </div>
          )}
        </div>
      )}

      {liveComps.length > 0 && (
        <div className="duel-card comp-card">
          <div className="duel-card-head">
            🏅 {lang === "ja" ? "コンペティション開催中" : "Competition open"}
          </div>
          {liveComps.slice(0, 2).map((c) => (
            <button key={c.id} className="duel-card-row" onClick={() => onEnterComp(c)}>
              <span className="duel-card-avatar">🏅</span>
              <span className="duel-card-info">
                <span className="duel-card-name">{c.name}</span>
                <span className="duel-card-sub">
                  {c.levelName} · {c.questionCount} {lang === "ja" ? "問" : "Qs"} ·{" "}
                  {Math.round(c.durationSec / 60)} {lang === "ja" ? "分" : "min"}
                </span>
              </span>
              <span className="duel-card-go">{lang === "ja" ? "参加" : "Enter"} ›</span>
            </button>
          ))}
        </div>
      )}

      {assignment && assignedTopic && (
        <button className="assign-card" onClick={() => onOpenTopic(assignedTopic.id)}>
          <span className="assign-card-icon">{assignedTopic.icon}</span>
          <span className="assign-card-info">
            <span className="assign-card-label">
              🏫 {lang === "ja" ? `${assignment.teacherName} 先生から` : `From ${assignment.teacherName}`}
            </span>
            <span className="assign-card-title">
              {lang === "ja" ? assignedTopic.titleJa : assignedTopic.title}
            </span>
            {assignment.assignedNote && (
              <span className="assign-card-note">{assignment.assignedNote}</span>
            )}
          </span>
          <span className="assign-card-go">›</span>
        </button>
      )}

      {openDuels.length > 0 && (
        <div className="duel-card">
          <div className="duel-card-head">
            ⚔️ {lang === "ja" ? "対戦の申し込み" : "Duels waiting"}
          </div>
          {openDuels.slice(0, 3).map((d) => (
            <button key={d.id} className="duel-card-row" onClick={() => onAcceptDuel(d)}>
              <span className="duel-card-avatar">{d.opponentName[0]?.toUpperCase() ?? "?"}</span>
              <span className="duel-card-info">
                <span className="duel-card-name">{d.opponentName}</span>
                <span className="duel-card-sub">
                  {lang === "ja" ? `ブリッツ ${d.fromScore}点に挑戦` : `Scored ${d.fromScore} in Blitz`}
                </span>
              </span>
              <span className="duel-card-go">{lang === "ja" ? "挑む" : "Beat it"} ›</span>
            </button>
          ))}
        </div>
      )}

      {/* Quests used to have a full card here, but they already have their own
          nav tab with a badge — the same list twice was just scroll. Shop and
          Friends are not in the nav, so they keep a slim row of their own.
          A guest has neither a gem balance nor friends, so the row would be
          two buttons that open empty drawers. */}
      {!guest && (
        <div className="home-quick">
          <button className="home-quick-btn" onClick={onOpenShop}>
            🛍️ {lang === "ja" ? "ショップ" : "Shop"}
            <span className="mono"> · 💎 {gemBalance ?? "…"}</span>
          </button>
          <button className="home-quick-btn home-quick-friends" onClick={onOpenFriends}>
            👥 {lang === "ja" ? "フレンド" : "Friends"}
          </button>
        </div>
      )}

      {reviewCount > 0 ? (
        <button className="review-cta" onClick={onStartReview}>
          <div className="review-cta-icon">🩹</div>
          <div className="review-cta-info">
            <div className="review-cta-title">
              {lang === "ja" ? "まちがいなおし" : "Fix Your Misses"}
            </div>
            <div className="review-cta-sub">
              {lang === "ja"
                ? `${reviewCount} 問が復習どき`
                : `${reviewCount} question${reviewCount === 1 ? "" : "s"} due now`}
              {reviewStats && reviewStats.learning > reviewCount
                ? lang === "ja"
                  ? ` · ${reviewStats.learning - reviewCount} 問おやすみ中`
                  : ` · ${reviewStats.learning - reviewCount} resting`
                : ""}
            </div>
          </div>
          <span className="review-cta-count mono">{reviewCount}</span>
        </button>
      ) : reviewStats && reviewStats.learning > 0 ? (
        /* Nothing due: say when it comes back rather than hiding the card, so
           the schedule is visible instead of feeling arbitrary. */
        <div className="review-rest">
          <span className="review-rest-icon">🌱</span>
          <span className="review-rest-text">
            {lang === "ja"
              ? `${reviewStats.learning} 問を覚えているところ。${
                  reviewStats.nextDueAt ? `次の復習は ${fmtDue(reviewStats.nextDueAt, true)}` : ""
                }`
              : `${reviewStats.learning} question${reviewStats.learning === 1 ? "" : "s"} settling in.${
                  reviewStats.nextDueAt ? ` Next review ${fmtDue(reviewStats.nextDueAt, false)}.` : ""
                }`}
          </span>
          {reviewStats.retired > 0 && (
            <span className="review-rest-badge mono">
              {reviewStats.retired} {lang === "ja" ? "習得" : "learned"}
            </span>
          )}
        </div>
      ) : null}

      <div className="blitz-cta" onClick={onOpenBlitz}>
        <div className="blitz-cta-icon">⚡</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{t.home.blitzTitle}</div>
          <div className="blitz-cta-sub">{t.home.blitzSub}</div>
        </div>
        <span className="blitz-cta-arrow">›</span>
      </div>

      <div className={`blitz-cta daily-cta${dailyPlayed ? " played" : ""}`} onClick={onOpenDaily}>
        <div className="blitz-cta-icon">{dailyPlayed ? "✅" : "🗓️"}</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{lang === "ja" ? "デイリーチャレンジ" : "Daily Challenge"}</div>
          <div className="blitz-cta-sub">
            {dailyPlayed
              ? lang === "ja"
                ? "今日はクリア済み。また明日！"
                : "Done for today — come back tomorrow!"
              : lang === "ja"
              ? "世界中が同じ8問に挑戦中"
              : "The same 8 questions for everyone, today only"}
          </div>
        </div>
        <span className="blitz-cta-arrow">›</span>
      </div>

      <div className="blitz-cta trick-cta" onClick={onOpenTricks}>
        <div className="blitz-cta-icon">🔮</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{lang === "ja" ? "マジックモード" : "Magic Tricks"}</div>
          <div className="blitz-cta-sub">
            {lang === "ja" ? "友だちをおどろかせる4つのネタ" : "Four tricks to amaze your friends"}
          </div>
        </div>
        <span className="blitz-cta-arrow">›</span>
      </div>

      <div className="path-wrap" ref={pathWrapRef}>
        {mapGeo.d && (
          <svg className="path-svg" width={mapGeo.w} height={mapGeo.h} style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}>
            <path className="path-svg-glow" d={mapGeo.d} fill="none" />
            <path className="path-svg-line" d={mapGeo.d} fill="none" />
          </svg>
        )}
        {TOPICS.slice(0, visibleTopics).map((tp, i) => {
          const p = topicProgressOf(progress, tp.id);
          const locked = !topicUnlocked(progress, tp.id) || i >= guestTopicLimit;
          const isCurrent = i === firstIncompleteIdx;
          const boss =
            i === 6 ? (
              <div className="boss-row" key="boss">
                <div className="node-wrap">
                  <div className="boss-node" onClick={onOpenArena}>
                    🔥
                    <span className="boss-chip">{solvedCount}/{PUZZLES.length}</span>
                  </div>
                  <span className="node-platform" />
                  <div className="node-label">{t.home.dojo}</div>
                </div>
              </div>
            ) : null;
          return (
            <div key={tp.id}>
              {boss}
              <div className={`path-row pos-${PATH_POS[i % PATH_POS.length]}`}>
                <div className="node-wrap">
                  {isCurrent && <div className="node-bubble">{t.home.play}</div>}
                  <span className="node-level">{i + 1}</span>
                  <div
                    className={`node${isCurrent ? " current" : ""}${locked ? " node-locked" : ""}`}
                    style={locked ? undefined : { background: gradCss(tp.grad) }}
                    onClick={() => onOpenTopic(tp.id)}
                  >
                    {locked ? "🔒" : tp.icon}
                    <span className="stage-pips">
                      {Array.from({ length: STAGE_COUNT }, (_, k) => (
                        <i key={k} className={k < p.cleared ? "on" : ""} />
                      ))}
                    </span>
                  </div>
                  <span className="node-platform" />
                  <div className="node-label">{lang === "ja" ? tp.titleJa : tp.title}</div>
                </div>
              </div>
            </div>
          );
        })}
        {hiddenTopics > 0 && (
          <button className="path-more" onClick={() => setShowAllTopics(true)}>
            {lang === "ja" ? `あと ${hiddenTopics} トピックを見る` : `Show ${hiddenTopics} more`}
            <span className="path-more-sub">
              {lang === "ja" ? "まだロック中" : "still locked"}
            </span>
          </button>
        )}
      </div>

      {onOpenClasses && (
        <button className="classes-card" onClick={onOpenClasses}>
          <span className="classes-card-icon classes-card-mascot"><Mascot mood="excited" /></span>
          <span className="classes-card-body">
            <span className="classes-card-title">Ray先生と学ぼう</span>
            <span className="classes-card-sub">
              日本で対面・オンラインの授業があります
            </span>
          </span>
          <span className="classes-card-go">くわしく ›</span>
        </button>
      )}
    </section>
  );
}
