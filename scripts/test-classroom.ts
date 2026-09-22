import { getDb } from "../src/db";
import { users, classrooms, mistakes } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  createClassroom, myClassrooms, joinClassroom, leaveClassroom, myClassMemberships,
  classRoster, setAssignment, setClassOpen, removeStudent, normaliseClassCode,
} from "../src/lib/game/classroom";
import { recordMistake } from "../src/lib/game/engagement";
import { TOPICS } from "../src/lib/game/topics";

const fails: string[] = [];
function ok(l: string, c: boolean, x = "") { console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  " + x : ""}`); if (!c) fails.push(l); }

(async () => {
  const db = getDb();
  const mk = async (n: string) => (await db.insert(users).values({
    email: `cls_${n}_${Date.now()}_${Math.random().toString(36).slice(2,6)}@test.local`,
    name: n, passwordHash: "x",
  }).returning({ id: users.id }))[0].id;

  const teacher = await mk("Teacher");
  const other = await mk("OtherTeacher");
  const kid1 = await mk("Ayla");
  const kid2 = await mk("Bo");
  const ids = [teacher, other, kid1, kid2];

  try {
    ok("blank name rejected", !(await createClassroom(teacher, "   ")).ok);
    const made = await createClassroom(teacher, "Year 5 Maths");
    const cls = made.classroom!;
    ok("creates a class with a 5-char code", made.ok && /^[ACDEFGHJKLMNPQRTUVWXY34679]{5}$/.test(cls.joinCode), cls.joinCode);
    ok("no ambiguous chars in code", !/[0O1ISZ2B58]/.test(cls.joinCode));
    ok("normalises loose code input", normaliseClassCode(` ${cls.joinCode.toLowerCase()} `) === cls.joinCode);
    ok("listed for its teacher", (await myClassrooms(teacher)).length === 1);
    ok("not listed for anyone else", (await myClassrooms(other)).length === 0);

    ok("unknown code rejected", !(await joinClassroom(kid1, "ZZZZZ")).ok);
    ok("malformed code rejected", !(await joinClassroom(kid1, "AB")).ok);
    ok("teacher cannot join own class", !(await joinClassroom(teacher, cls.joinCode)).ok);

    const j = await joinClassroom(kid1, cls.joinCode);
    ok("child joins by code", j.ok && j.name === "Year 5 Maths");
    await joinClassroom(kid2, cls.joinCode);
    ok("re-joining is idempotent", (await joinClassroom(kid1, cls.joinCode)).ok
       && (await myClassrooms(teacher))[0].memberCount === 2);
    ok("child sees the class they joined", (await myClassMemberships(kid1))[0].name === "Year 5 Maths");
    ok("child sees who teaches it", (await myClassMemberships(kid1))[0].teacherName === "Teacher");

    // --- ownership is enforced on every teacher path ---
    ok("outsider cannot read the roster", !(await classRoster(other, cls.id)).ok);
    ok("outsider cannot assign", !(await setAssignment(other, cls.id, TOPICS[0].id, "x")).ok);
    ok("outsider cannot close", !(await setClassOpen(other, cls.id, false)).ok);
    ok("outsider cannot remove a student", !(await removeStudent(other, cls.id, kid1)).ok);
    ok("a child cannot read the roster", !(await classRoster(kid1, cls.id)).ok);

    // --- roster content ---
    let r = await classRoster(teacher, cls.id);
    ok("teacher reads the roster", r.ok && r.students!.length === 2);
    ok("roster is sorted by name", r.students!.map(s => s.name).join(",") === "Ayla,Bo");
    ok("roster carries no emails", !JSON.stringify(r.students).includes("@test.local"));

    await recordMistake(kid1, "nikhilam", "98 x 97", 9506);
    await recordMistake(kid1, "nikhilam", "98 x 97", 9506);
    await recordMistake(kid1, "nikhilam", "12 x 13", 156);
    r = await classRoster(teacher, cls.id);
    const ayla = r.students!.find(s => s.name === "Ayla")!;
    ok("surfaces due reviews per child", ayla.dueReviews === 2, `due=${ayla.dueReviews}`);
    ok("surfaces the weakest prompts", ayla.weakest[0].prompt === "98 x 97" && ayla.weakest[0].misses === 2,
       JSON.stringify(ayla.weakest[0]));
    ok("weakest is capped at 3", ayla.weakest.length <= 3);

    // --- assignment ---
    ok("rejects an unknown topic", !(await setAssignment(teacher, cls.id, "not_a_topic", null)).ok);
    const topic = TOPICS[0].id;
    ok("assigns a topic", (await setAssignment(teacher, cls.id, topic, "Do stages 1-3")).ok);
    r = await classRoster(teacher, cls.id);
    ok("roster reports assignment progress", r.assignedTopicId === topic
       && r.students!.every(s => s.assignedCleared === 0));
    ok("child sees the assignment", (await myClassMemberships(kid1))[0].assignedTopicId === topic);
    ok("note is carried to the child", (await myClassMemberships(kid1))[0].assignedNote === "Do stages 1-3");

    // --- open / closed ---
    ok("closes to new joiners", (await setClassOpen(teacher, cls.id, false)).ok);
    const kid3 = await mk("Cy"); ids.push(kid3);
    ok("closed class refuses a new child", !(await joinClassroom(kid3, cls.joinCode)).ok);
    ok("existing roster survives closing", (await classRoster(teacher, cls.id)).students!.length === 2);

    // --- leaving and removal ---
    await leaveClassroom(kid2, cls.id);
    ok("a child can leave on their own", (await classRoster(teacher, cls.id)).students!.length === 1);
    ok("leaving ends the teacher's view", !(await myClassMemberships(kid2)).length);
    ok("teacher can remove a student", (await removeStudent(teacher, cls.id, kid1)).ok
       && (await classRoster(teacher, cls.id)).students!.length === 0);

    // --- cascade: deleting the class drops membership, not the children ---
    await joinClassroom(kid1, cls.joinCode).catch(() => {});
    await db.delete(classrooms).where(eq(classrooms.id, cls.id));
    ok("deleting a class frees its members", (await myClassMemberships(kid1)).length === 0);
    ok("children survive class deletion", (await db.select().from(users).where(eq(users.id, kid1))).length === 1);
  } finally {
    await db.delete(users).where(inArray(users.id, ids));
    console.log(`\nprobes cleaned up: ${(await db.select().from(users).where(inArray(users.id, ids))).length === 0}`);
  }
  console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join("\n  ")}` : "\nall checks passed");
  process.exit(fails.length ? 1 : 0);
})();
