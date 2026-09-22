import { getDb } from "../src/db";
import { users, competitionEntries } from "../src/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { createClassroom, joinClassroom } from "../src/lib/game/classroom";
import {
  createCompetition, endCompetition, visibleCompetitions, competitionsForClass,
  startCompetition, submitCompetition, leaderboard, competitionQuestions, COMP_LEVELS, scoreCompetition,
} from "../src/lib/game/competition";
import { BLITZ_MAX_DIFF } from "../src/lib/game/topics";

const fails: string[] = [];
function ok(l: string, c: boolean, x = "") { console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  " + x : ""}`); if (!c) fails.push(l); }

(async () => {
  const db = getDb();
  const mk = async (n: string) => (await db.insert(users).values({
    email: `comp_${n}_${Date.now()}_${Math.random().toString(36).slice(2,6)}@test.local`,
    name: n, passwordHash: "x",
  }).returning({ id: users.id }))[0].id;

  const teacher = await mk("Teacher"), outsider = await mk("Outsider");
  const a = await mk("Ayla"), b = await mk("Bo"), c = await mk("Cy");
  const ids = [teacher, outsider, a, b, c];

  try {
    const cls = (await createClassroom(teacher, "Comp Class")).classroom!;
    for (const kid of [a, b, c]) await joinClassroom(kid, cls.joinCode);

    // ---- the paper is identical for everyone, and different per competition ----
    const q1 = competitionQuestions(12345, "medium", 10);
    const q2 = competitionQuestions(12345, "medium", 10);
    const q3 = competitionQuestions(999, "medium", 10);
    ok("same seed gives the same paper", JSON.stringify(q1) === JSON.stringify(q2));
    ok("different seed gives a different paper", JSON.stringify(q1) !== JSON.stringify(q3));
    ok("options include the answer", q1.every(q => q.options.includes(q.problem.answer)));
    ok("always four options", q1.every(q => q.options.length === 4));
    ok("no duplicate options", q1.every(q => new Set(q.options).size === 4));
    const banned = new Set(Object.entries(BLITZ_MAX_DIFF).filter(([,v]) => v === null).map(([k]) => k));
    const leak = COMP_LEVELS.flatMap(L => competitionQuestions(7, L.id, 20)).filter(q => banned.has(q.topicId));
    ok("no non-mental topics on any level", leak.length === 0, leak.map(q=>q.topicId).join(",") || "clean");

    // ---- creation guards ----
    ok("outsider cannot create", !(await createCompetition(outsider, cls.id, "X", "easy", 300)).ok);
    ok("blank name rejected", !(await createCompetition(teacher, cls.id, " ", "easy", 300)).ok);
    ok("unknown level rejected", !(await createCompetition(teacher, cls.id, "X", "nope", 300)).ok);
    const made = await createCompetition(teacher, cls.id, "Friday Sprint", "easy", 120, 6);
    ok("teacher creates one", made.ok);
    const compId = made.id!;

    // duration and count are clamped, not trusted
    const wild = await createCompetition(teacher, cls.id, "Wild", "easy", 999999, 900);
    const wildRow = (await competitionsForClass(teacher, cls.id)).rows!.find(r => r.name === "Wild")!;
    ok("duration is clamped", wild.ok && wildRow.durationSec === 3600, `dur=${wildRow.durationSec}`);
    ok("question count is clamped", wildRow.questionCount === 40, `n=${wildRow.questionCount}`);

    // ---- visibility ----
    ok("students see it", (await visibleCompetitions(a)).some(x => x.id === compId));
    ok("outsider sees nothing", (await visibleCompetitions(outsider)).length === 0);
    ok("teacher sees it", (await visibleCompetitions(teacher)).some(x => x.id === compId));

    // ---- taking it ----
    ok("outsider cannot start", !(await startCompetition(outsider, compId)).ok);
    const s = await startCompetition(a, compId);
    ok("student starts and gets the paper", s.ok && s.ok === true && (s as any).questions.length === 6);
    const paper = (s as any).questions as { problem: { answer: number } }[];

    // grading is server-side: a lying client cannot inflate its score
    const allRight = paper.map(q => q.problem.answer);
    const subA = await submitCompetition(a, compId, allRight);
    ok("full marks scored", subA.ok && subA.correct === 6, `correct=${subA.correct}`);
    ok("cannot submit twice", !(await submitCompetition(a, compId, allRight)).ok);
    ok("cannot restart after finishing", !(await startCompetition(a, compId)).ok);

    // a wrong paper
    await startCompetition(b, compId);
    const half = paper.map((q, i) => (i < 3 ? q.problem.answer : q.problem.answer + 1));
    const subB = await submitCompetition(b, compId, half);
    ok("marks only the right ones", subB.ok && subB.correct === 3, `correct=${subB.correct}`);

    // blanks count as unanswered, not wrong-but-attempted
    await startCompetition(c, compId);
    const partial = paper.map((q, i) => (i < 2 ? q.problem.answer : null));
    const subC = await submitCompetition(c, compId, partial);
    ok("blank answers are not counted as attempts", subC.ok && subC.correct === 2);
    const cRow = (await db.select().from(competitionEntries)
      .where(and(eq(competitionEntries.competitionId, compId), eq(competitionEntries.userId, c))))[0];
    ok("answered counts only what was chosen", cRow.answered === 2, `answered=${cRow.answered}`);

    ok("submitting without starting is refused", !(await submitCompetition(outsider, compId, allRight)).ok);

    // ---- ranking ----
    const board = await leaderboard(teacher, compId);
    ok("teacher reads the board", board.ok && board.rows!.length === 3);
    ok("ranked by score", board.rows!.map(r => r.name).join(",") === "Ayla,Bo,Cy",
       board.rows!.map(r => `${r.name}:${r.score}`).join(" "));
    ok("ranks are 1..n", board.rows!.every((r, i) => r.rank === i + 1));
    ok("a finisher sees the board", (await leaderboard(a, compId)).ok);
    ok("board carries no emails", !JSON.stringify(board.rows).includes("@test.local"));

    const fresh = await mk("Dee"); ids.push(fresh);
    await joinClassroom(fresh, cls.joinCode);
    ok("results hidden until you have sat it", !(await leaderboard(fresh, compId)).ok);

    ok("score ranks accuracy over speed",
       scoreCompetition(6, 200000, 6) > scoreCompetition(5, 1000, 6),
       `${scoreCompetition(6,200000,6)} vs ${scoreCompetition(5,1000,6)}`);
    ok("speed breaks ties", scoreCompetition(5, 5000, 6) > scoreCompetition(5, 120000, 6));

    // ---- ending ----
    ok("outsider cannot end it", !(await endCompetition(outsider, compId)).ok);
    ok("teacher ends it", (await endCompetition(teacher, compId)).ok);
    ok("cannot start an ended one", !(await startCompetition(fresh, compId)).ok);
    ok("results open once ended", (await leaderboard(fresh, compId)).ok);
  } finally {
    await db.delete(users).where(inArray(users.id, ids));
    console.log(`\nprobes cleaned up: ${(await db.select().from(users).where(inArray(users.id, ids))).length === 0}`);
  }
  console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join("\n  ")}` : "\nall checks passed");
  process.exit(fails.length ? 1 : 0);
})();
