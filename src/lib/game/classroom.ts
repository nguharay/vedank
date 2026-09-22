import { and, eq, inArray, sql as raw, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { classMembers, classrooms, mistakes, users } from "@/db/schema";
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
};

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

export async function myClassMemberships(
  userId: string
): Promise<{ id: string; name: string; teacherName: string; assignedTopicId: string | null; assignedNote: string | null }[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      assignedTopicId: classrooms.assignedTopicId,
      assignedNote: classrooms.assignedNote,
      teacherName: users.name,
    })
    .from(classMembers)
    .innerJoin(classrooms, eq(classrooms.id, classMembers.classId))
    .innerJoin(users, eq(users.id, classrooms.teacherId))
    .where(eq(classMembers.userId, userId));
  return rows;
}

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
      };
    })
  );

  students.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, students, assignedTopicId };
}
