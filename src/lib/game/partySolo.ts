/* ---------- party games, solo: the same rules against the computer ----------
   Runs entirely on the phone (works for guests and offline). The state is the
   same PartyState an online room keeps, so party.ts decides wins and losses
   and the same screen draws it; only the other players are computer ones:

     🪢 Tug of War   you (red) against a CPU team that pulls at a steady pace
     🔔 Buzzer Quiz  you against three CPU contestants who buzz in after a
                     few seconds — and sometimes get it wrong
     🐉 Boss Battle  you alone against a smaller dragon (party.ts bossHp(1))

   `level` sets how quick the computer is. */
import {
  PARTY_COUNTDOWN_MS, BUZZ_QS, BUZZ_Q_MS, BUZZ_GAP_MS, BOSS_WAVE_MS,
  partyQuestion, buzzQuestion, partyStatus, type PartyGame, type PartyPlayer, type PartyState,
} from "./party";

export type SoloLevel = 0 | 1 | 2;
export const SOLO_LEVELS: { id: SoloLevel; en: string; ja: string; icon: string }[] = [
  { id: 0, en: "Easy", ja: "やさしい", icon: "🐢" },
  { id: 1, en: "Normal", ja: "ふつう", icon: "🐰" },
  { id: 2, en: "Strong", ja: "つよい", icon: "🐆" },
];
export const SOLO_ME = "me";

/* ms per answer for a CPU tug team, and how soon a CPU buzzes in */
const TUG_PACE = [4300, 3200, 2400];
const BUZZ_BASE = [7000, 5000, 3600];
const CPU_NAMES: [string, string][] = [["Ray", "レイ"], ["Mimi", "ミミ"], ["Taro", "タロウ"]];

/* a small deterministic hash so a CPU's timing is fixed for a given question */
const hash = (a: number, b: number, c: number) => {
  let h = (a ^ Math.imul(b + 1, 2654435761) ^ Math.imul(c + 7, 1597334677)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};

export function soloStart(game: PartyGame, ja: boolean, myName: string, round: number, now: number): PartyState {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const startAt = now + PARTY_COUNTDOWN_MS;
  const p = (name: string, team: 0 | 1, i: number): PartyPlayer => ({ name, joinedAt: i, slot: 1000 + i * 37, team, done: 0 });
  const players: Record<string, PartyPlayer> = { [SOLO_ME]: p(myName, 0, 0) };
  const cpus = game === "tug" ? 1 : game === "buzz" ? 3 : 0;
  for (let i = 0; i < cpus; i++) players[`cpu:${i}`] = p(CPU_NAMES[i][ja ? 1 : 0], 1, i + 1);
  return { game, seed, startAt, round, players, q: 0, qAt: startAt, wins: [], waves: {} };
}

/* my answer: the same checks the server makes */
export function soloAnswer(st: PartyState, now: number, idx: number, answer: number): PartyState | "wrong" {
  if (partyStatus(st, now) !== "playing") return st;
  const me = st.players[SOLO_ME];
  if (st.game === "buzz") {
    if (idx !== st.q || now < st.qAt) return st;
    if (buzzQuestion(st.seed, idx).answer !== answer) return "wrong";
    return { ...st, wins: [...st.wins.slice(0, idx), SOLO_ME], q: idx + 1, qAt: now + BUZZ_GAP_MS };
  }
  if (me.done !== idx) return st;
  if (partyQuestion(st.seed, me.slot, idx).answer !== answer) return "wrong";
  const players = { ...st.players, [SOLO_ME]: { ...me, done: idx + 1 } };
  if (st.game === "boss") {
    const w = String(Math.floor((now - (st.startAt ?? now)) / BOSS_WAVE_MS));
    return { ...st, players, waves: { ...st.waves, [w]: (st.waves[w] ?? 0) + 1 } };
  }
  return { ...st, players };
}

/* the computer's turn: called a few times a second */
export function soloTick(st: PartyState, now: number, level: SoloLevel): PartyState {
  if (partyStatus(st, now) !== "playing" || st.startAt === null) return st;
  const t = now - st.startAt;

  if (st.game === "tug") {
    /* each CPU pulls at its pace, a little uneven so it feels human */
    let players = st.players;
    for (const [id, p] of Object.entries(st.players)) {
      if (!id.startsWith("cpu:")) continue;
      const pace = TUG_PACE[level] * (0.9 + (hash(st.seed, p.slot, 0) % 20) / 100);
      const done = Math.floor(t / pace);
      if (done > p.done) players = { ...players, [id]: { ...p, done } };
    }
    return players === st.players ? st : { ...st, players };
  }

  if (st.game === "buzz") {
    if (st.q >= BUZZ_QS || now < st.qAt) return st;
    /* the first CPU whose moment has come — and who gets it right — takes it */
    let first: { id: string; at: number } | null = null;
    Object.keys(st.players).filter((id) => id.startsWith("cpu:")).forEach((id, i) => {
      const h = hash(st.seed, st.q, i);
      if (h % 5 === 0) return;                                    /* this one doesn't know it */
      const at = st.qAt + BUZZ_BASE[level] + (h % 3500);
      if (now >= at && (!first || at < first.at)) first = { id, at };
    });
    if (first) {
      const f = first as { id: string; at: number };
      return { ...st, wins: [...st.wins.slice(0, st.q), f.id], q: st.q + 1, qAt: now + BUZZ_GAP_MS };
    }
    /* nobody got it in time */
    if (now >= st.qAt + BUZZ_Q_MS) return { ...st, wins: [...st.wins.slice(0, st.q), null], q: st.q + 1, qAt: now + BUZZ_GAP_MS };
  }
  return st;
}
