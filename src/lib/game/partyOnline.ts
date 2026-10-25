import "server-only";
import { eq, lt, and, sql as raw } from "drizzle-orm";
import { getDb } from "@/db";
import { partyRooms, users } from "@/db/schema";
import { roomCode, normaliseRoomCode } from "./ttt";
import {
  PARTY_GAMES, PARTY_ROOM_MAX, PARTY_COUNTDOWN_MS, BUZZ_QS, BUZZ_Q_MS, BUZZ_GAP_MS, BOSS_WAVE_MS,
  partyQuestion, buzzQuestion, partyStatus, buildPartyView,
  type PartyGame, type PartyPlayer, type PartyState, type PartyView,
} from "./party";

/* Party rooms (Tug of War, Buzzer Quiz, Boss Battle) — the rules are in
   party.ts; this file stores them. Same shape as the online race: the host
   makes a room and shares the code, friends join in the lobby, the host
   starts with a few seconds' countdown, and every answer is checked here
   against the seeded sums before it counts. */

type Row = typeof partyRooms.$inferSelect;

export type PartyRoomView = PartyView;

function view(row: Row, userId: string): PartyRoomView {
  return buildPartyView(row.state as PartyState, { code: row.code, hostId: row.hostId, viewerId: userId, now: Date.now() });
}

async function nameOf(id: string) {
  const r = await getDb().select({ name: users.name, username: users.username }).from(users).where(eq(users.id, id)).limit(1);
  return (r[0]?.username || r[0]?.name || "—").slice(0, 24);
}
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const newSlot = () => Math.floor(Math.random() * 1_000_000);

async function load(code: string): Promise<Row | null> {
  const [row] = await getDb().select().from(partyRooms).where(eq(partyRooms.code, normaliseRoomCode(code))).limit(1);
  return row ?? null;
}

/* The buzzer moves on by itself when nobody gets a question in time. Done on
   read, guarded on the question number so two pollers cannot skip twice. */
async function settle(row: Row): Promise<Row> {
  const st = row.state as PartyState;
  if (st.game !== "buzz" || st.startAt === null || st.q >= BUZZ_QS) return row;
  const now = Date.now();
  if (now < st.qAt + BUZZ_Q_MS) return row;
  const next: PartyState = { ...st, wins: [...st.wins.slice(0, st.q), null], q: st.q + 1, qAt: now + BUZZ_GAP_MS };
  const done = await getDb().execute(raw`
    update party_rooms set state = ${JSON.stringify(next)}::text::jsonb, updated_at = now()
     where code = ${row.code}::text and (state->>'q')::int = ${st.q}::int and (state->>'round')::int = ${st.round}::int
     returning code`);
  return done.rows?.length ? { ...row, state: next } : ((await load(row.code)) ?? row);
}

export async function createPartyRoom(userId: string, game: PartyGame): Promise<PartyRoomView> {
  if (!PARTY_GAMES.includes(game)) game = "tug";
  const db = getDb();
  await db.delete(partyRooms).where(lt(partyRooms.createdAt, new Date(Date.now() - 86400_000)));
  const me: PartyPlayer = { name: await nameOf(userId), joinedAt: Date.now(), slot: newSlot(), team: 0, done: 0 };
  for (let tries = 0; tries < 10; tries++) {
    const code = roomCode();
    try {
      const state: PartyState = { game, seed: newSeed(), startAt: null, round: 0, players: { [userId]: me }, q: 0, qAt: 0, wins: [], waves: {} };
      const [row] = await db.insert(partyRooms).values({ code, hostId: userId, state }).returning();
      return view(row, userId);
    } catch { /* code collision: try another */ }
  }
  throw new Error("Could not make a room.");
}

export async function joinPartyRoom(userId: string, rawCode: string): Promise<PartyRoomView | { error: string }> {
  const code = normaliseRoomCode(rawCode);
  if (code.length !== 4) return { error: "That code doesn't look right." };
  const row = await load(code);
  if (!row) return { error: "No room with that code." };
  const st = row.state as PartyState;
  if (userId in st.players) return view(row, userId);
  if (st.startAt !== null && partyStatus(st, Date.now()) !== "done") return { error: "That game has already started." };
  if (Object.keys(st.players).length >= PARTY_ROOM_MAX) return { error: "That room is full." };
  /* the smaller team (the host re-balances at start anyway) */
  const reds = Object.values(st.players).filter((p) => p.team === 0).length;
  const team: 0 | 1 = reds <= Object.keys(st.players).length - reds ? 0 : 1;
  const me: PartyPlayer = { name: await nameOf(userId), joinedAt: Date.now(), slot: newSlot(), team, done: 0 };
  const res = await getDb().execute(raw`
    update party_rooms
       set state = jsonb_set(state, array['players', ${userId}::text], ${JSON.stringify(me)}::text::jsonb),
           updated_at = now()
     where code = ${code}::text
       and (select count(*) from jsonb_object_keys(state->'players')) < ${PARTY_ROOM_MAX}::int
     returning code`);
  if (!res.rows?.length) return { error: "That room is full." };
  const fresh = await load(code);
  return fresh ? view(fresh, userId) : { error: "No room with that code." };
}

export async function getPartyRoom(userId: string, code: string): Promise<PartyRoomView | null> {
  const row = await load(code);
  return row ? view(await settle(row), userId) : null;
}

/* Host only: start from the lobby, or play again when a game is over. Scores
   reset, a new seed gives new sums, and Tug of War teams are re-dealt
   alternately in join order so they are always even. */
export async function startPartyRoom(userId: string, code: string): Promise<PartyRoomView | { error: string }> {
  const row = await load(code);
  if (!row) return { error: "No such room." };
  if (row.hostId !== userId) return { error: "Only the host can start." };
  const st = row.state as PartyState;
  const status = partyStatus(st, Date.now());
  if (status === "countdown" || status === "playing") return { error: "The game is on." };
  if (Object.keys(st.players).length < 2) return { error: "Wait for a friend to join." };
  const players: Record<string, PartyPlayer> = {};
  Object.entries(st.players).sort((a, b) => a[1].joinedAt - b[1].joinedAt)
    .forEach(([id, p], i) => { players[id] = { ...p, done: 0, team: (i % 2) as 0 | 1 }; });
  const startAt = Date.now() + PARTY_COUNTDOWN_MS;
  const next: PartyState = { ...st, seed: newSeed(), startAt, round: st.round + 1, players, q: 0, qAt: startAt, wins: [], waves: {} };
  const [saved] = await getDb().update(partyRooms).set({ state: next, updatedAt: new Date() })
    .where(and(eq(partyRooms.code, row.code), eq(partyRooms.hostId, userId))).returning();
  return view(saved, userId);
}

/* One answer. Tug / Boss: your own next sum (idx = how many you've done) —
   the write lands only if you are still on it, so a double tap counts once.
   Buzzer: idx is the question number; the first right answer takes it. */
export async function answerPartyRoom(userId: string, code: string, idx: number, answer: number): Promise<PartyRoomView | { error: string }> {
  const found = await load(code);
  if (!found) return { error: "No such room." };
  const row = await settle(found);
  const st = row.state as PartyState;
  const me = st.players[userId];
  if (!me) return { error: "Not in this game." };
  const now = Date.now();
  if (partyStatus(st, now) !== "playing") return view(row, userId);
  const db = getDb();

  if (st.game === "buzz") {
    if (idx !== st.q || now < st.qAt) return view(row, userId);
    if (buzzQuestion(st.seed, idx).answer !== answer) return { error: "wrong" };
    await db.execute(raw`
      update party_rooms
         set state = jsonb_set(jsonb_set(jsonb_set(state,
               array['wins', ${String(idx)}::text], to_jsonb(${userId}::text), true),
               '{q}', to_jsonb(${idx + 1}::int)),
               '{qAt}', to_jsonb(${now + BUZZ_GAP_MS}::bigint)),
             updated_at = now()
       where code = ${row.code}::text and (state->>'q')::int = ${idx}::int and (state->>'round')::int = ${st.round}::int`);
  } else {
    if (me.done !== idx) return view(row, userId);
    if (partyQuestion(st.seed, me.slot, idx).answer !== answer) return { error: "wrong" };
    const wave = String(Math.floor((now - (st.startAt ?? now)) / BOSS_WAVE_MS));
    await db.execute(st.game === "boss" ? raw`
      update party_rooms
         set state = jsonb_set(jsonb_set(state,
               array['players', ${userId}::text, 'done'], to_jsonb(${idx + 1}::int)),
               array['waves', ${wave}::text], to_jsonb(coalesce((state->'waves'->>${wave}::text)::int, 0) + 1)),
             updated_at = now()
       where code = ${row.code}::text and (state->>'round')::int = ${st.round}::int
         and (state->'players'->(${userId}::text)->>'done')::int = ${idx}::int` : raw`
      update party_rooms
         set state = jsonb_set(state, array['players', ${userId}::text, 'done'], to_jsonb(${idx + 1}::int)),
             updated_at = now()
       where code = ${row.code}::text and (state->>'round')::int = ${st.round}::int
         and (state->'players'->(${userId}::text)->>'done')::int = ${idx}::int`);
  }
  const fresh = await load(row.code);
  return fresh ? view(fresh, userId) : { error: "No such room." };
}
