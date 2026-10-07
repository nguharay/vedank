import { and, eq, inArray, sql as raw, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { classGroups, classMembers, classrooms, mistakes, users } from "@/db/schema";
import { loadProgress } from "./progress";
import { levelInfo } from "./state";
import { TOPICS } from "./topics";
import { countMistakes } from "./engagement";

export type ClassSummary = {
  id: string;
  name: string;
  joinCode: string;
  open: boolean;
  assignedTopicId: string | null;
  assignedNote: string | null;
  memberCount: number;
};

export type ClassStudent = {
  id: string;
  name: string;
  level: number;
  gems: number;
  dailyStreak: number;
  lastActiveDate: string | null;
  stagesCleared: number;
  puzzlesSolved: number;
  dueReviews: number;
  /* the three prompts this child misses most — what a teacher actually wants */
  weakest: { prompt: string; misses: number }[];
  /* progress on the currently assigned topic, if the class has one */
  assignedCleared: number | null;
  /* the group (team) the teacher put them in, if any */
  groupId: string | null;
};

export type ClassGroup = { id: string; name: string; emoji: string; color: string; stars: number; sort: number };

/* Same unambiguous alphabet as friend codes: a class code gets read off a
   whiteboard to twenty children at once. */
const CODE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";

function randomCode(): string {
  let out = "";
  for (let i = 0; i < 5; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export function normaliseClassCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export async function createClassroom(
  teacherId: string,
  name: string
): Promise<{ ok: boolean; error?: string; classroom?: ClassSummary }> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return { ok: false, error: "Give the class a name." };

  const db = getDb();
  const mine = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(classrooms)
    .where(eq(classrooms.teacherId, teacherId));
  if ((mine[0]?.n ?? 0) >= 10) return { ok: false, error: "You already have 10 classes." };

  for (let attempt = 0; attempt < 10; attempt++) {
    const joinCode = randomCode();
    try {
      const rows = await db
        .insert(classrooms)
        .values({ teacherId, name: clean, joinCode })
        .returning();
      const c = rows[0];
      return {
        ok: true,
        classroom: {
          id: c.id,
          name: c.name,
          joinCode: c.joinCode,
          open: c.open,
          assignedTopicId: c.assignedTopicId,
          assignedNote: c.assignedNote,
          memberCount: 0,
        },
      };
    } catch {
      /* code collision — draw another */
    }
  }
  return { ok: false, error: "Could not allocate a class code." };
}

export async function myClassrooms(teacherId: string): Promise<ClassSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.teacherId, teacherId))
    .orderBy(desc(classrooms.createdAt));
  if (!rows.length) return [];

  const counts = await db
    .select({ classId: classMembers.classId, n: raw<number>`count(*)::int` })
    .from(classMembers)
    .where(inArray(classMembers.classId, rows.map((r) => r.id)))
    .groupBy(classMembers.classId);
  const byId = new Map(counts.map((c) => [c.classId, c.n]));

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    joinCode: c.joinCode,
    open: c.open,
    assignedTopicId: c.assignedTopicId,
    assignedNote: c.assignedNote,
    memberCount: byId.get(c.id) ?? 0,
  }));
}

/* Ownership is re-checked on every teacher read and write — the class id comes
   from the client, so it is never trusted on its own. */
async function ownsClass(teacherId: string, classId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classId), eq(classrooms.teacherId, teacherId)))
    .limit(1);
  return rows.length > 0;
}

export async function joinClassroom(
  userId: string,
  code: string
): Promise<{ ok: boolean; error?: string; name?: string }> {
  const joinCode = normaliseClassCode(code);
  if (joinCode.length !== 5) return { ok: false, error: "That class code doesn't look right." };

  const db = getDb();
  const found = await db
    .select({ id: classrooms.id, name: classrooms.name, open: classrooms.open, teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(eq(classrooms.joinCode, joinCode))
    .limit(1);
  const c = found[0];
  if (!c) return { ok: false, error: "No class has that code." };
  if (!c.open) return { ok: false, error: "That class is closed to new joiners." };
  if (c.teacherId === userId) return { ok: false, error: "That's your own class." };

  await db.insert(classMembers).values({ classId: c.id, userId }).onConflictDoNothing();
  return { ok: true, name: c.name };
}

/* A child can always leave, and leaving immediately ends the teacher's view of
   them. This is the child's control over being observed, so it takes no
   approval from the teacher. */
export async function leaveClassroom(userId: string, classId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)));
}

export type Membership = {
  id: string; name: string; teacherName: string; assignedTopicId: string | null; assignedNote: string | null;
  /* the child's own group, its teammates (first names only), and every
     group's stars so the class can see the team standings */
  group: (ClassGroup & { mates: string[] }) | null;
  groups: ClassGroup[];
};

export async function myClassMemberships(userId: string): Promise<Membership[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      assignedTopicId: classrooms.assignedTopicId,
      assignedNote: classrooms.assignedNote,
      teacherName: users.name,
      groupId: classMembers.groupId,
    })
    .from(classMembers)
    .innerJoin(classrooms, eq(classrooms.id, classMembers.classId))
    .innerJoin(users, eq(users.id, classrooms.teacherId))
    .where(eq(classMembers.userId, userId));
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const groups = await db.select().from(classGroups).where(inArray(classGroups.classId, ids)).orderBy(classGroups.sort);
  const myGroupIds = rows.map((r) => r.groupId).filter((g): g is string => !!g);
  const mates = myGroupIds.length
    ? await db
        .select({ groupId: classMembers.groupId, userId: users.id, name: users.name })
        .from(classMembers)
        .innerJoin(users, eq(users.id, classMembers.userId))
        .where(inArray(classMembers.groupId, myGroupIds))
    : [];

  return rows.map((r) => {
    const gs = groups.filter((g) => g.classId === r.id).map(groupView);
    const mine = gs.find((g) => g.id === r.groupId);
    return {
      id: r.id, name: r.name, teacherName: r.teacherName, assignedTopicId: r.assignedTopicId, assignedNote: r.assignedNote,
      group: mine
        ? { ...mine, mates: mates.filter((m) => m.groupId === mine.id && m.userId !== userId).map((m) => firstName(m.name)) }
        : null,
      groups: gs,
    };
  });
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const groupView = (g: typeof classGroups.$inferSelect): ClassGroup => ({
  id: g.id, name: g.name, emoji: g.emoji, color: g.color, stars: g.stars, sort: g.sort,
});

export async function setAssignment(
  teacherId: string,
  classId: string,
  topicId: string | null,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  if (topicId && !TOPICS.some((t) => t.id === topicId)) return { ok: false, error: "Unknown topic." };
  const db = getDb();
  await db
    .update(classrooms)
    .set({ assignedTopicId: topicId, assignedNote: note?.trim().slice(0, 140) || null })
    .where(eq(classrooms.id, classId));
  return { ok: true };
}

export async function setClassOpen(
  teacherId: string,
  classId: string,
  open: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const db = getDb();
  await db.update(classrooms).set({ open }).where(eq(classrooms.id, classId));
  return { ok: true };
}

export async function removeStudent(
  teacherId: string,
  classId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const db = getDb();
  await db
    .delete(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)));
  return { ok: true };
}

export async function classRoster(
  teacherId: string,
  classId: string
): Promise<{ ok: boolean; error?: string; students?: ClassStudent[]; assignedTopicId?: string | null }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };

  const db = getDb();
  const cls = await db
    .select({ assignedTopicId: classrooms.assignedTopicId })
    .from(classrooms)
    .where(eq(classrooms.id, classId))
    .limit(1);
  const assignedTopicId = cls[0]?.assignedTopicId ?? null;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      dailyStreak: users.dailyStreak,
      lastActiveDate: users.lastActiveDate,
      bonusGems: users.bonusGems,
      groupId: classMembers.groupId,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(eq(classMembers.classId, classId));
  if (!rows.length) return { ok: true, students: [], assignedTopicId };

  /* Only ever the child's own weakest prompts, never a comparison table of who
     is worst — the point is to tell a teacher what to teach next. */
  const students = await Promise.all(
    rows.map(async (r) => {
      const [progress, due, weak] = await Promise.all([
        loadProgress(r.id),
        countMistakes(r.id),
        db
          .select({ prompt: mistakes.prompt, misses: mistakes.misses })
          .from(mistakes)
          .where(and(eq(mistakes.userId, r.id), eq(mistakes.retired, false)))
          .orderBy(desc(mistakes.misses))
          .limit(3),
      ]);
      const li = levelInfo(progress);
      let cleared = 0;
      for (const t of TOPICS) cleared += progress.topics[t.id]?.cleared ?? 0;
      const solved = Object.values(progress.arena.solved).filter(Boolean).length;
      return {
        id: r.id,
        name: r.name,
        level: li.level,
        gems: li.xp + r.bonusGems,
        dailyStreak: r.dailyStreak,
        lastActiveDate: r.lastActiveDate ? String(r.lastActiveDate) : null,
        stagesCleared: cleared,
        puzzlesSolved: solved,
        dueReviews: due,
        weakest: weak,
        assignedCleared: assignedTopicId ? progress.topics[assignedTopicId]?.cleared ?? 0 : null,
        groupId: r.groupId ?? null,
      };
    })
  );

  students.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, students, assignedTopicId };
}

/* ---------- groups (teams) ---------- */

/* Ready-made team identities: an animal, a colour, and a name in both
   languages so a class in Japan or anywhere else can use them as they are. */
export const GROUP_PRESETS = [
  { emoji: "🐯", name: "Tigers · トラ", color: "#F28C28" },
  { emoji: "🐬", name: "Dolphins · イルカ", color: "#2F8FD8" },
  { emoji: "🐸", name: "Frogs · カエル", color: "#3DAA5C" },
  { emoji: "🦄", name: "Unicorns · ユニコーン", color: "#B05CD8" },
  { emoji: "🐼", name: "Pandas · パンダ", color: "#4B5563" },
  { emoji: "🦊", name: "Foxes · キツネ", color: "#E0603A" },
  { emoji: "🐧", name: "Penguins · ペンギン", color: "#1F6FB2" },
  { emoji: "🐝", name: "Bees · ハチ", color: "#D9A400" },
] as const;

export async function classGroupsFor(teacherId: string, classId: string): Promise<{ ok: boolean; error?: string; groups?: ClassGroup[] }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const rows = await getDb().select().from(classGroups).where(eq(classGroups.classId, classId)).orderBy(classGroups.sort);
  return { ok: true, groups: rows.map(groupView) };
}

/* Split the roster into `count` groups. "random" shuffles; "mixed" deals the
   children out by level (a snake draft) so every group has a spread of
   stronger and newer players. Replaces any groups the class already has. */
export async function makeGroups(
  teacherId: string,
  classId: string,
  count: number,
  mode: "random" | "mixed"
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const n = Math.max(2, Math.min(GROUP_PRESETS.length, Math.floor(count) || 2));
  const roster = await classRoster(teacherId, classId);
  const kids = roster.students ?? [];

  let order: string[];
  if (mode === "mixed") {
    order = [...kids].sort((a, b) => b.level - a.level || b.stagesCleared - a.stagesCleared).map((k) => k.id);
  } else {
    order = kids.map((k) => k.id);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }

  const db = getDb();
  await db.update(classMembers).set({ groupId: null }).where(eq(classMembers.classId, classId));
  await db.delete(classGroups).where(eq(classGroups.classId, classId));
  /* start from a random preset so two classes don't always get the same teams */
  const start = Math.floor(Math.random() * GROUP_PRESETS.length);
  const made = await db
    .insert(classGroups)
    .values(Array.from({ length: n }, (_, i) => ({ classId, sort: i, ...GROUP_PRESETS[(start + i) % GROUP_PRESETS.length] })))
    .returning({ id: classGroups.id, sort: classGroups.sort });
  made.sort((a, b) => a.sort - b.sort);

  /* snake order: 0,1,2,2,1,0,0,1,2… keeps the mixed groups balanced */
  const buckets: string[][] = made.map(() => []);
  order.forEach((id, i) => {
    const lap = Math.floor(i / n), pos = i % n;
    buckets[lap % 2 === 0 ? pos : n - 1 - pos].push(id);
  });
  await Promise.all(
    buckets.map((ids, gi) =>
      ids.length
        ? db.update(classMembers).set({ groupId: made[gi].id })
            .where(and(eq(classMembers.classId, classId), inArray(classMembers.userId, ids)))
        : null
    )
  );
  return { ok: true };
}

/* the group must belong to this class — both ids come from the client */
async function groupInClass(classId: string, groupId: string): Promise<boolean> {
  const rows = await getDb().select({ id: classGroups.id }).from(classGroups)
    .where(and(eq(classGroups.id, groupId), eq(classGroups.classId, classId))).limit(1);
  return rows.length > 0;
}

export async function moveToGroup(teacherId: string, classId: string, userId: string, groupId: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  if (groupId && !(await groupInClass(classId, groupId))) return { ok: false, error: "Unknown group." };
  await getDb().update(classMembers).set({ groupId })
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)));
  return { ok: true };
}

export async function addGroup(teacherId: string, classId: string): Promise<{ ok: boolean; error?: string; group?: ClassGroup }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  const db = getDb();
  const have = await db.select().from(classGroups).where(eq(classGroups.classId, classId));
  if (have.length >= GROUP_PRESETS.length) return { ok: false, error: `Up to ${GROUP_PRESETS.length} groups.` };
  const preset = GROUP_PRESETS.find((p) => !have.some((h) => h.emoji === p.emoji)) ?? GROUP_PRESETS[0];
  const [g] = await db.insert(classGroups)
    .values({ classId, sort: Math.max(-1, ...have.map((h) => h.sort)) + 1, ...preset }).returning();
  return { ok: true, group: groupView(g) };
}

export async function updateGroup(
  teacherId: string,
  classId: string,
  groupId: string,
  patch: { name?: string; starsDelta?: number; resetStars?: boolean }
): Promise<{ ok: boolean; error?: string; group?: ClassGroup }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  if (!(await groupInClass(classId, groupId))) return { ok: false, error: "Unknown group." };
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim().slice(0, 30);
    if (!name) return { ok: false, error: "Give the group a name." };
    set.name = name;
  }
  if (patch.resetStars) set.stars = 0;
  else if (patch.starsDelta) set.stars = raw`greatest(0, ${classGroups.stars} + ${Math.max(-5, Math.min(5, Math.round(patch.starsDelta)))})`;
  if (!Object.keys(set).length) return { ok: false, error: "Nothing to change." };
  const [g] = await getDb().update(classGroups).set(set).where(eq(classGroups.id, groupId)).returning();
  return { ok: true, group: groupView(g) };
}

export async function deleteGroup(teacherId: string, classId: string, groupId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  await getDb().delete(classGroups).where(and(eq(classGroups.id, groupId), eq(classGroups.classId, classId)));
  return { ok: true };
}

export async function clearGroups(teacherId: string, classId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await ownsClass(teacherId, classId))) return { ok: false, error: "Not your class." };
  await getDb().delete(classGroups).where(eq(classGroups.classId, classId));
  return { ok: true };
}

/* for the join link page: what class a code opens, before the child decides */
export async function classByCode(code: string): Promise<{ id: string; name: string; teacherName: string; open: boolean } | null> {
  const joinCode = normaliseClassCode(code);
  if (joinCode.length !== 5) return null;
  const rows = await getDb()
    .select({ id: classrooms.id, name: classrooms.name, open: classrooms.open, teacherName: users.name })
    .from(classrooms).innerJoin(users, eq(users.id, classrooms.teacherId))
    .where(eq(classrooms.joinCode, joinCode)).limit(1);
  return rows[0] ?? null;
}

export async function isMember(userId: string, classId: string): Promise<boolean> {
  const rows = await getDb().select({ c: classMembers.classId }).from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId))).limit(1);
  return rows.length > 0;
}
