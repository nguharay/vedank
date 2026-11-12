"use client";

import { PATH_POS, fmtDue, msUntilUTCMidnight } from "../util";
import type { HomeGameId } from "../homeGames";
import { Mascot } from "../Mascot";
import type { DailyWinners } from "@/lib/game/league";
import { monsterFor } from "../monsters";
import type { ShareFocus } from "../ShareCard";
import type { UIDict } from "../i18n";
import type { CompetitionSummary } from "@/lib/game/competition";
import type { ReviewStats } from "@/lib/game/engagement";
import type { ChallengeRow } from "@/lib/game/friends";
import { levelInfo, topicProgressOf, topicUnlocked } from "@/lib/game/state";
import type { ProgressState } from "@/lib/game/state";
import { RANKS_JA, STAGE_COUNT, TOPICS, gradCss } from "@/lib/game/topics";
import type { Lang, Topic } from "@/lib/game/topics";
import { useEffect, useRef, useState } from "react";
import { CollectionCard } from "../Rewards";
import { StreakIcon } from "../StreakIcon";

/* ================= sub-views ================= */

export function HomeView({
  progress,
  li,
  dailyStreak, dailyWinners, onOpenDaily,
  onOpenTopic,
  onOpenBlitz,
  onOpenTricks,
  onContinue,
  onShare,
  reviewCount,
  reviewStats,
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
  onPlayGame,
  focusTopic,
  lang,
  t,
}: {
  progress: ProgressState;
  li: ReturnType<typeof levelInfo>;
  dailyStreak: number;
  /* today's Daily Challenge winners (accounts only), and a way to go and play it */
  dailyWinners?: DailyWinners | null;
  onOpenDaily?: () => void;
  onOpenTopic: (id: string) => void;
  onOpenBlitz: () => void;
  onOpenTricks: () => void;
  onContinue: (topicId: string, stageN: number) => void;
  onShare: (f: ShareFocus) => void;
  reviewCount: number;
  reviewStats: ReviewStats | null;
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
  /* opens one of the action games (today's card, map bonus stops) */
  onPlayGame: (id: HomeGameId) => void;
  /* coming back from a lesson: open on the map, scrolled to that lesson */
  focusTopic?: string | null;

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
  /* coming back from a lesson: scroll the map to it */
  useEffect(() => {
    if (!focusTopic) return;
    const t = setTimeout(() => document.querySelector(`[data-topic="${focusTopic}"]`)?.scrollIntoView({ block: "center" }), 120);
    return () => clearTimeout(t);
  }, [focusTopic]);
  const [mapGeo, setMapGeo] = useState<{ w: number; h: number; d: string }>({ w: 0, h: 0, d: "" });
  /* The whole path is always shown — locked topics included — so a player
     can see everything there is to reach. */
  const visibleTopics = TOPICS.length;

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
      {/* Home is the Vedic Maths lessons: the level, the next lesson, the map,
          then the extras (cards, streak, shop, friends, invite). The Daily
          Challenge, the games, the League and the Rank are in the bottom bar. */}
      {/* a slim level strip in place of the old banner: tap it to share */}
      {/* the level and the Daily winners link share one swipeable row */}
      <div className="home-rail home-rail-top">
      <button className="level-strip" onClick={() => onShare("level")} aria-label={`${t.share.statLevel} ${li.level}, ${t.share.shareBtn}`}>
        <span className="level-strip-lv"><small>{t.home.level}</small><b className="mono">{li.level}</b></span>
        <span className="level-strip-main">
          <span className="level-strip-top"><span className="level-strip-rank">{rank}</span><span className="mono">{li.into} / 150</span></span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${li.pct}%` }} /></span>
        </span>
        <span className="level-strip-stats">
          <span>👾 <b className="mono">{TOPICS.reduce((a, tp) => a + topicProgressOf(progress, tp.id).cleared, 0)}</b></span>
          <span>👑 <b className="mono">{TOPICS.filter((tp) => topicProgressOf(progress, tp.id).cleared >= STAGE_COUNT).length}</b></span>
        </span>
      </button>

      {/* one line that opens the Daily tab, where the full winners list is */}
      {onOpenDaily && (
        <button className="dw-cta" onClick={onOpenDaily}>
          <span className="dw-cta-cup" aria-hidden="true">🏆</span>
          <span className="dw-cta-text">
            <b>{!dailyWinners || dailyWinners.isToday
              ? (lang === "ja" ? "今日のデイリー勝者を見る" : "See today's Daily winners")
              : (lang === "ja" ? "今日の勝者はまだいないよ" : "No Daily winner yet today")}</b>
            <small>{!dailyWinners
              ? (lang === "ja" ? "8問ぜんぶ正解した人たち" : "Everyone who got all 8 right")
              : dailyWinners.isToday && dailyWinners.winners.length > 0
              ? (lang === "ja"
                ? `${dailyWinners.winners[0].name}さん${dailyWinners.winners.length > 1 ? `、ほか${dailyWinners.winners.length - 1}人` : ""}が全問正解`
                : `${dailyWinners.winners[0].name}${dailyWinners.winners.length > 1 ? ` and ${dailyWinners.winners.length - 1} more` : ""} got all 8 right`)
              : (lang === "ja" ? "8問ぜんぶ正解で1番のりしよう" : "Get all 8 right and be the first")}</small>
          </span>
          <span className="dw-cta-go" aria-hidden="true">›</span>
        </button>
      )}
      </div>

        <>
      {/* one swipeable row instead of three stacked cards: the next lesson,
          then the two ways to practise the tricks peeking in from the right */}
      <div className="home-rail" role="group" aria-label={lang === "ja" ? "レッスンとれんしゅう" : "Lesson and practice"}>
      <div className="continue-card" style={{ background: gradCss(continueTopic.grad) }} onClick={() => onContinue(continueTopic.id, continueStageN)}>
        <div className="continue-card-label">{lang === "ja" ? "📘 つぎのレッスン" : "📘 Next lesson"}</div>
        <div className="continue-card-title">
          <span className="continue-monster">{monsterFor(continueTopic.id, continueStageN, lang).emoji}</span>
          {monsterFor(continueTopic.id, continueStageN, lang).name}
          {lang === "ja" ? ` · バトル ${continueStageN}` : ` · Battle ${continueStageN}`}
          <span className="continue-topic">{lang === "ja" ? continueTopic.titleJa : continueTopic.title}</span>
        </div>
        <span className="continue-card-arrow">▶</span>
      </div>

      {/* practice the tricks: timed drill and party tricks */}
      <div className="blitz-cta" onClick={onOpenBlitz}>
        <div className="blitz-cta-icon">⚡</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{t.home.blitzTitle}</div>
          <div className="blitz-cta-sub">{t.home.blitzSub}</div>
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
      </div>

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

      <ThreeStarList progress={progress} lang={lang} onOpenTopic={onOpenTopic} locked={(id, i) => !topicUnlocked(progress, id) || i >= guestTopicLimit} />
      <SectionHead icon="🗺️" title={lang === "ja" ? "インド式数学の学びのマップ" : "Learning map for Vedic Math"} sub={lang === "ja"
        ? "インド式数学の「ひらめき」を、モンスターとのバトルで身につけよう。トピックを順番にクリアして、先へ進もう。"
        : "Learn the clever shortcuts of Indian maths by battling monsters. Clear topics in order to move ahead."} />

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
          const shape = NODE_SHAPE[tp.icon];
          return (
            <div key={tp.id}>
              <div className={`path-row pos-${PATH_POS[i % PATH_POS.length]}`} data-topic={tp.id}>
                <div className="node-wrap">
                  {isCurrent && <div className="node-bubble">{t.home.play}</div>}
                  <span className="node-level">{i + 1}</span>
                  <div
                    className={`node${isCurrent ? " current" : ""}${locked ? " node-locked" : ""}${shape ? ` node-shaped shape-${shape}` : ""}`}
                    style={locked ? undefined : { background: gradCss(tp.grad), ["--node-bg" as string]: gradCss(tp.grad) }}
                    onClick={() => onOpenTopic(tp.id)}
                  >
                    <span className="node-ico">{locked ? "🔒" : shape ? "" : tp.icon}</span>
                    <span className="stage-pips">
                      {/* gold = 3 stars, pale = cleared with 1–2 stars (try again), grey = not cleared */}
                      {Array.from({ length: STAGE_COUNT }, (_, k) => {
                        const st = p.stageStars[String(k + 1)] || 0;
                        return <i key={k} className={st >= 3 ? "on" : st > 0 ? "part" : ""}>★</i>;
                      })}
                    </span>
                  </div>
                  {!locked && (
                    <span className={`node-monster${p.cleared >= STAGE_COUNT ? " beaten" : ""}`} aria-hidden="true">
                      {monsterFor(tp.id, 1, lang).emoji}{p.cleared >= STAGE_COUNT && <i>◯</i>}
                    </span>
                  )}
                  <span className="node-platform" />
                  <div className="node-label">{lang === "ja" ? tp.titleJa : tp.title}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* The end of the path: a promise that the adventure keeps going. */}
      <div className="path-coming">
        <div className="path-coming-icons" aria-hidden="true"><span>🎁</span><span>🗺️</span><span>✨</span></div>
        <div className="path-coming-title">{lang === "ja" ? "この先も、まだまだ続くよ！" : "More is on the way!"}</div>
        <div className="path-coming-sub">
          {lang === "ja"
            ? "ここまでぜんぶクリアしたら、新しい冒険がひらくよ。きっと楽しいよ！お楽しみに"
            : "Finish everything here and a brand-new adventure opens up. It\u2019s going to be fun, so stay tuned"}
        </div>
      </div>

      {onOpenClasses && (
        <button className="classes-card" onClick={onOpenClasses}>
          <span className="classes-card-icon classes-card-mascot"><Mascot mood="excited" /></span>
          <span className="classes-card-body">
            <span className="classes-card-title">Ray（礼）先生と学ぼう</span>
            <span className="classes-card-sub">
              日本で対面・オンラインの授業があります
            </span>
          </span>
          <span className="classes-card-go">くわしく ›</span>
        </button>
      )}
        </>
      <SectionHead icon="🎒" title={lang === "ja" ? "きみのもの" : "Your things"} sub={lang === "ja" ? "カード、連続記録、ショップ、友だち" : "Cards, streak, shop and friends"} />
      <CollectionCard lang={lang} />
      {dailyStreak > 0 && (
        <div className="streak-calendar">
          <span className="streak-calendar-label"><StreakIcon lit={dailyStreak > 0} /> {dailyStreak}{t.home.streakSuffix}</span>
          <div className="streak-days">
            {Array.from({ length: 7 }, (_, i) => i).map((daysAgo) => (
              <span key={daysAgo} className={`streak-day${daysAgo < dailyStreak ? " lit" : ""}`}>
                🔥
              </span>
            ))}
          </div>
          {resetHours < 6 && (
            <div className="streak-urgent">
              ⏳ {lang === "ja" ? `あと${resetHours}時間${resetMins}分でリセット！` : `Resets in ${resetHours}h ${resetMins}m, play today!`}
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
                  {lang === "ja" ? `スピードクイズ ${d.fromScore}点に挑戦` : `Scored ${d.fromScore} in Speed Quiz`}
                </span>
              </span>
              <span className="duel-card-go">{lang === "ja" ? "挑む" : "Beat it"} ›</span>
            </button>
          ))}
        </div>
      )}
      {/* Shop and Friends: a guest has neither a gem balance nor friends, so
          the row would be two buttons that open empty drawers. */}
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
      <InviteCard lang={lang} />
    </section>
  );
}


/* A short labelled heading that tells a new player what the cards below it are for. */
/* A lesson on the map is drawn in the shape of its sign: a plus for adding,
   a bar for subtracting, a cross for multiplying, a square for squaring.
   Lessons with no single sign (digit sums, base method, designs) stay round. */
const NODE_SHAPE: Record<string, "plus" | "minus" | "cross" | "square"> = {
  "➕": "plus", "−": "minus", "➖": "minus", "✕": "cross", "²": "square",
};

function SectionHead({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="home-sec">
      <div className="home-sec-title"><span aria-hidden="true">{icon}</span> {title}</div>
      <div className="home-sec-sub">{sub}</div>
    </div>
  );
}

/* opens the invite sheet (GameApp listens for this event) */
export function openInvite(extra?: string) {
  window.dispatchEvent(new CustomEvent("vedank:invite", { detail: { extra } }));
}

function InviteCard({ lang }: { lang: "en" | "ja" }) {
  const ja = lang === "ja";
  return (
    <button className="invite-card" onClick={() => openInvite()}>
      <span className="invite-card-ico" aria-hidden="true">🎁</span>
      <span className="invite-card-body">
        <b>{ja ? "友だちを招待しよう" : "Invite your friends"}</b>
        <span>{ja ? "LINE・メッセージ・QRコードでかんたんにシェア" : "Share in a tap: WhatsApp, Instagram, messages or a QR code"}</span>
      </span>
      <span className="invite-card-go">{ja ? "招待 ▶" : "Invite ▶"}</span>
    </button>
  );
}

/* Every cleared stage that has fewer than 3 stars, grouped by lesson — so a
   player can see what to replay for a full set. Collapsed until tapped. */
function ThreeStarList({ progress, lang, onOpenTopic, locked }: {
  progress: ProgressState; lang: Lang; onOpenTopic: (id: string) => void; locked: (id: string, i: number) => boolean;
}) {
  const ja = lang === "ja";
  const [open, setOpen] = useState(false);
  const items = TOPICS.flatMap((tp, i) => {
    if (locked(tp.id, i)) return [];
    const p = topicProgressOf(progress, tp.id);
    const short = Array.from({ length: STAGE_COUNT }, (_, k) => ({ n: k + 1, st: p.stageStars[String(k + 1)] || 0 }))
      .filter((x) => x.st > 0 && x.st < 3);
    return short.length ? [{ tp, i, short }] : [];
  });
  const count = items.reduce((a, x) => a + x.short.length, 0);
  if (!count) return null;
  return (
    <div className={`star-list${open ? " open" : ""}`}>
      <button className="star-list-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="star-list-ico" aria-hidden="true">⭐</span>
        <span className="star-list-txt">
          <b>{ja ? "3つ星をねらおう" : "Go for 3 stars"}</b>
          <small>{ja ? `まだ3つ星じゃないステージ：${count}こ` : `${count} stage${count > 1 ? "s" : ""} not at 3 stars yet`}</small>
        </span>
        <span className="star-list-chev" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="star-list-body">
          {items.map(({ tp, i, short }) => (
            <button key={tp.id} className="star-list-row" onClick={() => onOpenTopic(tp.id)}>
              <span className="star-list-n mono">{i + 1}</span>
              <span className="star-list-name">{ja ? tp.titleJa : tp.title}</span>
              <span className="star-list-stages">
                {short.map((x) => (
                  <span key={x.n} className="star-list-stage">
                    <small>{ja ? `ステージ${x.n}` : `Stage ${x.n}`}</small>
                    {[0, 1, 2].map((k) => <i key={k} className={k < x.st ? "on" : ""}>★</i>)}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
