import "server-only";
import { eq, lt, and, sql as raw } from "drizzle-orm";
import { getDb } from "@/db";
import { raceRooms, users } from "@/db/schema";
import { roomCode, normaliseRoomCode } from "./ttt";
import { raceQuestion, RACE_GOAL, RACE_ROOM_MAX } from "./minigames";

/* Online Math Race: 2–4 friends in one room, same sums, first to RACE_GOAL.

   The host makes the room and shares the 4-letter code; friends join while it
   is in the lobby. The host presses start, which stamps a start time a few
   seconds ahead so every phone counts down to the same moment. Each right
   answer is sent here and checked against the room's seeded sequence before
   the racer moves — the client cannot just claim it finished. */

const COUNTDOWN_MS = 3500;
/* A race nobody finishes (everyone left) closes itself after this. */
const RACE_TIMEOUT_MS = 180_000;

type Player = { name: string; done: number; finishMs: number | null; joinedAt: number };
type State = { seed: number; startAt: number | null; round: number; players: Record<string, Player> };
type Row = typeof raceRooms.$inferSelect;

export type RaceStatus = "lobby" | "countdown" | "racing" | "done";
export type RaceRoomView = {
  code: string;
  status: RaceStatus;
  isHost: boolean;
  inRoom: boolean;
  now: number;              /* server clock, so the client can line its countdown up */
  startAt: number | null;
  seed: number;
  round: number;
  goal: number;
  players: { key: string; name: string; done: number; finishMs: number | null; me: boolean; host: boolean }[];
};

function statusOf(st: State, now: number): RaceStatus {
  if (st.startAt === null) return "lobby";
  if (now < st.startAt) return "countdown";
  const ps = Object.values(st.players);
  if (ps.length && ps.every((p) => p.finishMs !== null)) return "done";
  if (now > st.startAt + RACE_TIMEOUT_MS) return "done";
  return "racing";
}

function view(row: Row, userId: string): RaceRoomView {
  const st = row.state as State;
  const now = Date.now();
  const players = Object.entries(st.players)
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt)
    .map(([id, p], i) => ({ key: `p${i}`, name: p.name, done: p.done, finishMs: p.finishMs, me: id === userId, host: id === row.hostId }));
  return {
    code: row.code, status: statusOf(st, now), isHost: row.hostId === userId, inRoom: userId in st.players,
    now, startAt: st.startAt, seed: st.seed, round: st.round, goal: RACE_GOAL, players,
  };
}

async function nameOf(id: string) {
  const r = await getDb().select({ name: users.name }).from(users).where(eq(users.id, id)).limit(1);
  return (r[0]?.name || "—").slice(0, 24);
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

async function load(code: string): Promise<Row | null> {
  const [row] = await getDb().select().from(raceRooms).where(eq(raceRooms.code, normaliseRoomCode(code))).limit(1);
  return row ?? null;
}

export async function createRaceRoom(userId: string): Promise<RaceRoomView> {
  const db = getDb();
  /* Sweep rooms older than a day so the table never grows. */
  await db.delete(raceRooms).where(lt(raceRooms.createdAt, new Date(Date.now() - 86400_000)));
  const me: Player = { name: await nameOf(userId), done: 0, finishMs: null, joinedAt: Date.now() };
  for (let tries = 0; tries < 10; tries++) {
    const code = roomCode();
    try {
      const state: State = { seed: newSeed(), startAt: null, round: 0, players: { [userId]: me } };
      const [row] = await db.insert(raceRooms).values({ code, hostId: userId, state }).returning();
      return view(row, userId);
    } catch { /* code collision: try another */ }
  }
  throw new Error("Could not make a room.");
}

export async function joinRaceRoom(userId: string, rawCode: string): Promise<RaceRoomView | { error: string }> {
  const code = normaliseRoomCode(rawCode);
  if (code.length !== 4) return { error: "That code doesn't look right." };
  const row = await load(code);
  if (!row) return { error: "No room with that code." };
  const st = row.state as State;
  if (userId in st.players) return view(row, userId);
  if (st.startAt !== null) return { error: "That race has already started." };
  if (Object.keys(st.players).length >= RACE_ROOM_MAX) return { error: "That room is full." };
  const me: Player = { name: await nameOf(userId), done: 0, finishMs: null, joinedAt: Date.now() };
  /* One statement, re-checking lobby and room size, so two friends joining
     at once cannot push it past the limit or miss each other. */
  const res = await getDb().execute(raw`
    update race_rooms
       set state = jsonb_set(state, array['players', ${userId}::text], ${JSON.stringify(me)}::text::jsonb),
           updated_at = now()
     where code = ${code}::text
       and state->'startAt' = 'null'::jsonb
       and (select count(*) from jsonb_object_keys(state->'players')) < ${RACE_ROOM_MAX}::int
     returning code`);
  if (!res.rows?.length) return { error: "Could not join — the race may have started." };
  const fresh = await load(code);
  return fresh ? view(fresh, userId) : { error: "No room with that code." };
}

export async function getRaceRoom(userId: string, code: string): Promise<RaceRoomView | null> {
  const row = await load(code);
  return row ? view(row, userId) : null;
}

/* Host only: start from the lobby, or run it back once a race is over.
   Everyone's progress resets and a new seed gives new sums. */
export async function startRaceRoom(userId: string, code: string): Promise<RaceRoomView | { error: string }> {
  const row = await load(code);
  if (!row) return { error: "No such room." };
  if (row.hostId !== userId) return { error: "Only the host can start." };
  const st = row.state as State;
  const status = statusOf(st, Date.now());
  if (status === "countdown" || status === "racing") return { error: "The race is on." };
  if (Object.keys(st.players).length < 2) return { error: "Wait for a friend to join." };
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(st.players)) players[id] = { ...p, done: 0, finishMs: null };
  const next: State = { seed: newSeed(), startAt: Date.now() + COUNTDOWN_MS, round: st.round + 1, players };
  const [saved] = await getDb().update(raceRooms).set({ state: next, updatedAt: new Date() })
    .where(and(eq(raceRooms.code, row.code), eq(raceRooms.hostId, userId))).returning();
  return view(saved, userId);
}

/* One right answer = one step. The answer is checked against the room's own
   sequence, and the write only lands if the racer is still on that question
   in that round — a double tap or a stale round cannot count twice. */
export async function answerRaceRoom(userId: string, code: string, idx: number, answer: number): Promise<RaceRoomView | { error: string }> {
  const row = await load(code);
  if (!row) return { error: "No such room." };
  const st = row.state as State;
  const me = st.players[userId];
  if (!me) return { error: "Not in this race." };
  const now = Date.now();
  if (statusOf(st, now) !== "racing") return view(row, userId);
  if (me.done !== idx || idx >= RACE_GOAL) return view(row, userId);
  if (raceQuestion(st.seed, idx).answer !== answer) return { error: "wrong" };
  const done = idx + 1;
  const finish = done >= RACE_GOAL ? now - (st.startAt ?? now) : null;
  await getDb().execute(raw`
    update race_rooms
       set state = jsonb_set(
             jsonb_set(state, array['players', ${userId}::text, 'done'], to_jsonb(${done}::int)),
             array['players', ${userId}::text, 'finishMs'], ${JSON.stringify(finish)}::text::jsonb),
           updated_at = now()
     where code = ${row.code}::text
       and (state->>'round')::int = ${st.round}::int
       and (state->'players'->(${userId}::text)->>'done')::int = ${idx}::int`);
  const fresh = await load(row.code);
  return fresh ? view(fresh, userId) : { error: "No such room." };
}
