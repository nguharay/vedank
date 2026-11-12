import "./db-env";
import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  getWallet, getInventory,
  buyItem, consumeItem, recordMistake, getMistakes, countMistakes, fixMistake,
} from "../src/lib/game/engagement";
import { SHOP_ITEMS } from "../src/lib/game/quests";

const fails: string[] = [];
function ok(label: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!cond) fails.push(label);
}

(async () => {
  const db = getDb();
  const email = `engagement_probe_${Date.now()}@test.local`;
  const ins = await db.insert(users).values({
    email, name: "Engagement Probe", passwordHash: "x", bonusGems: 500,
  }).returning({ id: users.id });
  const uid = ins[0].id;
  console.log("probe user:", email, "\n");

  try {
    // ---- wallet + shop ----
    let w = await getWallet(uid);
    ok("wallet starts from earned", w.balance === w.earned && w.spent === 0, `earned=${w.earned}`);
    const hint = SHOP_ITEMS.find(s => s.id === "hint")!;
    const buy1 = await buyItem(uid, "hint");
    w = await getWallet(uid);
    ok("buying deducts the cost", buy1.ok && w.spent === hint.cost, `spent=${w.spent} cost=${hint.cost}`);
    ok("buying grants the item", (await getInventory(uid)).hintTokens === 1);

    // level must not move when gems are spent
    const { levelInfo } = await import("../src/lib/game/state");
    const { loadProgress } = await import("../src/lib/game/progress");
    const lvlBefore = levelInfo(await loadProgress(uid)).level;
    await buyItem(uid, "hint");
    const lvlAfter = levelInfo(await loadProgress(uid)).level;
    ok("spending never changes level", lvlBefore === lvlAfter, `lvl=${lvlBefore}`);

    // cap enforcement
    const freeze = SHOP_ITEMS.find(s => s.id === "streakFreeze")!;
    let capHit = false;
    for (let i = 0; i < freeze.max + 3; i++) {
      const r = await buyItem(uid, "streakFreeze");
      if (!r.ok) { capHit = true; break; }
    }
    ok("respects the hold cap", capHit && (await getInventory(uid)).streakFreezes === freeze.max,
       `held=${(await getInventory(uid)).streakFreezes} max=${freeze.max}`);

    // consume
    ok("consume spends one", (await consumeItem(uid, "hint")).ok && (await getInventory(uid)).hintTokens === 1);
    await consumeItem(uid, "hint");
    ok("cannot consume at zero", !(await consumeItem(uid, "hint")).ok);

    // afford check
    await db.update(users).set({ bonusGems: 0 }).where(eq(users.id, uid));
    const poor = await buyItem(uid, "timeBoost");
    ok("refuses when short on gems", !poor.ok, poor.error);
    await db.update(users).set({ bonusGems: 500 }).where(eq(users.id, uid));

    // ---- mistake bank ----
    await recordMistake(uid, "nikhilam", "75 - 38", 37);
    await recordMistake(uid, "nikhilam", "91 x 11", 1001);
    ok("mistakes recorded", (await countMistakes(uid)) === 2);
    await recordMistake(uid, "nikhilam", "75 - 38", 37);
    const ms = await getMistakes(uid);
    ok("same prompt sharpens one row", (await countMistakes(uid)) === 2 && ms[0].misses === 2,
       `misses=${ms[0].misses}`);
    ok("most-missed surfaces first", ms[0].prompt === "75 - 38");

    /* Retiring is the Leitner ladder's job and test-srs covers it end to end.
       What matters here is that a fix promotes the row and takes it out of
       today's queue without retiring it. */
    const f1 = await fixMistake(uid, "75 - 38");
    ok("a fix promotes without retiring", !f1.retired && f1.box === 1, `box=${f1.box}`);
    ok("a promoted row leaves today's queue", (await countMistakes(uid)) === 1);
    await recordMistake(uid, "nikhilam", "75 - 38", 37);
    ok("missing again un-retires", (await countMistakes(uid)) === 2);
  } finally {
    await db.delete(users).where(eq(users.id, uid));
    const gone = await db.select().from(users).where(eq(users.id, uid));
    console.log(`\nprobe user cleaned up: ${gone.length === 0}`);
  }

  console.log(fails.length ? `\n${fails.length} FAILED:\n  ${fails.join("\n  ")}` : "\nall checks passed");
  process.exit(fails.length ? 1 : 0);
})();
