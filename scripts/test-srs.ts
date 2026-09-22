import { getDb } from "../src/db";
import { users, mistakes } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import {
  recordMistake, getMistakes, countMistakes, fixMistake, reviewStats,
  LEITNER_DAYS, LAST_BOX, dueDateFor,
} from "../src/lib/game/engagement";

const fails: string[] = [];
function ok(l: string, c: boolean, x = "") { console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  " + x : ""}`); if (!c) fails.push(l); }

(async () => {
  const db = getDb();
  const ins = await db.insert(users).values({
    email: `srs_${Date.now()}@test.local`, name: "SRS Probe", passwordHash: "x",
  }).returning({ id: users.id });
  const uid = ins[0].id;
  const P = "88 x 11";

  /* Pretend a review happened N days ago by moving due_at back. */
  const travel = async (days: number) => {
    await db.update(mistakes)
      .set({ dueAt: new Date(Date.now() - days * 864e5) })
      .where(and(eq(mistakes.userId, uid), eq(mistakes.prompt, P)));
  };

  try {
    ok("intervals expand", LEITNER_DAYS.every((d, i) => i === 0 || d > LEITNER_DAYS[i - 1]), LEITNER_DAYS.join(","));
    const d1 = dueDateFor(1), d3 = dueDateFor(3);
    ok("higher box = later due", d3.getTime() > d1.getTime());
    ok("box 0 is due immediately", dueDateFor(0).getTime() <= Date.now() + 1000);
    ok("box clamps at the top", dueDateFor(99).getTime() === dueDateFor(LAST_BOX).getTime());

    await recordMistake(uid, "nikhilam", P, 968);
    ok("a fresh miss is due now", (await countMistakes(uid)) === 1);
    ok("starts in box 0", (await getMistakes(uid))[0].box === 0);

    // promote once: should leave the due queue
    const f1 = await fixMistake(uid, P);
    ok("promotes to box 1", f1.box === 1 && !f1.retired, `box=${f1.box}`);
    ok("no longer due today", (await countMistakes(uid)) === 0);
    ok("still counted as learning", (await reviewStats(uid)).learning === 1);
    const st = await reviewStats(uid);
    ok("reports when it comes back", !!st.nextDueAt, st.nextDueAt ?? "none");

    // when it comes due again it reappears
    await travel(1);
    ok("reappears once due", (await countMistakes(uid)) === 1);

    // climb the ladder
    let box = 1;
    for (let i = 2; i <= LAST_BOX; i++) {
      await travel(1);
      const f = await fixMistake(uid, P);
      box = f.box;
      if (f.retired) break;
    }
    ok("climbs to the last box", box === LAST_BOX, `box=${box}`);
    ok("not retired at the last box yet", !(await reviewStats(uid)).retired);

    await travel(1);
    const grad = await fixMistake(uid, P);
    ok("graduating the last box retires it", grad.retired);
    ok("retired rows leave the queue", (await countMistakes(uid)) === 0);
    ok("retired is counted separately", (await reviewStats(uid)).retired === 1);

    // a later miss resets the whole ladder
    await recordMistake(uid, "nikhilam", P, 968);
    const back = await getMistakes(uid);
    ok("a new miss resets to box 0 and due now", back.length === 1 && back[0].box === 0);
    ok("un-retired", (await reviewStats(uid)).retired === 0);
    ok("misses still accumulate", back[0].misses === 2, `misses=${back[0].misses}`);

    // due ordering: soonest-due first
    await recordMistake(uid, "nikhilam", "12 x 12", 144);
    await fixMistake(uid, "12 x 12");
    await db.update(mistakes).set({ dueAt: new Date(Date.now() - 5 * 864e5) })
      .where(and(eq(mistakes.userId, uid), eq(mistakes.prompt, "12 x 12")));
    const ordered = await getMistakes(uid);
    ok("soonest-due surfaces first", ordered[0].prompt === "12 x 12", ordered.map(r => r.prompt).join(" | "));
  } finally {
    await db.delete(users).where(eq(users.id, uid));
    console.log(`\nprobe cleaned up: ${(await db.select().from(users).where(eq(users.id, uid))).length === 0}`);
  }
  console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join("\n  ")}` : "\nall checks passed");
  process.exit(fails.length ? 1 : 0);
})();
