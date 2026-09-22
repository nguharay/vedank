import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  ensureFriendCode, addFriendByCode, removeFriend, listFriends,
  createChallenge, listChallenges, answerChallenge, pendingChallengeCount, normaliseCode,
} from "../src/lib/game/friends";

const fails: string[] = [];
function ok(label: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!cond) fails.push(label);
}

(async () => {
  const db = getDb();
  const mk = async (name: string) => {
    const r = await db.insert(users).values({
      email: `social_${name}_${Date.now()}@test.local`, name, passwordHash: "x",
    }).returning({ id: users.id });
    return r[0].id;
  };
  const [a, b, c] = [await mk("Ayla"), await mk("Bo"), await mk("Cy")];
  const ids = [a, b, c];

  try {
    // ---- codes ----
    const codeA = await ensureFriendCode(a);
    ok("code has the expected shape", /^VEDA-[ACDEFGHJKLMNPQRTUVWXY34679]{6}$/.test(codeA), codeA);
    ok("code is stable across calls", (await ensureFriendCode(a)) === codeA);
    const codeB = await ensureFriendCode(b);
    ok("codes differ between players", codeA !== codeB, codeB);
    ok("no ambiguous chars (0/O/1/I/S/5/2/Z/8/B)", !/[0O1ISZ2B58]/.test(codeA.slice(5)));
    ok("normalises loose input", normaliseCode(` ${codeA.toLowerCase().replace("veda-","")} `) === codeA);

    // ---- adding ----
    const own = await addFriendByCode(a, codeA);
    ok("cannot friend yourself", !own.ok, own.error);
    const bad = await addFriendByCode(a, "VEDA-XXXXXX");
    ok("unknown code rejected", !bad.ok, bad.error);
    const junk = await addFriendByCode(a, "hi");
    ok("malformed code rejected", !junk.ok, junk.error);

    const add = await addFriendByCode(a, codeB);
    ok("adds by code", add.ok && add.name === "Bo");
    ok("friendship is mutual", (await listFriends(a)).length === 1 && (await listFriends(b)).length === 1);
    const again = await addFriendByCode(a, codeB);
    ok("re-adding is idempotent", again.ok && (await listFriends(a)).length === 1);

    // ---- challenge guards ----
    const notFriend = await createChallenge(a, c, 20);
    ok("cannot duel a non-friend", !notFriend.ok, notFriend.error);
    const negative = await createChallenge(a, b, -5);
    ok("rejects a negative score", !negative.ok);

    ok("no pending duels yet", (await pendingChallengeCount(b)) === 0);
    const ch = await createChallenge(a, b, 23);
    ok("creates a duel", ch.ok);
    ok("recipient sees it pending", (await pendingChallengeCount(b)) === 1);
    ok("challenger has none pending", (await pendingChallengeCount(a)) === 0);

    let bList = await listChallenges(b);
    ok("recipient sees it as incoming", bList[0].incoming && bList[0].opponentName === "Ayla" && bList[0].fromScore === 23);
    let aList = await listChallenges(a);
    ok("sender sees it as outgoing", !aList[0].incoming && aList[0].opponentName === "Bo");
    ok("undecided while open", bList[0].won === null && bList[0].status === "open");

    // ---- answering ----
    const wrongPlayer = await answerChallenge(a, bList[0].id, 99);
    ok("only the recipient can answer", !wrongPlayer.ok, wrongPlayer.error);

    const ans = await answerChallenge(b, bList[0].id, 30);
    ok("recipient answers and wins on the higher score", ans.ok && ans.won === true);
    const twice = await answerChallenge(b, bList[0].id, 500);
    ok("cannot reroll a settled duel", !twice.ok, twice.error);
    ok("no longer pending", (await pendingChallengeCount(b)) === 0);

    bList = await listChallenges(b);
    aList = await listChallenges(a);
    ok("winner recorded for both sides", bList[0].won === true && aList[0].won === false,
       `b.won=${bList[0].won} a.won=${aList[0].won}`);

    let fb = await listFriends(b);
    let fa = await listFriends(a);
    ok("duel record reflects the result", fb[0].wins === 1 && fb[0].losses === 0 && fa[0].wins === 0 && fa[0].losses === 1,
       `b ${fb[0].wins}-${fb[0].losses} / a ${fa[0].wins}-${fa[0].losses}`);

    // a losing reply
    const ch2 = await createChallenge(a, b, 40);
    const bL2 = (await listChallenges(b)).find(x => x.status === "open")!;
    const ans2 = await answerChallenge(b, bL2.id, 12);
    ok("lower score loses", ch2.ok && ans2.ok && ans2.won === false);
    fb = await listFriends(b);
    ok("record tallies both duels", fb[0].wins === 1 && fb[0].losses === 1, `${fb[0].wins}-${fb[0].losses}`);

    // ---- tie ----
    await createChallenge(a, b, 15);
    const bL3 = (await listChallenges(b)).find(x => x.status === "open")!;
    await answerChallenge(b, bL3.id, 15);
    fb = await listFriends(b);
    ok("a tie counts as neither", fb[0].wins === 1 && fb[0].losses === 1, `${fb[0].wins}-${fb[0].losses}`);

    // ---- removal ----
    await removeFriend(a, b);
    ok("removal is mutual", (await listFriends(a)).length === 0 && (await listFriends(b)).length === 0);

    // ---- cascade ----
    const before = await listChallenges(b);
    ok("duels survive unfriending", before.length > 0);
  } finally {
    await db.delete(users).where(inArray(users.id, ids));
    const left = await db.select().from(users).where(inArray(users.id, ids));
    console.log(`\nprobe users cleaned up: ${left.length === 0}`);
  }

  console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join("\n  ")}` : "\nall checks passed");
  process.exit(fails.length ? 1 : 0);
})();
