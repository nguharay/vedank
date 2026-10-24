import "server-only";
import { and, eq, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { tttRooms, users } from "@/db/schema";
import { newGame, play, pass, expired, roomCode, normaliseRoomCode, type TTTState, type Mark, type TTTLevel } from "./ttt";

type Row = typeof tttRooms.$inferSelect;

/* The clock only counts once both players are in. If the side on turn has
   overrun, pass the turn and persist — guarded on updatedAt so two pollers
   settling the same overrun cannot pass it twice. */
async function settle(row: Row): Promise<Row> {
  const state = row.state as TTTState;
  if (!row.guestId || !expired(state)) return row;
  const next = pass(state);
  const now = new Date();
  const done = await getDb().update(tttRooms).set({ state: next, updatedAt: now })
    .where(and(eq(tttRooms.code, row.code), eq(tttRooms.updatedAt, row.updatedAt))).returning({ code: tttRooms.code });
  return done.length ? { ...row, state: next, updatedAt: now } : row;
}

/* The host is always X and moves first in round 0; the starter alternates
   each rematch so neither side gets the first move twice running. */
export type RoomView = {
  code: string;
  state: TTTState;
  you: Mark | null;                 /* null = spectator, which is not a role we offer but is what a stale link gets */
  hostName: string;
  guestName: string | null;
  round: number;
  rev: number;                      /* updatedAt in ms: the client drops any reply older than what it shows */
  now: number;                      /* server clock, so both phones count the turn down to the same moment */
};

async function nameOf(id: string | null) {
  if (!id) return null;
  const r = await getDb().select({ name: users.name }).from(users).where(eq(users.id, id)).limit(1);
  return r[0]?.name ?? "—";
}

function view(row: typeof tttRooms.$inferSelect, userId: string, hostName: string, guestName: string | null): RoomView {
  const you: Mark | null = row.hostId === userId ? "X" : row.guestId === userId ? "O" : null;
  return { code: row.code, state: row.state as TTTState, you, hostName, guestName, round: row.round, rev: row.updatedAt.getTime(), now: Date.now() };
}

export async function createRoom(userId: string, level: TTTLevel = 2): Promise<RoomView> {
  const db = getDb();
  /* Sweep rooms older than a day so the table never grows. */
  await db.delete(tttRooms).where(lt(tttRooms.createdAt, new Date(Date.now() - 86400_000)));
  for (let tries = 0; tries < 10; tries++) {
    const code = roomCode();
    try {
      const [row] = await db.insert(tttRooms).values({ code, hostId: userId, state: newGame("X", level) }).returning();
      return view(row, userId, (await nameOf(userId)) ?? "", null);
    } catch { /* code collision: try another */ }
  }
  throw new Error("Could not make a room.");
}

export async function joinRoom(userId: string, raw: string): Promise<RoomView | { error: string }> {
  const code = normaliseRoomCode(raw);
  if (code.length !== 4) return { error: "That code doesn't look right." };
  const db = getDb();
  const [row] = await db.select().from(tttRooms).where(eq(tttRooms.code, code)).limit(1);
  if (!row) return { error: "No room with that code." };
  if (row.hostId !== userId && row.guestId && row.guestId !== userId) return { error: "That room is full." };
  if (row.hostId !== userId && !row.guestId) {
    /* Clock starts now, not when the host made the room. */
    const state = { ...(row.state as TTTState), turnAt: Date.now() };
    const at = new Date();
    await db.update(tttRooms).set({ guestId: userId, state, updatedAt: at }).where(eq(tttRooms.code, code));
    row.guestId = userId; row.state = state; row.updatedAt = at;
  }
  return view(row, userId, (await nameOf(row.hostId)) ?? "", await nameOf(row.guestId));
}

export async function getRoom(userId: string, code: string): Promise<RoomView | null> {
  const [found] = await getDb().select().from(tttRooms).where(eq(tttRooms.code, normaliseRoomCode(code))).limit(1);
  if (!found) return null;
  const row = await settle(found);
  return view(row, userId, (await nameOf(row.hostId)) ?? "", await nameOf(row.guestId));
}

/* The only way a square changes hands. Validated here: it must be your room,
   your turn, and the square must be open — play() enforces the last two. */
export async function moveRoom(userId: string, code: string, i: number, chosen: number): Promise<RoomView | { error: string }> {
  const db = getDb();
  const [found] = await db.select().from(tttRooms).where(eq(tttRooms.code, normaliseRoomCode(code))).limit(1);
  if (!found) return { error: "No such room." };
  const row = await settle(found);
  const you: Mark | null = row.hostId === userId ? "X" : row.guestId === userId ? "O" : null;
  const state = row.state as TTTState;
  if (!you) return { error: "Not your room." };
  if (!row.guestId) return { error: "Waiting for an opponent." };
  if (state.turn !== you) return { error: row !== found ? "Time's up — the turn passed." : "Not your turn." };
  const next = play(state, Number(i), Number(chosen));
  if (next === state) return { error: "That square is taken." };
  /* Only lands on the board this move was made against: if the turn timed
     out (or anything else changed) in between, nothing is written and the
     player gets the board as it really is. */
  const at = new Date();
  const ok = await db.update(tttRooms).set({ state: next, updatedAt: at })
    .where(and(eq(tttRooms.code, row.code), eq(tttRooms.updatedAt, row.updatedAt), or(eq(tttRooms.hostId, userId), eq(tttRooms.guestId, userId))))
    .returning({ code: tttRooms.code });
  if (!ok.length) return { error: "Time's up — the turn passed." };
  return view({ ...row, state: next, updatedAt: at }, userId, (await nameOf(row.hostId)) ?? "", await nameOf(row.guestId));
}

export async function rematchRoom(userId: string, code: string): Promise<RoomView | { error: string }> {
  const db = getDb();
  const [row] = await db.select().from(tttRooms).where(eq(tttRooms.code, normaliseRoomCode(code))).limit(1);
  if (!row) return { error: "No such room." };
  if (row.hostId !== userId && row.guestId !== userId) return { error: "Not your room." };
  const state = row.state as TTTState;
  if (!state.winner) return { error: "The game is still on." };
  const round = row.round + 1;
  const fresh = newGame(round % 2 === 0 ? "X" : "O", state.level);
  /* Both players can press rematch at once: only the first press makes the
     new board; the second just gets that same board back. */
  const at = new Date();
  const ok = await db.update(tttRooms).set({ state: fresh, round, updatedAt: at })
    .where(and(eq(tttRooms.code, row.code), eq(tttRooms.round, row.round))).returning({ code: tttRooms.code });
  if (!ok.length) {
    const [now] = await db.select().from(tttRooms).where(eq(tttRooms.code, row.code)).limit(1);
    return now ? view(now, userId, (await nameOf(now.hostId)) ?? "", await nameOf(now.guestId)) : { error: "No such room." };
  }
  return view({ ...row, state: fresh, round, updatedAt: at }, userId, (await nameOf(row.hostId)) ?? "", await nameOf(row.guestId));
}
