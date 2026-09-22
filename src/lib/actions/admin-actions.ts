"use server";

import { getDb } from "@/db";
import { users, topicProgress, arenaProgress, dailyChallenge, leaguePoints } from "@/db/schema";
import { getAdminSession } from "@/lib/admin";
import { COUNTRIES } from "@/lib/countries";
import { rankFor } from "@/lib/game/topics";
import { weekStartKey } from "@/lib/game/daily";

export type SignupRow = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  country: string | null;
  countryName: string | null;
  countryFlag: string | null;
  phone: string | null;
  preferredLang: string;
  createdAt: string;
  lastActiveDate: string | null;
  dailyStreak: number;
  bestDailyStreak: number;
  gems: number;
  level: number;
  rank: string;
  stagesCleared: number;
  puzzlesSolved: number;
  dailiesPlayed: number;
  weekPoints: number;
  locked: boolean;
};

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/* Gem maths mirrors getLeaderboard so the admin view and the in-game leaderboard
   can never disagree about someone's level. */
function gemsFrom(cleared: number, stars: number, solved: number, bonus: number) {
  return cleared * 50 + stars * 25 + solved * 40 + bonus;
}

export type SignupSummary = { total: number; newThisWeek: number; activeToday: number; jp: number };

export async function listSignups(): Promise<
  { ok: true; rows: SignupRow[]; summary: SignupSummary } | { ok: false; error: string }
> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Not authorised." };

  const db = getDb();

  /* Explicit column list — passwordHash and the reset-token table must never
     leave the server, so they are not selectable from here at all. */
  const [userRows, tRows, aRows, dRows, lRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        country: users.country,
        phoneCode: users.phoneCode,
        phone: users.phone,
        preferredLang: users.preferredLang,
        createdAt: users.createdAt,
        lastActiveDate: users.lastActiveDate,
        dailyStreak: users.dailyStreak,
        bestDailyStreak: users.bestDailyStreak,
        bonusGems: users.bonusGems,
        lockedUntil: users.lockedUntil,
      })
      .from(users),
    db.select().from(topicProgress),
    db.select().from(arenaProgress),
    db.select({ userId: dailyChallenge.userId }).from(dailyChallenge),
    db.select({ userId: leaguePoints.userId, points: leaguePoints.points, weekStart: leaguePoints.weekStart }).from(leaguePoints),
  ]);

  const cleared = new Map<string, number>();
  const stars = new Map<string, number>();
  for (const row of tRows) {
    cleared.set(row.userId, (cleared.get(row.userId) || 0) + row.cleared);
    const s = (row.stageStars as Record<string, number>) || {};
    let n = 0;
    for (const v of Object.values(s)) n += v || 0;
    stars.set(row.userId, (stars.get(row.userId) || 0) + n);
  }

  const solved = new Map<string, number>();
  for (const row of aRows) {
    if (row.solved) solved.set(row.userId, (solved.get(row.userId) || 0) + 1);
  }

  const dailies = new Map<string, number>();
  for (const row of dRows) dailies.set(row.userId, (dailies.get(row.userId) || 0) + 1);

  /* Current ISO week only — last week's standing isn't what an admin is checking. */
  const thisWeek = weekStartKey();
  const weekPts = new Map<string, number>();
  for (const row of lRows) {
    if (String(row.weekStart) === thisWeek) weekPts.set(row.userId, row.points);
  }

  const now = Date.now();
  const rows: SignupRow[] = userRows.map((u) => {
    const c = u.country ? COUNTRY_BY_CODE.get(u.country) : undefined;
    const gems = gemsFrom(cleared.get(u.id) || 0, stars.get(u.id) || 0, solved.get(u.id) || 0, u.bonusGems);
    const level = Math.floor(gems / 150) + 1;
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      country: u.country,
      countryName: c?.name ?? u.country ?? null,
      countryFlag: c?.flag ?? null,
      phone: u.phone ? `${u.phoneCode || ""} ${u.phone}`.trim() : null,
      preferredLang: u.preferredLang,
      createdAt: u.createdAt.toISOString(),
      lastActiveDate: u.lastActiveDate ? String(u.lastActiveDate) : null,
      dailyStreak: u.dailyStreak,
      bestDailyStreak: u.bestDailyStreak,
      gems,
      level,
      rank: rankFor(level),
      stagesCleared: cleared.get(u.id) || 0,
      puzzlesSolved: solved.get(u.id) || 0,
      dailiesPlayed: dailies.get(u.id) || 0,
      weekPoints: weekPts.get(u.id) || 0,
      locked: !!u.lockedUntil && u.lockedUntil.getTime() > now,
    };
  });

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* Computed here rather than in the table component: the clock belongs on the
     server, and reading it during render is neither pure nor hydration-safe. */
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 864e5).toISOString().slice(0, 10);
  const summary: SignupSummary = {
    total: rows.length,
    newThisWeek: rows.filter((r) => r.createdAt.slice(0, 10) >= weekAgo).length,
    activeToday: rows.filter((r) => r.lastActiveDate === today).length,
    jp: rows.filter((r) => r.preferredLang === "ja").length,
  };

  return { ok: true, rows, summary };
}
