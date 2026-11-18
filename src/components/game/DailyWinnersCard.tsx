"use client";

import { useState } from "react";
import type { DailyWinners } from "@/lib/game/league";

/* ---- 🏆 Today's Daily Challenge winners ----
   Everyone who got all 10 right, fastest first. A player who has done it more
   than one day running wears a flame with the number of days, and from 3
   days running a hand-drawn crown by the name. Until someone
   wins today, yesterday's winners stay up with a nudge to be the first.
   Under it, a cheer for today's 9 out of 10 players. */
const SHOWN = 6;
const CROWN_STREAK = 3;

/* a little crown drawn by hand: wobbly points, a second pencil pass, gems */
function Crown({ ja }: { ja: boolean }) {
  const crown = "M3 16.5 L2.3 6.9 L7.3 10.7 L11.9 3.1 L16.2 10.3 L21.7 6.1 L20.7 16.9 Q12.2 18.3 3 16.5 Z";
  return (
    <svg className="dw-crown" viewBox="0 0 24 20" width="22" height="18" role="img" aria-label={ja ? "王冠：3日以上れんぞく" : "Crown: 3+ days in a row"}>
      <path d={crown} fill="#FFC83D" stroke="#1d1b33" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={crown} fill="none" stroke="#1d1b33" strokeWidth=".7" strokeLinejoin="round" opacity=".45" transform="translate(.5 .35) rotate(-1.5 12 10)" />
      <path d="M3.5 14.1 Q12.3 15.7 20.9 14.3" fill="none" stroke="#1d1b33" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5 12.2 Q7 11.6 8.4 12.6" fill="none" stroke="#fff" strokeWidth=".9" strokeLinecap="round" opacity=".8" />
      <circle cx="2.3" cy="6.9" r="1.5" fill="#FF5A7A" stroke="#1d1b33" strokeWidth=".8" />
      <circle cx="11.9" cy="3.1" r="1.6" fill="#FF5A7A" stroke="#1d1b33" strokeWidth=".8" />
      <circle cx="21.7" cy="6.1" r="1.5" fill="#FF5A7A" stroke="#1d1b33" strokeWidth=".8" />
      <path d="M12.1 10.6 L13.4 12.3 L12.1 13.9 L10.8 12.3 Z" fill="#4FA3FF" stroke="#1d1b33" strokeWidth=".8" strokeLinejoin="round" />
    </svg>
  );
}

export function DailyWinnersCard({ data, ja, onPlay }: {
  data: DailyWinners | null; ja: boolean;
  /* shown as a "Play" button while the viewer has not played today */
  onPlay?: () => void;
}) {
  const [all, setAll] = useState(false);
  if (!data) return null;
  const { winners, isToday } = data;
  const list = all ? winners : winners.slice(0, SHOWN);
  const more = winners.length - list.length;
  const close = data.close ?? [];
  return (
    <>
    <div className="dw-card" role="region" aria-label={ja ? "チャレンジの勝者" : "Challenge winners"}>
      <div className="dw-head">
        <span className="dw-cup" aria-hidden="true">🏆</span>
        <span className="dw-titles">
          <b>{isToday ? (ja ? "今日のチャレンジ勝者" : "Today's challenge winners") : (ja ? "きのうのチャレンジ勝者" : "Yesterday's challenge winners")}</b>
          <small>{winners.length === 0
            ? (ja ? "まだいないよ。10問ぜんぶ正解で名前がのる！" : "No one yet. Get all 10 right to see your name here!")
            : !isToday
              ? (ja ? "今日はまだだれも全問正解していないよ。1番のりしよう！" : "No one has 10 out of 10 yet today. Be the first!")
              : (ja ? "10問ぜんぶ正解した人たち" : "Everyone who got all 10 right")}</small>
        </span>
        {onPlay && <button className="dw-play" onClick={onPlay}>{ja ? "挑戦" : "Play"} ▶</button>}
      </div>
      {winners.length > 0 && (
        <ol className="dw-list">
          {list.map((w, i) => (
            <li key={w.userId} className={`dw-row${w.isMe ? " me" : ""}`}>
              <span className="dw-pos mono">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              {w.streak >= CROWN_STREAK && <Crown ja={ja} />}
              {w.isMe ? <span className="dw-name lb-you"><b>{ja ? "あなた" : "YOU"}</b><small>{w.name}</small></span> : <span className="dw-name">{w.name}</span>}
              {w.streak > 1 && (
                <span className="dw-streak" title={ja ? `${w.streak}日れんぞく` : `${w.streak} days in a row`}>
                  🔥 <b className="mono">{w.streak}</b> {ja ? "日れんぞく" : "days in a row"}
                </span>
              )}
              <span className="dw-time mono">{w.secs}{ja ? "秒" : "s"}</span>
            </li>
          ))}
        </ol>
      )}
      {(more > 0 || all) && winners.length > SHOWN && (
        <button className="dw-more" onClick={() => setAll((v) => !v)}>
          {all ? (ja ? "とじる" : "Show less") : (ja ? `ほか${more}人を見る` : `Show ${more} more`)}
        </button>
      )}
    </div>
    {close.length > 0 && (
      <div className="dw-close" role="region" aria-label={ja ? "おしい！9問正解" : "So close: 9 out of 10"}>
        <div className="dw-close-head">
          <span aria-hidden="true">👏</span>
          <span className="dw-titles">
            <b>{ja ? "おしい！10問中9問正解" : "So close! 9 out of 10"}</b>
            <small>{ja ? "よくがんばったね。あと1問で勝者！" : "Great effort today. One more and you're a winner!"}</small>
          </span>
        </div>
        <ul className="dw-close-list">
          {close.map((c) => (
            <li key={c.userId} className={c.isMe ? "me" : undefined}>{c.isMe ? (ja ? "あなた" : "YOU") : c.name}</li>
          ))}
        </ul>
      </div>
    )}
    </>
  );
}
