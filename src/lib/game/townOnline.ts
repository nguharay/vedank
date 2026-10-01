import "server-only";
import { eq, inArray, sql as raw } from "drizzle-orm";
import { getDb } from "@/db";
import { towns, users } from "@/db/schema";
import { friendIdsOf } from "./friends";

/* ---------- Math Town online: visiting friends ----------
   A signed-in player's town is mirrored here (saveTown) so friends can see
   it. A visitor can buy from a shop in the town — the visitor pays from their
   own coins (client-side, like all town coins) and the owner's `gifts` grows
   by the same amount, collected the next time the owner opens their town.
   Visitors can also leave a sticker. */

export type TownSnapshot = { coins: number; earned: number; plots: (string | null)[] };
export type Sticker = { from: string; emoji: string; at: number };
export type FriendTown = { id: string; name: string; plots: (string | null)[]; visits: number; updatedAt: string };

const MAX_STICKERS = 20;

export async function saveTown(userId: string, state: TownSnapshot): Promise<void> {
  const db = getDb();
  const clean: TownSnapshot = {
    coins: Math.max(0, Math.floor(Number(state.coins) || 0)),
    earned: Math.max(0, Math.floor(Number(state.earned) || 0)),
    plots: Array.isArray(state.plots) ? state.plots.slice(0, 64).map((p) => (typeof p === "string" ? p.slice(0, 24) : null)) : [],
  };
  await db.insert(towns).values({ userId, state: clean }).onConflictDoUpdate({
    target: towns.userId,
    set: { state: clean, updatedAt: new Date() },
  });
}

export async function friendTowns(userId: string): Promise<FriendTown[]> {
  const ids = await friendIdsOf(userId);
  if (!ids.length) return [];
  const db = getDb();
  const rows = await db.select({ userId: towns.userId, state: towns.state, visits: towns.visits, updatedAt: towns.updatedAt, name: users.name })
    .from(towns).innerJoin(users, eq(users.id, towns.userId)).where(inArray(towns.userId, ids));
  return rows.map((r) => ({
    id: r.userId, name: (r.name || "—").slice(0, 24), plots: (r.state as TownSnapshot).plots ?? [], visits: r.visits, updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function visitTown(userId: string, ownerId: string): Promise<{ town: FriendTown; stickers: Sticker[] } | { error: string }> {
  const ids = await friendIdsOf(userId);
  if (!ids.includes(ownerId)) return { error: "Not on your friends list." };
  const db = getDb();
  await db.update(towns).set({ visits: raw`${towns.visits} + 1` }).where(eq(towns.userId, ownerId));
  const [r] = await db.select({ state: towns.state, visits: towns.visits, stickers: towns.stickers, updatedAt: towns.updatedAt, name: users.name })
    .from(towns).innerJoin(users, eq(users.id, towns.userId)).where(eq(towns.userId, ownerId)).limit(1);
  if (!r) return { error: "This friend hasn't built a town yet." };
  return {
    town: { id: ownerId, name: (r.name || "—").slice(0, 24), plots: (r.state as TownSnapshot).plots ?? [], visits: r.visits, updatedAt: r.updatedAt.toISOString() },
    stickers: (r.stickers as Sticker[]) ?? [],
  };
}

/* The visitor spent `amount` coins in the owner's shop: the owner gets it as
   a gift to collect. The owner must be a friend and the shop must exist. */
export async function buyFromTown(userId: string, ownerId: string, buildingId: string, amount: number): Promise<{ ok: true } | { error: string }> {
  const ids = await friendIdsOf(userId);
  if (!ids.includes(ownerId)) return { error: "Not on your friends list." };
  const amt = Math.floor(Number(amount) || 0);
  if (amt < 1 || amt > 50) return { error: "Bad amount." };
  const db = getDb();
  const done = await db.execute(raw`
    update towns set gifts = gifts + ${amt}::int, updated_at = now()
     where user_id = ${ownerId}::uuid
       and state->'plots' @> ${JSON.stringify([buildingId])}::jsonb
     returning user_id`);
  if (!done.rows?.length) return { error: "That shop isn't in this town." };
  return { ok: true };
}

export async function leaveSticker(userId: string, ownerId: string, emoji: string): Promise<{ ok: true } | { error: string }> {
  const ids = await friendIdsOf(userId);
  if (!ids.includes(ownerId)) return { error: "Not on your friends list." };
  const allowed = ["👍", "⭐", "❤️", "🎉", "🍣", "🏯", "😍", "🔥"];
  if (!allowed.includes(emoji)) return { error: "Bad sticker." };
  const [me] = await getDb().select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const sticker: Sticker = { from: (me?.name || "—").slice(0, 24), emoji, at: Date.now() };
  /* newest first, capped */
  await getDb().execute(raw`
    update towns
       set stickers = (select coalesce(jsonb_agg(s), '[]'::jsonb) from (
             select s from jsonb_array_elements(${JSON.stringify([sticker])}::jsonb || stickers) s limit ${MAX_STICKERS}::int) t),
           updated_at = now()
     where user_id = ${ownerId}::uuid`);
  return { ok: true };
}

/* The owner collects coins friends spent in their shops, and sees who came by. */
export async function collectGifts(userId: string): Promise<{ gifts: number; visits: number; stickers: Sticker[] }> {
  /* zero the gifts and return what they were, in one statement */
  const res = await getDb().execute(raw`
    update towns t set gifts = 0
      from (select user_id, gifts as old_gifts from towns where user_id = ${userId}::uuid) o
     where t.user_id = o.user_id
     returning o.old_gifts, t.visits, t.stickers`);
  const r = res.rows?.[0] as { old_gifts: number; visits: number; stickers: Sticker[] } | undefined;
  if (!r) return { gifts: 0, visits: 0, stickers: [] };
  return { gifts: Number(r.old_gifts) || 0, visits: Number(r.visits) || 0, stickers: r.stickers ?? [] };
}
