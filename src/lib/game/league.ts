import { and, desc, eq, inArray, lt, max, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyChallenge, leaguePoints, users, pushSubscriptions, reminderRuns } from "@/db/schema";
import { sendTo } from "./push";
import { DAILY_QUESTIONS, scoreDaily, todayKey, weekStartKey, leagueOf, settleTier, weeklyTarget, missedDaysBefore, type League } from "./daily";

export type DailyStatus = {
  day: string;
  played: boolean;
  correct: number;
  total: number;
  points: number;
};

export type LeagueRow = {
  userId: string;
  name: string;
  points: number;
  rank: number;
  isMe: boolean;
  /* admin view: played last week, not yet this week — shown in the league
     they have moved into, with no points and no rank */
  waiting?: boolean;
};

export type LeagueStanding = {
  league: League;
  weekStart: string;
  rows: LeagueRow[];
  myRank: number;
  myPoints: number;
  /* players in this league this week (who have played) */
  size: number;
  /* this week's points needed to move up on Monday (null in the top league) */
  target: number | null;
  /* Daily Challenges missed in a row before today, and whether today's is done:
     one miss = "play today or drop"; two = dropped one league */
  missed: number;
  playedToday: boolean;
  lapsed: boolean;
};

/* What settleTier needs for one player, read from the database. */
async function tierInputs(userId: string, week: string, today: string) {
  const db = getDb();
  const cur = (await db.select().from(leaguePoints)
    .where(and(eq(leaguePoints.userId, userId), eq(leaguePoints.weekStart, week))).limit(1))[0];
  const prev = cur ? null : (await db.select().from(leaguePoints)
    .where(and(eq(leaguePoints.userId, userId), lt(leaguePoints.weekStart, week)))
    .orderBy(desc(leaguePoints.weekStart)).limit(1))[0];
  const [lp] = await db.select({ d: max(dailyChallenge.day) }).from(dailyChallenge)
    .where(and(eq(dailyChallenge.userId, userId), lt(dailyChallenge.day, today)));
  const [t] = await db.select({ n: sql<number>`count(*)::int` }).from(dailyChallenge)
    .where(and(eq(dailyChallenge.userId, userId), eq(dailyChallenge.day, today)));
  return {
    cur, lastPlay: lp?.d ? String(lp.d) : null, playedToday: (t?.n ?? 0) > 0,
    prev: prev ? { tier: prev.tier, points: prev.points } : null,
  };
}

/* The league a player is in right now (see settleTier in daily.ts). */
async function tierNow(userId: string, week: string, today: string) {
  const i = await tierInputs(userId, week, today);
  const s = settleTier({ curTier: i.cur?.tier ?? null, prev: i.prev, lastPlay: i.lastPlay, playedToday: i.playedToday, today });
  return { ...s, cur: i.cur, lastPlay: i.lastPlay, playedToday: i.playedToday };
}

export async function getDailyStatus(userId: string): Promise<DailyStatus> {
  const db = getDb();
  const day = todayKey();
  const row = (
    await db
      .select()
      .from(dailyChallenge)
      .where(and(eq(dailyChallenge.userId, userId), eq(dailyChallenge.day, day)))
      .limit(1)
  )[0];
  return {
    day,
    played: !!row,
    correct: row?.correct ?? 0,
    total: row?.total ?? DAILY_QUESTIONS,
    points: row?.points ?? 0,
  };
}

/** Records the one allowed attempt for today and adds its points to this week's league. */
export async function submitDaily(userId: string, correct: number, elapsedMs: number) {
  const db = getDb();
  const day = todayKey();
  const week = weekStartKey();

  const existing = (
    await db
      .select()
      .from(dailyChallenge)
      .where(and(eq(dailyChallenge.userId, userId), eq(dailyChallenge.day, day)))
      .limit(1)
  )[0];
  if (existing) {
    return { alreadyPlayed: true, points: existing.points, correct: existing.correct };
  }

  /* settles the week (target met = up one) and any lapse (two missed days =
     down one) as this play lands */
  const { tier } = await tierNow(userId, week, day);
  const safeCorrect = Math.max(0, Math.min(DAILY_QUESTIONS, Math.floor(correct)));
  const points = scoreDaily(safeCorrect, Math.max(0, elapsedMs));

  await db.insert(dailyChallenge).values({
    userId,
    day,
    correct: safeCorrect,
    total: DAILY_QUESTIONS,
    elapsedMs: Math.max(0, Math.floor(elapsedMs)),
    points,
  });

  await db
    .insert(leaguePoints)
    .values({ userId, weekStart: week, points, tier })
    .onConflictDoUpdate({
      target: [leaguePoints.userId, leaguePoints.weekStart],
      set: { points: sql`${leaguePoints.points} + ${points}`, tier, updatedAt: new Date() },
    });

  return { alreadyPlayed: false, points, correct: safeCorrect };
}

/** This week's table for the player's own tier. */
/* The player's own league this week: everyone in this tier who has played
   this week. Built from the same tables as the admin "All leagues" view
   (minus its waiting players, who have not played yet), so the two agree. */
export async function getLeagueStanding(userId: string): Promise<LeagueStanding> {
  const week = weekStartKey(), today = todayKey();
  const now = await tierNow(userId, week, today);
  const all = await getAllLeagues(userId, week);
  const table = all.tables.find((t) => t.league.tier === now.tier);
  const rows = (table?.rows ?? []).filter((r) => !r.waiting);
  const me = rows.find((r) => r.isMe);
  return {
    league: leagueOf(now.tier),
    weekStart: week,
    rows,
    myRank: me?.rank ?? 0,
    myPoints: now.cur?.points ?? 0,
    size: table?.size ?? 0,
    target: weeklyTarget(now.tier),
    missed: now.playedToday ? 0 : missedDaysBefore(now.lastPlay, today),
    playedToday: now.playedToday,
    lapsed: now.lapsed,
  };
}

/* ---------- admin: every league at once ----------
   The players' sheet shows only their own tier; the admin sees this week's
   table for every tier, everyone in it, with the same up/down zones. */
export type LeagueTable = { league: League; size: number; target: number | null; rows: LeagueRow[] };

export async function getAllLeagues(viewerId: string, week = weekStartKey()): Promise<{ weekStart: string; tables: LeagueTable[] }> {
  const db = getDb();
  const pick = { userId: leaguePoints.userId, points: leaguePoints.points, tier: leaguePoints.tier, name: users.name, username: users.username };
  const rows = await db.select(pick).from(leaguePoints)
    .innerJoin(users, eq(users.id, leaguePoints.userId))
    .where(eq(leaguePoints.weekStart, week))
    .orderBy(desc(leaguePoints.tier), desc(leaguePoints.points));

  /* A new week starts empty until people play, so on a Monday whole leagues
     vanished. Last week's players who have not played yet are listed in the
     league they are in now, by the same rule as the player's own sheet. */
  const prevDate = new Date(week + "T00:00:00");
  prevDate.setDate(prevDate.getDate() - 7);
  const prev = await db.select(pick).from(leaguePoints)
    .innerJoin(users, eq(users.id, leaguePoints.userId))
    .where(eq(leaguePoints.weekStart, todayKey(prevDate)))
    .orderBy(desc(leaguePoints.points));
  const played = new Set(rows.map((r) => r.userId));
  const today = todayKey();
  const idle = prev.filter((r) => !played.has(r.userId));
  const lastPlays = idle.length ? await db.select({ userId: dailyChallenge.userId, d: max(dailyChallenge.day) }).from(dailyChallenge)
    .where(and(inArray(dailyChallenge.userId, idle.map((r) => r.userId)), lt(dailyChallenge.day, today)))
    .groupBy(dailyChallenge.userId) : [];
  const lastPlayOf = new Map(lastPlays.map((r) => [r.userId, r.d ? String(r.d) : null]));
  const waiting: { userId: string; name: string; tier: number }[] = idle.map((r) => ({
    userId: r.userId, name: r.username || r.name,
    tier: settleTier({ curTier: null, prev: { tier: r.tier, points: r.points }, lastPlay: lastPlayOf.get(r.userId) ?? null, playedToday: false, today }).tier,
  }));

  const byTier = new Map<number, typeof rows>();
  for (const r of rows) byTier.set(r.tier, [...(byTier.get(r.tier) ?? []), r]);
  for (const w of waiting) if (!byTier.has(w.tier)) byTier.set(w.tier, []);
  const tables: LeagueTable[] = [...byTier.entries()].sort((a, b) => b[0] - a[0]).map(([tier, list]) => {
    const size = list.length;
    return {
      league: leagueOf(tier), size, target: weeklyTarget(tier),
      rows: [
        ...list.map((r, i) => ({ userId: r.userId, name: r.username || r.name, points: r.points, rank: i + 1, isMe: r.userId === viewerId })),
        ...waiting.filter((w) => w.tier === tier).map((w) => ({ userId: w.userId, name: w.name, points: 0, rank: 0, isMe: w.userId === viewerId, waiting: true })),
      ],
    };
  });
  return { weekStart: week, tables };
}

/* ---------- personal league reminders ----------
   Sent once a day from the evening cron (19:00 Japan time; the Daily
   Challenge day runs to 09:00 the next morning). Every league player in
   Bronze or above who has push turned on and hasn't played today gets one:
   on a first missed day, a nudge; on the second missed day in a row, the
   last chance before dropping a league. Clay can't drop, so it is skipped
   (the general evening reminder covers it). */
export async function runLeagueReminders(): Promise<{ day: string; targets: number; sent: number; skipped?: string }> {
  const db = getDb();
  const day = todayKey(), week = weekStartKey();
  const claimed = await db.insert(reminderRuns).values({ slot: "league", day }).onConflictDoNothing().returning({ slot: reminderRuns.slot });
  if (!claimed.length) return { day, targets: 0, sent: 0, skipped: "already ran today" };

  /* league players: anyone with a row this week or last, and push turned on */
  const lastWeek = new Date(week + "T00:00:00"); lastWeek.setDate(lastWeek.getDate() - 7);
  const subbed = db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
  const players = await db.selectDistinct({ userId: leaguePoints.userId }).from(leaguePoints)
    .where(and(inArray(leaguePoints.weekStart, [week, todayKey(lastWeek)]), inArray(leaguePoints.userId, subbed)));
  const langs = players.length ? await db.select({ id: users.id, lang: users.preferredLang }).from(users).where(inArray(users.id, players.map((p) => p.userId))) : [];
  const langOf = new Map(langs.map((u) => [u.id, u.lang]));

  let targets = 0, sent = 0;
  for (const { userId } of players) {
    const now = await tierNow(userId, week, day);
    if (now.playedToday || now.tier === 0) continue;
    const missed = missedDaysBefore(now.lastPlay, day);
    if (missed >= 2) continue;                           /* already dropped for this break */
    const ja = langOf.get(userId) === "ja";
    const L = leagueOf(now.tier), D = leagueOf(now.tier - 1);
    const cur = ja ? `${L.nameJa}リーグ` : `${L.name} League`, low = ja ? `${D.nameJa}リーグ` : `${D.name}`;
    const note = missed === 0
      ? { title: ja ? `🔥 ${cur}をキープしよう` : `🔥 Keep your place in ${cur}`,
          body: ja ? `今日のデイリーチャレンジが待ってるよ。2日続けて休むと${low}に下がっちゃう。` : `Today's Daily Challenge is waiting. Miss 2 days in a row and you drop to ${low}.` }
      : { title: ja ? `⚠️ ${cur}にのこるラストチャンス` : `⚠️ Last chance to stay in ${cur}`,
          body: ja ? `きのうはお休みだったね。今日やらないと、${low}に下がっちゃうよ。` : `You missed yesterday. Play today's Daily Challenge or you drop to ${low}.` };
    targets++;
    try { await sendTo(userId, { ...note, url: "/", tag: "league" }); sent++; } catch {}
  }
  await db.update(reminderRuns).set({ sent }).where(and(eq(reminderRuns.slot, "league"), eq(reminderRuns.day, day)));
  return { day, targets, sent };
}
