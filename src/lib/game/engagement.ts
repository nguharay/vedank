import { and, eq, sql as raw } from "drizzle-orm";
import { getDb } from "@/db";
import { inventory, mistakes, questProgress, users } from "@/db/schema";
import { todayKey } from "./daily";
import { questById, questsForDay, shopItem, type QuestEvent, type ShopItemId } from "./quests";
import { loadProgress } from "./progress";
import { totalGems } from "./state";

export type InventoryState = {
  spentGems: number;
  hintTokens: number;
  fiftyTokens: number;
  timeBoosts: number;
  streakFreezes: number;
};

export type QuestState = {
  id: string;
  icon: string;
  title: string;
  titleJa: string;
  target: number;
  reward: number;
  count: number;
  claimed: boolean;
  done: boolean;
};

const EMPTY_INV: InventoryState = {
  spentGems: 0,
  hintTokens: 0,
  fiftyTokens: 0,
  timeBoosts: 0,
  streakFreezes: 0,
};

async function ensureInventory(userId: string): Promise<InventoryState> {
  const db = getDb();
  const rows = await db.select().from(inventory).where(eq(inventory.userId, userId)).limit(1);
  if (rows[0]) return rows[0];
  /* First touch creates the row; a concurrent create is fine to ignore since
     the defaults are what we would have written anyway. */
  await db.insert(inventory).values({ userId }).onConflictDoNothing();
  return { ...EMPTY_INV };
}

export async function getInventory(userId: string): Promise<InventoryState> {
  const inv = await ensureInventory(userId);
  return {
    spentGems: inv.spentGems,
    hintTokens: inv.hintTokens,
    fiftyTokens: inv.fiftyTokens,
    timeBoosts: inv.timeBoosts,
    streakFreezes: inv.streakFreezes,
  };
}

/* Spendable balance. Earned gems come from progress and the daily chest;
   spending subtracts here and never touches the XP that sets the level. */
export async function getWallet(userId: string): Promise<{ earned: number; spent: number; balance: number }> {
  const db = getDb();
  const [progress, inv, userRows] = await Promise.all([
    loadProgress(userId),
    getInventory(userId),
    db.select({ bonusGems: users.bonusGems }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  const earned = totalGems(progress) + (userRows[0]?.bonusGems ?? 0);
  const balance = Math.max(0, earned - inv.spentGems);
  return { earned, spent: inv.spentGems, balance };
}

/* ---------- quests ---------- */

export async function getQuests(userId: string): Promise<{ quests: QuestState[]; day: string }> {
  const db = getDb();
  const day = todayKey();
  const defs = questsForDay(day);
  const rows = await db
    .select()
    .from(questProgress)
    .where(and(eq(questProgress.userId, userId), eq(questProgress.day, day)));
  const byId = new Map(rows.map((r) => [r.questId, r]));

  return {
    day,
    quests: defs.map((q) => {
      const row = byId.get(q.id);
      const count = row?.count ?? 0;
      return {
        id: q.id,
        icon: q.icon,
        title: q.title,
        titleJa: q.titleJa,
        target: q.target,
        reward: q.reward,
        count,
        claimed: row?.claimed ?? false,
        done: count >= q.target,
      };
    }),
  };
}

/* Gameplay calls this with what just happened. Only quests live today and
   listening for that event move, so a stray event is a no-op rather than an
   error — gameplay should never have to know which quests are active. */
export async function reportQuestEvent(
  userId: string,
  event: QuestEvent,
  amount = 1
): Promise<{ quests: QuestState[]; day: string }> {
  const db = getDb();
  const day = todayKey();
  const live = questsForDay(day).filter((q) => q.event === event);

  for (const q of live) {
    /* blitz_score is a high-water mark, not a tally: three runs of 8 is not a
       20. Everything else accumulates. */
    const value = raw`case when ${questProgress.claimed} then ${questProgress.count} else ${
      event === "blitz_score"
        ? raw`greatest(${questProgress.count}, ${amount})`
        : raw`${questProgress.count} + ${amount}`
    } end`;
    await db
      .insert(questProgress)
      .values({ userId, day, questId: q.id, count: amount })
      .onConflictDoUpdate({
        target: [questProgress.userId, questProgress.day, questProgress.questId],
        set: { count: value, updatedAt: new Date() },
      });
  }

  return getQuests(userId);
}

/* Claiming credits the reward as bonus gems, which is the same pot the daily
   chest pays into. Guarded by the claimed flag so a double tap pays once. */
export async function claimQuest(
  userId: string,
  questId: string
): Promise<{ ok: boolean; reward: number; error?: string }> {
  const db = getDb();
  const day = todayKey();
  const def = questById(questId);
  if (!def) return { ok: false, reward: 0, error: "Unknown quest." };
  if (!questsForDay(day).some((q) => q.id === questId)) {
    return { ok: false, reward: 0, error: "That quest isn't today's." };
  }

  /* Single conditional UPDATE decides the race: only the caller that flips
     claimed from false sees a returned row, and only it pays out. */
  const won = await db
    .update(questProgress)
    .set({ claimed: true, updatedAt: new Date() })
    .where(
      and(
        eq(questProgress.userId, userId),
        eq(questProgress.day, day),
        eq(questProgress.questId, questId),
        eq(questProgress.claimed, false),
        raw`${questProgress.count} >= ${def.target}`
      )
    )
    .returning({ questId: questProgress.questId });

  if (!won.length) return { ok: false, reward: 0, error: "Not ready, or already claimed." };

  await db
    .update(users)
    .set({ bonusGems: raw`${users.bonusGems} + ${def.reward}` })
    .where(eq(users.id, userId));

  return { ok: true, reward: def.reward };
}

/* ---------- shop ---------- */

/* Each Drizzle column carries its own literal type, so this is a switch rather
   than a Record — a Record would force them all into one column's type. */
function stockColumn(id: ShopItemId) {
  switch (id) {
    case "hint":
      return inventory.hintTokens;
    case "fifty":
      return inventory.fiftyTokens;
    case "timeBoost":
      return inventory.timeBoosts;
    case "streakFreeze":
      return inventory.streakFreezes;
  }
}

export async function buyItem(
  userId: string,
  itemId: string
): Promise<{ ok: boolean; error?: string; inventory?: InventoryState; balance?: number }> {
  const item = shopItem(itemId);
  if (!item) return { ok: false, error: "Unknown item." };

  const db = getDb();
  await ensureInventory(userId);
  const wallet = await getWallet(userId);
  if (wallet.balance < item.cost) return { ok: false, error: "Not enough gems." };

  const col = stockColumn(item.id);
  /* The held < max and affordability checks are re-asserted in the UPDATE, so
     two taps racing can't overshoot the cap or overspend the balance. */
  const done = await db
    .update(inventory)
    .set({
      spentGems: raw`${inventory.spentGems} + ${item.cost}`,
      [columnName(item.id)]: raw`${col} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventory.userId, userId),
        raw`${col} < ${item.max}`,
        raw`${inventory.spentGems} + ${item.cost} <= ${wallet.earned}`
      )
    )
    .returning({ userId: inventory.userId });

  if (!done.length) return { ok: false, error: "You already hold the maximum of those." };

  const [inv, after] = await Promise.all([getInventory(userId), getWallet(userId)]);
  return { ok: true, inventory: inv, balance: after.balance };
}

function columnName(id: ShopItemId): "hintTokens" | "fiftyTokens" | "timeBoosts" | "streakFreezes" {
  switch (id) {
    case "hint":
      return "hintTokens";
    case "fifty":
      return "fiftyTokens";
    case "timeBoost":
      return "timeBoosts";
    case "streakFreeze":
      return "streakFreezes";
  }
}

/* Spending a consumable. Returns false when the player had none, so the UI can
   stay honest rather than granting a free use. */
export async function consumeItem(userId: string, itemId: string): Promise<{ ok: boolean; inventory?: InventoryState }> {
  const item = shopItem(itemId);
  if (!item) return { ok: false };
  const db = getDb();
  await ensureInventory(userId);
  const col = stockColumn(item.id);
  const done = await db
    .update(inventory)
    .set({ [columnName(item.id)]: raw`${col} - 1`, updatedAt: new Date() })
    .where(and(eq(inventory.userId, userId), raw`${col} > 0`))
    .returning({ userId: inventory.userId });
  if (!done.length) return { ok: false };
  return { ok: true, inventory: await getInventory(userId) };
}

/* ---------- mistake bank: Leitner spaced repetition ----------
   Boxes, in days. A question answered right moves up a box and is not asked
   again until its interval elapses; a miss sends it straight back to box 0 and
   due immediately. Graduating the last box retires it.

   The intervals are the classic expanding schedule, kept short at the start
   because a child's practice session is today, not next month. */
export const LEITNER_DAYS = [0, 1, 3, 7, 16, 35];
export const LAST_BOX = LEITNER_DAYS.length - 1;

export function dueDateFor(box: number, from = new Date()): Date {
  const days = LEITNER_DAYS[Math.min(Math.max(box, 0), LAST_BOX)];
  /* Due at the start of the target day rather than the exact clock time, so a
     question learned at 9pm is available the next morning, not at 9pm sharp. */
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  if (days > 0) d.setHours(0, 0, 0, 0);
  return d;
}

export type MistakeRow = {
  prompt: string;
  topicId: string;
  answer: number;
  misses: number;
  box: number;
};

export async function recordMistake(
  userId: string,
  topicId: string,
  prompt: string,
  answer: number
): Promise<void> {
  const db = getDb();
  await db
    .insert(mistakes)
    .values({ userId, topicId, prompt, answer, misses: 1, lastMissedAt: new Date() })
    .onConflictDoUpdate({
      target: [mistakes.userId, mistakes.prompt],
      /* Missing it again un-retires the row and resets the fix counter — the
         question clearly is not learned yet. */
      set: {
        misses: raw`${mistakes.misses} + 1`,
        fixes: 0,
        retired: false,
        answer,
        topicId,
        lastMissedAt: new Date(),
        /* Straight back to the bottom of the ladder, due now. */
        box: 0,
        dueAt: new Date(),
      },
    });
}

/* Only what is due, soonest-due first, then most-missed. A question in a high
   box is not in the way of one the player keeps getting wrong. */
export async function getMistakes(userId: string, limit = 10): Promise<MistakeRow[]> {
  const db = getDb();
  return db
    .select({
      prompt: mistakes.prompt,
      topicId: mistakes.topicId,
      answer: mistakes.answer,
      misses: mistakes.misses,
      box: mistakes.box,
    })
    .from(mistakes)
    .where(
      and(
        eq(mistakes.userId, userId),
        eq(mistakes.retired, false),
        raw`${mistakes.dueAt} <= now()`
      )
    )
    /* By the DAY a row fell due, then by how often it has been missed.
       Ordering on the raw dueAt put a question you had just got wrong again at
       the back of the queue, because re-missing resets dueAt to now, which
       sorts after anything that fell due a moment earlier. Comparing whole days
       keeps a genuinely overdue row in front while letting everything due today
       be led by the one missed most -- and the ladder already snaps dueAt to the
       start of the day for every box above 0, so the day is the real unit. */
    .orderBy(raw`date_trunc('day', ${mistakes.dueAt}) asc, ${mistakes.misses} desc`)
    .limit(limit);
}

/* The badge counts what is due now — a count including future reviews would
   nag about work the player cannot usefully do yet. */
export async function countMistakes(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: raw<number>`count(*)::int` })
    .from(mistakes)
    .where(
      and(
        eq(mistakes.userId, userId),
        eq(mistakes.retired, false),
        raw`${mistakes.dueAt} <= now()`
      )
    );
  return rows[0]?.n ?? 0;
}

export type ReviewStats = { due: number; learning: number; retired: number; nextDueAt: string | null };

/* What the review card shows when nothing is due: how much is resting, and when
   the next question comes back. */
export async function reviewStats(userId: string): Promise<ReviewStats> {
  const db = getDb();
  const rows = await db
    .select({
      due: raw<number>`count(*) filter (where not ${mistakes.retired} and ${mistakes.dueAt} <= now())::int`,
      learning: raw<number>`count(*) filter (where not ${mistakes.retired})::int`,
      retired: raw<number>`count(*) filter (where ${mistakes.retired})::int`,
      nextDueAt: raw<string | null>`min(${mistakes.dueAt}) filter (where not ${mistakes.retired} and ${mistakes.dueAt} > now())`,
    })
    .from(mistakes)
    .where(eq(mistakes.userId, userId));
  const r = rows[0];
  return {
    due: r?.due ?? 0,
    learning: r?.learning ?? 0,
    retired: r?.retired ?? 0,
    nextDueAt: r?.nextDueAt ? new Date(r.nextDueAt).toISOString() : null,
  };
}

/* A correct answer promotes one box and pushes the due date out by that box's
   interval. Graduating the last box retires the question. Computed here rather
   than in SQL so the ladder lives in one readable place. */
export async function fixMistake(
  userId: string,
  prompt: string
): Promise<{ retired: boolean; box: number; dueAt: string | null }> {
  const db = getDb();
  const cur = await db
    .select({ box: mistakes.box })
    .from(mistakes)
    .where(and(eq(mistakes.userId, userId), eq(mistakes.prompt, prompt)))
    .limit(1);
  if (!cur.length) return { retired: false, box: 0, dueAt: null };

  const nextBox = Math.min(cur[0].box + 1, LAST_BOX);
  const graduated = cur[0].box >= LAST_BOX;
  const due = dueDateFor(nextBox);

  const rows = await db
    .update(mistakes)
    .set({
      fixes: raw`${mistakes.fixes} + 1`,
      box: nextBox,
      dueAt: due,
      reviewedAt: new Date(),
      retired: graduated,
    })
    .where(and(eq(mistakes.userId, userId), eq(mistakes.prompt, prompt)))
    .returning({ retired: mistakes.retired, box: mistakes.box, dueAt: mistakes.dueAt });

  const row = rows[0];
  return {
    retired: row?.retired ?? false,
    box: row?.box ?? nextBox,
    dueAt: row?.dueAt ? new Date(row.dueAt).toISOString() : null,
  };
}
