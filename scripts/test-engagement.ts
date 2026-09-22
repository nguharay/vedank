import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  getQuests, reportQuestEvent, claimQuest, getWallet, getInventory,
  buyItem, consumeItem, recordMistake, getMistakes, countMistakes, fixMistake,
} from "../src/lib/game/engagement";
import { questsForDay, SHOP_ITEMS } from "../src/lib/game/quests";

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
    // ---- quests are deterministic and distinct ----
    const d1 = questsForDay("2026-09-22").map(q => q.id);
    const d1again = questsForDay("2026-09-22").map(q => q.id);
    const d2 = questsForDay("2026-09-23").map(q => q.id);
    ok("same day -> same 3 quests", JSON.stringify(d1) === JSON.stringify(d1again), d1.join(","));
    ok("3 quests per day", d1.length === 3);
    ok("no duplicate quest ids", new Set(d1).size === 3);
    ok("different day -> different set", JSON.stringify(d1) !== JSON.stringify(d2), d2.join(","));
    const evs = questsForDay("2026-09-22").map(q => q.event);
    ok("quests use distinct events", new Set(evs).size === evs.length, evs.join(","));

    // ---- progress reporting ----
    const live = questsForDay();
    const q0 = live[0];
    let st = await getQuests(uid);
    ok("starts at zero", st.quests.every(q => q.count === 0 && !q.claimed));
    await reportQuestEvent(uid, q0.event, q0.event === "blitz_score" ? q0.target : 1);
    st = await getQuests(uid);
    const row0 = st.quests.find(q => q.id === q0.id)!;
    ok("event increments the right quest", row0.count > 0, `${row0.count}/${row0.target}`);
    const others = st.quests.filter(q => q.id !== q0.id && q.count > 0);
    ok("unrelated quests untouched", others.length === 0);

    // ---- claim once, and only when done ----
    const early = await claimQuest(uid, q0.id);
    const needMore = row0.count < q0.target;
    ok("cannot claim before target", needMore ? !early.ok : early.ok, early.error || `reward=${early.reward}`);

    // drive it to completion
    for (let i = 0; i < q0.target + 2; i++) {
      await reportQuestEvent(uid, q0.event, q0.event === "blitz_score" ? q0.target : 1);
    }
    st = await getQuests(uid);
    ok("reaches done", st.quests.find(q => q.id === q0.id)!.done);

    const before = (await db.select({ b: users.bonusGems }).from(users).where(eq(users.id, uid)))[0].b;
    const c1 = await claimQuest(uid, q0.id);
    const c2 = await claimQuest(uid, q0.id);
    const after = (await db.select({ b: users.bonusGems }).from(users).where(eq(users.id, uid)))[0].b;
    ok("claim pays out once", c1.ok && !c2.ok, `paid=${after - before} expected=${q0.reward}`);
    ok("payout is the quest reward", after - before === q0.reward);

    // claimed quests stop accumulating
    const atClaim = (await getQuests(uid)).quests.find(q => q.id === q0.id)!.count;
    await reportQuestEvent(uid, q0.event, 1);
    const afterClaim = (await getQuests(uid)).quests.find(q => q.id === q0.id)!.count;
    ok("claimed quest stops counting", atClaim === afterClaim, `${atClaim} -> ${afterClaim}`);

    ok("unknown quest id rejected", !(await claimQuest(uid, "not_a_quest")).ok);

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

    const f1 = await fixMistake(uid, "75 - 38");
    ok("one fix does not retire", !f1.retired && (await countMistakes(uid)) === 2);
    const f2 = await fixMistake(uid, "75 - 38");
    ok("two fixes retire it", f2.retired && (await countMistakes(uid)) === 1);
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
