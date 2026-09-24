import { and, eq, or, sql as raw, desc, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { challenges, friendships, users } from "@/db/schema";
import { loadProgress } from "./progress";
import { levelInfo } from "./state";

export type Friend = {
  id: string;
  name: string;
  level: number;
  dailyStreak: number;
  /* duel record against this friend, from the asking player's side */
  wins: number;
  losses: number;
};

export type ChallengeRow = {
  id: string;
  kind: string;
  level: number;
  fromScore: number;
  toScore: number | null;
  status: string;
  opponentId: string;
  opponentName: string;
  /* true when the asking player is the one being challenged */
  incoming: boolean;
  won: boolean | null;
};

/* Ambiguous characters are left out so a code read aloud or copied off a screen
   can't land on the wrong account. */
const CODE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";

function randomCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `VEDA-${out}`;
}

export function normaliseCode(input: string): string {
  const bare = input.trim().toUpperCase().replace(/^VEDA-?/, "").replace(/[^A-Z0-9]/g, "");
  return bare ? `VEDA-${bare}` : "";
}

/* Generated on first request rather than backfilled, so existing accounts get
   one the moment they open the friends panel. */
export async function ensureFriendCode(userId: string): Promise<string> {
  const db = getDb();
  const rows = await db.select({ code: users.friendCode }).from(users).where(eq(users.id, userId)).limit(1);
  if (rows[0]?.code) return rows[0].code;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    try {
      const done = await db
        .update(users)
        .set({ friendCode: code })
        .where(and(eq(users.id, userId), isNull(users.friendCode)))
        .returning({ code: users.friendCode });
      if (done[0]?.code) return done[0].code;
      /* Someone else set it first — read theirs rather than overwriting. */
      const again = await db.select({ code: users.friendCode }).from(users).where(eq(users.id, userId)).limit(1);
      if (again[0]?.code) return again[0].code;
    } catch {
      /* unique collision on the code itself — try another */
    }
  }
  throw new Error("Could not allocate a friend code.");
}

export async function addFriendByCode(
  userId: string,
  rawCode: string
): Promise<{ ok: boolean; error?: string; name?: string }> {
  const code = normaliseCode(rawCode);
  if (!code || code.length < 8) return { ok: false, error: "That code doesn't look right." };

  const db = getDb();
  const found = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.friendCode, code))
    .limit(1);
  const friend = found[0];
  if (!friend) return { ok: false, error: "No player has that code." };
  if (friend.id === userId) return { ok: false, error: "That's your own code!" };

  /* Both directions in one statement each, idempotent so re-adding is a no-op
     rather than an error the child has to interpret. */
  await db
    .insert(friendships)
    .values([
      { userId, friendId: friend.id },
      { userId: friend.id, friendId: userId },
    ])
    .onConflictDoNothing();

  return { ok: true, name: friend.name };
}

/* Used by a race invite: following the host's link makes you friends, which
   is what lets you into the race. Mutual rows, idempotent — same as adding by
   code, minus the code. */
export async function ensureFriendship(a: string, b: string): Promise<void> {
  if (a === b) return;
  const db = getDb();
  await db
    .insert(friendships)
    .values([
      { userId: a, friendId: b },
      { userId: b, friendId: a },
    ])
    .onConflictDoNothing();
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
      )
    );
}

export async function listFriends(userId: string): Promise<Friend[]> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id, name: users.name, dailyStreak: users.dailyStreak })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.friendId))
    .where(eq(friendships.userId, userId));
  if (!rows.length) return [];

  /* Settled duels only — an open challenge has no winner yet. */
  const duels = await db
    .select({
      fromUserId: challenges.fromUserId,
      toUserId: challenges.toUserId,
      fromScore: challenges.fromScore,
      toScore: challenges.toScore,
    })
    .from(challenges)
    .where(
      and(
        eq(challenges.status, "done"),
        or(eq(challenges.fromUserId, userId), eq(challenges.toUserId, userId))
      )
    );

  const record = new Map<string, { wins: number; losses: number }>();
  for (const d of duels) {
    if (d.toScore === null) continue;
    const other = d.fromUserId === userId ? d.toUserId : d.fromUserId;
    const mine = d.fromUserId === userId ? d.fromScore : d.toScore;
    const theirs = d.fromUserId === userId ? d.toScore : d.fromScore;
    const r = record.get(other) ?? { wins: 0, losses: 0 };
    if (mine > theirs) r.wins++;
    else if (theirs > mine) r.losses++;
    record.set(other, r);
  }

  /* Levels come from each friend's own progress, the same maths the game uses. */
  const withLevels = await Promise.all(
    rows.map(async (r) => {
      const lvl = levelInfo(await loadProgress(r.id)).level;
      const rec = record.get(r.id) ?? { wins: 0, losses: 0 };
      return { id: r.id, name: r.name, level: lvl, dailyStreak: r.dailyStreak, wins: rec.wins, losses: rec.losses };
    })
  );
  withLevels.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  return withLevels;
}

export async function createChallenge(
  userId: string,
  toUserId: string,
  score: number,
  level = 2
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isFinite(score) || score < 0) return { ok: false, error: "Odd score." };
  if (!Number.isInteger(level) || level < 1 || level > 4) return { ok: false, error: "Unknown level." };
  const db = getDb();

  /* Only to an actual friend — the id comes from the client, so membership is
     re-checked here rather than trusted. */
  const isFriend = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, userId), eq(friendships.friendId, toUserId)))
    .limit(1);
  if (!isFriend.length) return { ok: false, error: "Not on your friends list." };

  await db.insert(challenges).values({
    fromUserId: userId,
    toUserId,
    kind: "blitz",
    level,
    fromScore: Math.floor(score),
  });
  return { ok: true };
}

export async function listChallenges(userId: string): Promise<ChallengeRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: challenges.id,
      kind: challenges.kind,
      level: challenges.level,
      fromUserId: challenges.fromUserId,
      toUserId: challenges.toUserId,
      fromScore: challenges.fromScore,
      toScore: challenges.toScore,
      status: challenges.status,
      fromName: users.name,
    })
    .from(challenges)
    .innerJoin(users, eq(users.id, challenges.fromUserId))
    .where(or(eq(challenges.fromUserId, userId), eq(challenges.toUserId, userId)))
    .orderBy(desc(challenges.createdAt))
    .limit(20);

  /* The joined name is the challenger's; for a duel I sent, the opponent is the
     recipient, so those names are fetched in one extra pass. */
  const needNames = rows.filter((r) => r.fromUserId === userId).map((r) => r.toUserId);
  const nameById = new Map<string, string>();
  if (needNames.length) {
    const others = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, needNames));
    others.forEach((o) => nameById.set(o.id, o.name));
  }

  return rows.map((r) => {
    const incoming = r.toUserId === userId;
    const opponentId = incoming ? r.fromUserId : r.toUserId;
    const opponentName = incoming ? r.fromName : nameById.get(r.toUserId) ?? "—";
    let won: boolean | null = null;
    if (r.status === "done" && r.toScore !== null) {
      const mine = incoming ? r.toScore : r.fromScore;
      const theirs = incoming ? r.fromScore : r.toScore;
      won = mine > theirs;
    }
    return {
      id: r.id,
      kind: r.kind,
      level: r.level,
      fromScore: r.fromScore,
      toScore: r.toScore,
      status: r.status,
      opponentId,
      opponentName,
      incoming,
      won,
    };
  });
}

/* Called when the challenged player finishes a Blitz run. The conditional
   UPDATE is the guard: a duel settles exactly once, on the first run after
   accepting, so you can't reroll until you win. */
export async function answerChallenge(
  userId: string,
  challengeId: string,
  score: number
): Promise<{ ok: boolean; won?: boolean; error?: string }> {
  const db = getDb();
  const done = await db
    .update(challenges)
    .set({ toScore: Math.floor(Math.max(0, score)), status: "done", respondedAt: new Date() })
    .where(
      and(
        eq(challenges.id, challengeId),
        eq(challenges.toUserId, userId),
        eq(challenges.status, "open")
      )
    )
    .returning({ fromScore: challenges.fromScore, toScore: challenges.toScore });

  if (!done.length) return { ok: false, error: "That duel is already settled." };
  const row = done[0];
  return { ok: true, won: (row.toScore ?? 0) > row.fromScore };
}

export async function pendingChallengeCount(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(challenges)
    .where(and(eq(challenges.toUserId, userId), eq(challenges.status, "open")));
  return rows[0]?.n ?? 0;
}
