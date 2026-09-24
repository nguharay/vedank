import { and, eq, or, desc, inArray, sql as raw } from "drizzle-orm";
import { getDb } from "@/db";
import { classMembers, classrooms, competitionEntries, competitions, friendships, users } from "@/db/schema";
import { BLITZ_TOPICS, blitzDiff, type Difficulty, type Problem } from "./topics";
import { seededRandom, withSeededRandom } from "./daily";

/* ---------- levels ----------
   Named for what they feel like, not for an internal difficulty enum, because
   a teacher picks these under time pressure in front of a class. */
export type CompLevelId = "veryEasy" | "easy" | "medium" | "hard" | "expert";

export type CompLevel = {
  id: CompLevelId;
  name: string;
  nameJa: string;
  blurb: string;
  blurbJa: string;
  /* difficulty per question, cycled across the paper */
  mix: Difficulty[];
  questions: number;
  durationSec: number;
};

export const COMP_LEVELS: CompLevel[] = [
  {
    id: "veryEasy",
    name: "Very easy",
    nameJa: "とてもやさしい",
    blurb: "All easy. Good for a first try or a warm-up.",
    blurbJa: "すべてやさしい問題。はじめての人に。",
    mix: ["easy"],
    questions: 10,
    durationSec: 300,
  },
  {
    id: "easy",
    name: "Easy",
    nameJa: "やさしい",
    blurb: "Mostly easy, a few medium.",
    blurbJa: "やさしい問題が中心、少し中級。",
    mix: ["easy", "easy", "medium"],
    questions: 12,
    durationSec: 300,
  },
  {
    id: "medium",
    name: "Medium",
    nameJa: "ふつう",
    blurb: "Medium throughout.",
    blurbJa: "すべて中級。",
    mix: ["medium"],
    questions: 15,
    durationSec: 420,
  },
  {
    id: "hard",
    name: "Hard",
    nameJa: "むずかしい",
    blurb: "Medium and hard mixed.",
    blurbJa: "中級と上級のミックス。",
    mix: ["medium", "hard"],
    questions: 15,
    durationSec: 480,
  },
  {
    id: "expert",
    name: "Expert",
    nameJa: "エキスパート",
    blurb: "All hard. For a class that's ready.",
    blurbJa: "すべて上級。実力がついたクラスへ。",
    mix: ["hard"],
    questions: 20,
    durationSec: 600,
  },
];

export function compLevel(id: string): CompLevel {
  return COMP_LEVELS.find((l) => l.id === id) ?? COMP_LEVELS[1];
}

export type CompQuestion = { problem: Problem; topicId: string; options: number[] };

/* Derived from the seed, so every entrant sits the same paper and the server
   can rebuild it to mark the answers. Mental topics only — a competition is
   answered against a clock, same as Blitz. */
export function competitionQuestions(seed: number, levelId: string, count: number): CompQuestion[] {
  const L = compLevel(levelId);
  const rand = seededRandom(seed);
  const out: CompQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const topic = BLITZ_TOPICS[Math.floor(rand() * BLITZ_TOPICS.length)];
    const want = L.mix[i % L.mix.length];
    const problem = withSeededRandom(rand, () => topic.gen(blitzDiff(topic.id, want)));

    const opts = new Set<number>([problem.answer]);
    let guard = 0;
    while (opts.size < 4 && guard++ < 200) {
      const spread = Math.max(2, Math.round(Math.abs(problem.answer) * 0.12));
      const delta = Math.ceil(rand() * spread) * (rand() < 0.5 ? -1 : 1);
      const v = problem.answer + delta;
      if (v !== problem.answer && v >= 0) opts.add(v);
    }
    let n = 1;
    while (opts.size < 4) opts.add(problem.answer + n++);

    const options = [...opts];
    for (let k = options.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [options[k], options[j]] = [options[j], options[k]];
    }
    out.push({ problem, topicId: topic.id, options });
  }
  return out;
}

/* Correct answers dominate; speed only separates equal scores. A competition
   where rushing beats knowing would teach the wrong lesson. */
export function scoreCompetition(correct: number, elapsedMs: number, total: number): number {
  if (correct === 0) return 0;
  const base = correct * 100;
  const avgSec = elapsedMs / 1000 / correct;
  const speed = Math.max(0, Math.round((20 - Math.min(20, avgSec)) * 2));
  const perfect = correct === total ? 100 : 0;
  return base + speed + perfect;
}

export type CompetitionSummary = {
  id: string;
  scope: "class" | "friends";
  classId: string | null;
  /* class name, or the host's name for a friends competition */
  className: string;
  hostName: string;
  hostedByMe: boolean;
  name: string;
  level: CompLevelId;
  levelName: string;
  durationSec: number;
  questionCount: number;
  status: string;
  entrants: number;
  finished: number;
  /* for the asking player: have they taken it? */
  myScore: number | null;
  myRank: number | null;
};

export type CompRow = {
  userId: string;
  name: string;
  correct: number;
  answered: number;
  elapsedMs: number;
  score: number;
  finished: boolean;
  rank: number;
};

async function ownsClass(teacherId: string, classId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classId), eq(classrooms.teacherId, teacherId)))
    .limit(1);
  return rows.length > 0;
}

/* Who is allowed into a friends competition: the host, and anyone on the
   host's friends list. Friendship rows are written in both directions, so one
   lookup settles it. Kept next to the class check because these two functions
   are the whole access model for a competition. */
async function isFriendOfHost(userId: string, hostId: string) {
  if (userId === hostId) return true;
  const db = getDb();
  const rows = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, hostId), eq(friendships.friendId, userId)))
    .limit(1);
  return rows.length > 0;
}

/* A player hosts their own competition for their friends — no class, no
   teacher. Everything downstream (the paper, the marking, the leaderboard) is
   the class machinery unchanged; only who may enter differs. */
export async function createFriendCompetition(
  hostId: string,
  name: string,
  levelId: string,
  durationSec: number,
  questionCount?: number
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Give the competition a name." };
  const L = COMP_LEVELS.find((l) => l.id === levelId);
  if (!L) return { ok: false, error: "Unknown level." };

  const db = getDb();

  /* No friends, no competition — otherwise it is a solo paper with a
     leaderboard of one. */
  const friendCount = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(friendships)
    .where(eq(friendships.userId, hostId));
  if (!(friendCount[0]?.n ?? 0)) {
    return { ok: false, error: "Add a friend first — a competition needs someone to race." };
  }

  /* One live competition per host at a time, so the friends list is not
     buried under half-finished races. */
  const live = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(
      and(
        eq(competitions.teacherId, hostId),
        eq(competitions.scope, "friends"),
        eq(competitions.status, "live")
      )
    )
    .limit(1);
  if (live.length) return { ok: false, error: "You already have one running. End it first." };

  const dur = Math.max(30, Math.min(3600, Math.round(durationSec)));
  const count = Math.max(4, Math.min(40, Math.round(questionCount ?? L.questions)));

  const rows = await db
    .insert(competitions)
    .values({
      classId: null,
      scope: "friends",
      teacherId: hostId,
      name: clean,
      level: L.id,
      durationSec: dur,
      questionCount: count,
      seed: Math.floor(Math.random() * 2147483647),
    })
    .returning({ id: competitions.id });
  return { ok: true, id: rows[0].id };
}

/* The host ends their own race. `endCompetition` checks teacherId, which is
   the host here, so it already covers this — this is only a clearer name. */
export const endFriendCompetition = endCompetition;

export async function createCompetition(
  teacherId: string,
  classId: string,
  name: string,
  levelId: string,
  durationSec: number,
  questionCount?: number
): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Give the competition a name." };
  const L = COMP_LEVELS.find((l) => l.id === levelId);
  if (!L) return { ok: false, error: "Unknown level." };

  /* Bounded so a mistyped duration can't create a 40-hour exam or a 3-second
     one that nobody can finish. */
  const dur = Math.max(30, Math.min(3600, Math.round(durationSec)));
  const count = Math.max(4, Math.min(40, Math.round(questionCount ?? L.questions)));

  const db = getDb();
  const rows = await db
    .insert(competitions)
    .values({
      classId,
      teacherId,
      name: clean,
      level: L.id,
      durationSec: dur,
      questionCount: count,
      seed: Math.floor(Math.random() * 2147483647),
    })
    .returning({ id: competitions.id });
  return { ok: true, id: rows[0].id };
}

export async function endCompetition(
  teacherId: string,
  competitionId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const done = await db
    .update(competitions)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(competitions.id, competitionId), eq(competitions.teacherId, teacherId)))
    .returning({ id: competitions.id });
  return done.length ? { ok: true } : { ok: false, error: "Not your competition." };
}

/* Everything the asking user may see: what they teach, and what their classes
   are running. Membership is the gate on the student side. */
export async function visibleCompetitions(userId: string): Promise<CompetitionSummary[]> {
  const db = getDb();

  /* Three sources: classes I teach, classes I am in, and friends races —
     mine, plus every friend's. */
  const [taught, joined, myFriends] = await Promise.all([
    db.select({ id: classrooms.id, name: classrooms.name }).from(classrooms).where(eq(classrooms.teacherId, userId)),
    db
      .select({ id: classrooms.id, name: classrooms.name })
      .from(classMembers)
      .innerJoin(classrooms, eq(classrooms.id, classMembers.classId))
      .where(eq(classMembers.userId, userId)),
    db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(eq(friendships.userId, userId)),
  ]);
  const classes = [...taught, ...joined];
  const nameById = new Map(classes.map((c) => [c.id, c.name]));
  const hostIds = [userId, ...myFriends.map((f) => f.friendId)];

  const scopes = [];
  if (nameById.size) scopes.push(inArray(competitions.classId, [...nameById.keys()]));
  scopes.push(and(eq(competitions.scope, "friends"), inArray(competitions.teacherId, hostIds)));

  const comps = await db
    .select()
    .from(competitions)
    .where(or(...scopes))
    .orderBy(desc(competitions.createdAt))
    .limit(30);
  if (!comps.length) return [];

  /* Host names, for the friends races. */
  const hostNameById = new Map<string, string>();
  const needHosts = [...new Set(comps.filter((c) => c.scope === "friends").map((c) => c.teacherId))];
  if (needHosts.length) {
    const hosts = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, needHosts));
    hosts.forEach((h) => hostNameById.set(h.id, h.name));
  }

  const entries = await db
    .select()
    .from(competitionEntries)
    .where(inArray(competitionEntries.competitionId, comps.map((c) => c.id)));

  return comps.map((c) => {
    const mine = entries.filter((e) => e.competitionId === c.id);
    const done = mine.filter((e) => e.finishedAt !== null);
    const me = mine.find((e) => e.userId === userId);
    /* Rank among finishers only, and only once this player has finished. */
    let myRank: number | null = null;
    if (me?.finishedAt) {
      const sorted = [...done].sort((a, b) => b.score - a.score || a.elapsedMs - b.elapsedMs);
      myRank = sorted.findIndex((e) => e.userId === userId) + 1 || null;
    }
    const friendsScope = c.scope === "friends";
    const hostName = hostNameById.get(c.teacherId) ?? "";
    return {
      id: c.id,
      scope: friendsScope ? ("friends" as const) : ("class" as const),
      classId: c.classId,
      className: friendsScope ? hostName : (c.classId && nameById.get(c.classId)) || "",
      hostName,
      hostedByMe: friendsScope && c.teacherId === userId,
      name: c.name,
      level: c.level as CompLevelId,
      levelName: compLevel(c.level).name,
      durationSec: c.durationSec,
      questionCount: c.questionCount,
      status: c.status,
      entrants: mine.length,
      finished: done.length,
      myScore: me?.finishedAt ? me.score : null,
      myRank,
    };
  });
}

/* Handing out the paper. Refuses a second attempt, so nobody retries until
   they win, and refuses a competition the player is not in the class for. */
export async function startCompetition(
  userId: string,
  competitionId: string
): Promise<
  | { ok: true; questions: CompQuestion[]; durationSec: number; name: string; levelName: string }
  | { ok: false; error: string }
> {
  const db = getDb();
  const rows = await db.select().from(competitions).where(eq(competitions.id, competitionId)).limit(1);
  const c = rows[0];
  if (!c) return { ok: false, error: "No such competition." };
  if (c.status !== "live") return { ok: false, error: "That competition has ended." };

  if (c.scope === "friends") {
    if (!(await isFriendOfHost(userId, c.teacherId))) {
      return { ok: false, error: "That race is only open to the host's friends." };
    }
  } else {
    const member = c.classId
      ? await db
          .select({ userId: classMembers.userId })
          .from(classMembers)
          .where(and(eq(classMembers.classId, c.classId), eq(classMembers.userId, userId)))
          .limit(1)
      : [];
    if (!member.length && c.teacherId !== userId) return { ok: false, error: "You're not in that class." };
  }

  const existing = await db
    .select()
    .from(competitionEntries)
    .where(and(eq(competitionEntries.competitionId, competitionId), eq(competitionEntries.userId, userId)))
    .limit(1);
  if (existing[0]?.finishedAt) return { ok: false, error: "You've already taken this one." };

  /* Claim the attempt now, so the clock starts server-side and a reload cannot
     hand out a fresh timer. */
  await db
    .insert(competitionEntries)
    .values({ competitionId, userId, startedAt: new Date() })
    .onConflictDoNothing();

  return {
    ok: true,
    questions: competitionQuestions(c.seed, c.level, c.questionCount),
    durationSec: c.durationSec,
    name: c.name,
    levelName: compLevel(c.level).name,
  };
}

/* Marked on the server from the submitted answers: the client sends what it
   chose, never how well it did. */
export async function submitCompetition(
  userId: string,
  competitionId: string,
  answers: (number | null)[]
): Promise<{ ok: boolean; error?: string; correct?: number; score?: number; rank?: number }> {
  const db = getDb();
  const rows = await db.select().from(competitions).where(eq(competitions.id, competitionId)).limit(1);
  const c = rows[0];
  if (!c) return { ok: false, error: "No such competition." };

  const entryRows = await db
    .select()
    .from(competitionEntries)
    .where(and(eq(competitionEntries.competitionId, competitionId), eq(competitionEntries.userId, userId)))
    .limit(1);
  const entry = entryRows[0];
  if (!entry) return { ok: false, error: "You haven't started this one." };
  if (entry.finishedAt) return { ok: false, error: "Already submitted." };

  const questions = competitionQuestions(c.seed, c.level, c.questionCount);
  let correct = 0;
  let answered = 0;
  questions.forEach((q, i) => {
    const a = answers[i];
    if (a === null || a === undefined) return;
    answered++;
    if (a === q.problem.answer) correct++;
  });

  /* Elapsed measured from the stored start, capped at the duration, so a paused
     tab cannot buy extra time and a slow submit cannot post a silly number. */
  const elapsedMs = Math.min(c.durationSec * 1000, Math.max(0, Date.now() - entry.startedAt.getTime()));
  const score = scoreCompetition(correct, elapsedMs, c.questionCount);

  await db
    .update(competitionEntries)
    .set({ finishedAt: new Date(), correct, answered, elapsedMs, score })
    .where(and(eq(competitionEntries.competitionId, competitionId), eq(competitionEntries.userId, userId)));

  const board = await leaderboard(userId, competitionId);
  const rank = board.ok ? board.rows!.find((r) => r.userId === userId)?.rank ?? 0 : 0;
  return { ok: true, correct, score, rank };
}

/* Visible to the teacher and to anyone in the class who has finished — results
   before you have sat it would just be the answers leaking by proxy. */
export async function leaderboard(
  userId: string,
  competitionId: string
): Promise<{ ok: boolean; error?: string; rows?: CompRow[]; name?: string; mine?: CompRow | null }> {
  const db = getDb();
  const rows = await db.select().from(competitions).where(eq(competitions.id, competitionId)).limit(1);
  const c = rows[0];
  if (!c) return { ok: false, error: "No such competition." };

  const isTeacher = c.teacherId === userId;
  const mineRow = await db
    .select()
    .from(competitionEntries)
    .where(and(eq(competitionEntries.competitionId, competitionId), eq(competitionEntries.userId, userId)))
    .limit(1);
  if (!isTeacher && !mineRow[0]?.finishedAt && c.status === "live") {
    return { ok: false, error: "Finish the competition to see the results." };
  }

  const entries = await db
    .select({
      userId: competitionEntries.userId,
      name: users.name,
      correct: competitionEntries.correct,
      answered: competitionEntries.answered,
      elapsedMs: competitionEntries.elapsedMs,
      score: competitionEntries.score,
      finishedAt: competitionEntries.finishedAt,
    })
    .from(competitionEntries)
    .innerJoin(users, eq(users.id, competitionEntries.userId))
    .where(eq(competitionEntries.competitionId, competitionId));

  const finished = entries
    .filter((e) => e.finishedAt !== null)
    .sort((a, b) => b.score - a.score || a.elapsedMs - b.elapsedMs)
    .map((e, i) => ({
      userId: e.userId,
      name: e.name,
      correct: e.correct,
      answered: e.answered,
      elapsedMs: e.elapsedMs,
      score: e.score,
      finished: true,
      rank: i + 1,
    }));

  return {
    ok: true,
    name: c.name,
    rows: finished,
    mine: finished.find((r) => r.userId === userId) ?? null,
  };
}

export async function competitionsForClass(
  teacherId: string,
  classId: string
): Promise<{ ok: boolean; error?: string; rows?: CompetitionSummary[] }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const all = await visibleCompetitions(teacherId);
  return { ok: true, rows: all.filter((c) => c.classId === classId) };
}

export async function competitionCount(classId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(competitions)
    .where(and(eq(competitions.classId, classId), eq(competitions.status, "live")));
  return rows[0]?.n ?? 0;
}
