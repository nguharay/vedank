"use client";

import { useState } from "react";
import type { DailyWinners } from "@/lib/game/league";

/* ---- 🏆 Today's Daily Challenge winners ----
   Everyone who got all 8 right, fastest first. A player who has done it more
   than one day running wears a flame with the number of days. Until someone
   wins today, yesterday's winners stay up with a nudge to be the first. */
const SHOWN = 6;

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
  return (
    <div className="dw-card" role="region" aria-label={ja ? "デイリーチャレンジの勝者" : "Daily Challenge winners"}>
      <div className="dw-head">
        <span className="dw-cup" aria-hidden="true">🏆</span>
        <span className="dw-titles">
          <b>{isToday ? (ja ? "今日のデイリー勝者" : "Today's Daily winners") : (ja ? "きのうのデイリー勝者" : "Yesterday's Daily winners")}</b>
          <small>{winners.length === 0
            ? (ja ? "まだいないよ。8問ぜんぶ正解で名前がのる！" : "No one yet. Get all 8 right to see your name here!")
            : !isToday
              ? (ja ? "今日はまだだれも全問正解していないよ。1番のりしよう！" : "No one has 8 out of 8 yet today. Be the first!")
              : (ja ? "8問ぜんぶ正解した人たち" : "Everyone who got all 8 right")}</small>
        </span>
        {onPlay && <button className="dw-play" onClick={onPlay}>{ja ? "挑戦" : "Play"} ▶</button>}
      </div>
      {winners.length > 0 && (
        <ol className="dw-list">
          {list.map((w, i) => (
            <li key={w.userId} className={`dw-row${w.isMe ? " me" : ""}`}>
              <span className="dw-pos mono">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              <span className="dw-name">{w.name}{w.isMe ? (ja ? "（きみ）" : " (you)") : ""}</span>
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
  );
}
