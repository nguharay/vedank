"use client";

import { useEffect, useRef, useState } from "react";
import type { ChoiceRound } from "@/lib/game/minigames";
import { SITE_URL } from "@/lib/site";
import { fmt, haptic } from "../util";
import { Person } from "../Person";
import { Mascot } from "../Mascot";
import type { useSound } from "../useSound";
import { Answers } from "./RunGames";
import { PlanetArt, planetFor } from "./SpaceBlaster";
import { track } from "@/lib/analytics";
import {
  partyCreateAction, partyJoinAction, partyRoomAction, partyStartAction, partyAnswerAction, partySwitchAction,
} from "@/lib/actions/game-actions";
import {
  PARTY_NAMES, PARTY_GAMES, PARTY_ROOM_MAX, RACE_GOAL, isRaceGame, myPartyQuestion, TUG_WIN, BUZZ_QS, BUZZ_Q_MS, BINGO_CALLS, BINGO_CALL_MS, BINGO_LINES,
  bingoCalls, marksOf,
  buzzQuestion, buildPartyView, joinErrorText, roomLink, type PartyGame, type PartyState, type PartyView as PartyRoomView,
} from "@/lib/game/party";
import { soloStart, soloAnswer, soloTick, SOLO_LEVELS, SOLO_ME, type SoloLevel } from "@/lib/game/partySolo";

/* ---------- party games: Tug of War, Buzzer Quiz, Math Bingo, Space Blaster, River Hop ----------
   One screen for all five. The room part (make / join by code / share /
   host starts / play again) is shared; the middle is drawn per game. Like
   the online race the room is polled once a second and the clock is lined
   up with the server's, so a countdown ends at the same moment on every
   phone. Your own answers count on screen at once; the server confirms.
   Solo ("🤖 ひとりで") plays the same rules on the phone against computer
   players (partySolo.ts) — no account or connection needed. */

type Sound = ReturnType<typeof useSound>;
type L = "en" | "ja";

/* the device clock, read only from handlers and timers (never while drawing) */
const clock = () => Date.now();

const TEAM: [[string, string], [string, string]] = [["Red", "あかぐみ"], ["White", "しろぐみ"]];

/* ---- personal records, kept on the phone (solo and online alike) ----
   tug: wins · buzz: best score out of BUZZ_QS · bingo: fewest calls to a BINGO ·
   the races: fastest win, in seconds */
type Record_ = { plays: number; wins: number; best: number };
const recKey = (g: PartyGame) => `sutraSprint.party.${g}`;
function readRec(g: PartyGame): Record_ {
  try { return { plays: 0, wins: 0, best: 0, ...JSON.parse(localStorage.getItem(recKey(g)) || "{}") }; } catch { return { plays: 0, wins: 0, best: 0 }; }
}
/* returns true when this game set a new best */
function saveRec(g: PartyGame, won: boolean, value: number): boolean {
  const r = readRec(g);
  const better = g === "bingo" || isRaceGame(g) ? won && value > 0 && (r.best === 0 || value < r.best) : g === "buzz" ? value > r.best : false;
  const next: Record_ = { plays: r.plays + 1, wins: r.wins + (won ? 1 : 0), best: better ? value : r.best };
  try { localStorage.setItem(recKey(g), JSON.stringify(next)); } catch {}
  return better;
}
function recChip(g: PartyGame, r: Record_, ja: boolean): string | null {
  if (!r.plays) return null;
  if (g === "tug") return ja ? `🏆 ${r.wins}勝 / ${r.plays}回` : `🏆 ${r.wins} won of ${r.plays}`;
  if (g === "buzz") return ja ? `⭐ ベスト ${r.best}/${BUZZ_QS}` : `⭐ Best ${r.best}/${BUZZ_QS}`;
  if (isRaceGame(g)) return r.best ? (ja ? `🏁 ${r.wins}勝・最速 ${r.best}秒` : `🏁 ${r.wins} wins · fastest ${r.best}s`) : (ja ? `🏁 ${r.wins}勝 / ${r.plays}回` : `🏁 ${r.wins} won of ${r.plays}`);
  return r.best ? (ja ? `🎯 ${r.wins}勝・最速 ${r.best}問` : `🎯 ${r.wins} wins · fastest ${r.best} calls`) : (ja ? `🎯 ${r.plays}回挑戦` : `🎯 ${r.plays} tries`);
}

const allRecs = () => Object.fromEntries(PARTY_GAMES.map((g) => [g, readRec(g)])) as Record<PartyGame, Record_>;

export function PartyGames({ lang, sound, celebrate, game: initialGame, joinCode, onJoined, onBack, onCorrect, guest, onNeedAccount }: {
  lang: L; sound: Sound; celebrate: () => void; game: PartyGame; joinCode: string | null; onJoined: () => void; onBack: () => void;
  onCorrect?: (n: number) => void; guest: boolean; onNeedAccount: () => void;
}) {
  const ja = lang === "ja";
  const [room, setRoom] = useState<PartyRoomView | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myDone, setMyDone] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [now, setNow] = useState(0);
  const [fx, setFx] = useState<{ k: number; kind: "hit" | "fire" | "pull" } | null>(null);
  /* the finish stays on the field for a moment (the pull over the line, the
     dragon falling) before the results panel takes over */
  const [resultsFor, setResultsFor] = useState(-1);
  /* buzzer: who answered first when I was a moment too late */
  const [taken, setTaken] = useState<string | null>(null);
  const lastQ = useRef(-1);
  const lastCount = useRef(0);
  const offset = useRef(0);
  const round = useRef(-1);
  const roomRef = useRef("");
  const celebrated = useRef(-1);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHearts = useRef(0);
  /* solo: the game state lives here instead of on the server */
  const [solo, setSolo] = useState(false);
  const [level, setLevel] = useState<SoloLevel>(1);
  const soloRef = useRef<PartyState | null>(null);
  const [recs, setRecs] = useState<Record<PartyGame, Record_> | null>(null);
  const [newBest, setNewBest] = useState(false);
  useEffect(() => {
    const t0 = setTimeout(() => setRecs(allRecs()), 0);
    return () => clearTimeout(t0);
  }, [room?.round, solo]);
  const soloView = (st: PartyState) => buildPartyView(st, { code: "SOLO", hostId: SOLO_ME, viewerId: SOLO_ME, now: clock() });
  const game: PartyGame = room?.game ?? initialGame;
  const [icon, nameEn, nameJa] = PARTY_NAMES[game];

  function take(v: PartyRoomView) {
    offset.current = v.now - clock();
    /* a new round — or a different room — starts my count from zero */
    if (v.round !== round.current || v.code !== roomRef.current) {
      if (v.code !== roomRef.current) lastCount.current = 0;
      round.current = v.round;
      roomRef.current = v.code;
      lastHearts.current = 0;
      setMyDone(0); setPicked(null); setLock(false);
    }
    const mine = v.players.find((p) => p.me);
    if (mine && v.game === "bingo") setMyDone((d) => d | mine.done);
    else if (mine && v.game !== "buzz") setMyDone((d) => Math.max(d, mine.done));
    /* host: a friend just joined — say so, so the host knows to press Start */
    if (v.isHost && v.status === "lobby" && roomRef.current === v.code && v.players.length > lastCount.current && lastCount.current > 0) {
      const newest = v.players[v.players.length - 1];
      sound.correct(); haptic(15);
      setNote(ja ? `🎉 ${newest.name} が参加したよ！スタートできるよ` : `🎉 ${newest.name} joined! You can start`);
    }
    lastCount.current = v.players.length;
    /* buzzer: a new question unlocks everyone */
    if (v.buzz && v.buzz.q !== lastQ.current) {
      lastQ.current = v.buzz.q;
      setLock(false); setTaken(null); setPicked(null);
    }
    setRoom(v);
  }

  /* solo rounds keep counting up across games, so each new game is a new round */
  const soloRound = useRef(0);
  function playSolo(g: PartyGame) {
    soloRound.current = Math.max(soloRound.current, round.current) + 1;
    const st = soloStart(g, ja, ja ? "きみ" : "You", soloRound.current, clock(), level);
    soloRef.current = st;
    lastHearts.current = 0;
    setMyDone(0); setPicked(null); setLock(false);
    setSolo(true); setNote(null);
    take(soloView(st));
    track("party_solo", { game: g, level });
  }
  async function create(g: PartyGame) {
    if (guest) { onNeedAccount(); return; }
    setBusy(true); setNote(null);
    try { const r = await partyCreateAction(g); setSolo(false); soloRef.current = null; take(r); track("party_create", { game: g }); } catch { setNote(ja ? "部屋を作れませんでした" : "Could not make a room"); }
    setBusy(false);
  }
  async function join(c: string) {
    if (guest) { onNeedAccount(); return; }
    setBusy(true); setNote(null);
    try {
      const res = await partyJoinAction(c);
      if ("error" in res && res.redirect && res.redirect !== "party") { window.location.assign(roomLink(res.redirect, c)); return; }
      if ("error" in res) { setNote(joinErrorText(res.error, ja)); track("party_join_fail", { detail: res.error }); }
      else {
        setSolo(false); soloRef.current = null; take(res); track("party_join", { game: res.game, detail: res.isHost ? "own-room" : "" });
        /* the same account on a second phone just lands back in its own room */
        if (res.isHost) setNote(ja ? "これはきみが作った部屋だよ。友だちは自分のアカウントでこのコードを入力してね。" : "This is your own room. Friends join with their own account and this code.");
      }
    } catch (e) { setNote(ja ? "参加できませんでした。通信をたしかめて、もう一度ためしてね。" : "Could not join. Check your connection and try again."); track("party_join_fail", { detail: String(e).slice(0, 80) }); }
    setBusy(false);
  }
  /* host: same room, same code, another game */
  async function switchGame(g: PartyGame) {
    if (!room || g === room.game && room.status === "lobby") return;
    if (solo) { playSolo(g); return; }
    setBusy(true);
    try { const res = await partySwitchAction(room.code, g); if ("error" in res) setNote(res.error); else { setNote(null); take(res); track("party_switch", { game: g }); } } catch {}
    setBusy(false);
  }
  async function start() {
    if (!room) return;
    if (solo) { playSolo(room.game); return; }
    setBusy(true);
    try { const res = await partyStartAction(room.code); if ("error" in res) setNote(res.error); else { setNote(null); take(res); } } catch {}
    setBusy(false);
  }

  /* a shared ?pr= link joins straight away */
  const joinedRef = useRef(false);
  useEffect(() => {
    if (!joinCode || joinedRef.current) return;
    joinedRef.current = true;
    onJoined();
    void join(joinCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  const roomCode = solo ? null : room?.code;
  const roomGame = room?.game;
  /* solo: the computer players move a few times a second */
  useEffect(() => {
    if (!solo) return;
    const id = setInterval(() => {
      const st = soloRef.current;
      if (!st) return;
      const next = soloTick(st, clock(), level);
      if (next !== st) { soloRef.current = next; }
      take(soloView(next));
      setNow(clock());
    }, 150);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo, level]);
  useEffect(() => {
    if (!roomCode) return;
    const poll = setInterval(async () => {
      try { const r = await partyRoomAction(roomCode); if (r) take(r); } catch {}
    }, roomGame === "buzz" ? 500 : 1000);   /* the buzzer needs "answered!" to arrive fast */
    const tick = setInterval(() => setNow(clock() + offset.current), 100);
    return () => { clearInterval(poll); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, roomGame]);
  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current); }, []);
  /* the app's Back button / gesture: out of a game or room → the party menu */
  const inRoom = !!room;
  useEffect(() => {
    const on = (e: Event) => {
      if (!inRoom) return;
      e.preventDefault();
      setRoom(null); setSolo(false); soloRef.current = null;
    };
    window.addEventListener("vedank:partyback", on);
    return () => window.removeEventListener("vedank:partyback", on);
  }, [inRoom]);

  /* status from the local clock, so the countdown flips on time everywhere */
  const status = !room ? null
    : room.status === "countdown" && room.startAt !== null && now >= room.startAt ? "playing" : room.status;

  /* the question on my screen */
  const me = room?.players.find((p) => p.me);
  const buzzOpen = !!room?.buzz && status === "playing" && now >= room.buzz.qAt && room.buzz.q < BUZZ_QS;
  const q = !room || status !== "playing" ? null
    : room.game === "bingo" ? null
    : room.game === "buzz" ? (buzzOpen ? buzzQuestion(room.seed, room.buzz!.q) : null)
    : isRaceGame(room.game) && myDone >= RACE_GOAL[room.game] ? null
    : myPartyQuestion(room.game, room.seed, room.mySlot, myDone);

  /* celebrate a win once per round */
  useEffect(() => {
    if (status !== "done" || !room || celebrated.current === room.round) return;
    celebrated.current = room.round;
    const r = room.round;
    setTimeout(() => setResultsFor(r), room.startAt === null ? 0 : 1400);
    const won = room.game === "tug" ? room.tug?.winner === me?.team
      : isRaceGame(room.game) && room.race?.winnerKey ? room.race.winnerKey === me?.key
      : room.game === "bingo" ? (room.bingo?.winnerKey ? room.bingo.winnerKey === me?.key : !!me && Math.max(...room.players.map((p) => p.score)) === me.score && me.score > 0)
      : !!me && Math.max(...room.players.map((p) => p.score)) === me.score && me.score > 0;
    if (won) { celebrate(); sound.levelUp(); }
    const value = room.game === "buzz" ? me?.score ?? 0
      : room.game === "bingo" ? room.bingo?.called ?? 0
      : isRaceGame(room.game) ? (won && room.startAt !== null ? Math.max(1, Math.round((clock() + offset.current - room.startAt) / 1000)) : 0)
      : me?.score ?? 0;
    setNewBest(saveRec(room.game, !!won, value));
    setRecs(allRecs());
    track("party_end", { game: room.game, won, players: room.players.length, solo, score: value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, room?.round]);

  async function pick(v: number) {
    if (!room || !q || lock || picked !== null) return;
    setPicked(v);
    if (v !== q.answer) {
      /* a wrong tap: locked out for a moment (on the buzzer, for this question) */
      setLock(true); sound.wrong(); haptic(30);
      lockTimer.current = setTimeout(() => { setLock(false); setPicked(null); }, room.game === "buzz" ? 1800 : 800);
      return;
    }
    const idx = room.game === "buzz" ? room.buzz!.q : myDone;
    /* online buzzer: someone may have beaten me to it a split second ago, so
       wait for the server's verdict before celebrating */
    if (room.game === "buzz" && !solo) {
      setLock(true);
      try {
        const res = await partyAnswerAction(room.code, idx, v);
        if ("error" in res) { setLock(false); setPicked(null); return; }
        const mine = res.players.find((p) => p.me);
        const winner = res.buzz?.wins[idx];
        if (winner && winner === mine?.key) {
          sound.correct(); haptic(12); onCorrect?.(1);
          setFx({ k: clock(), kind: "pull" });
        } else if (winner) {
          const who = res.players.find((p) => p.key === winner);
          setTaken(who?.name ?? (ja ? "だれか" : "Someone"));
          sound.wrong(); haptic(20);
        } else {
          setLock(false);   /* nothing decided yet (e.g. the question wasn't open): try again */
        }
        setPicked(null);
        take(res);
      } catch { setLock(false); setPicked(null); }
      return;
    }
    sound.correct(); haptic(12); onCorrect?.(1);
    setFx({ k: clock(), kind: "pull" });
    if (room.game !== "buzz") setMyDone(idx + 1);
    setTimeout(() => setPicked(null), 160);
    if (solo) {
      const st = soloRef.current;
      if (!st) return;
      const next = soloAnswer(st, clock(), idx, v);
      if (next !== "wrong") { soloRef.current = next; take(soloView(next)); }
      return;
    }
    try {
      const res = await partyAnswerAction(room.code, idx, v);
      if (!("error" in res)) take(res);
    } catch {}
  }

  /* bingo: tap a number on my card. It counts if that number has been
     called; a wrong tap locks the card for a moment. */
  async function markCell(cell: number) {
    if (!room?.bingo || status !== "playing" || lock || (myDone & (1 << cell))) return;
    const value = room.bingo.card[cell];
    const called = bingoCalls(room.seed).slice(0, room.bingo.called).map((c) => c.answer);
    if (!called.includes(value)) {
      setLock(true); setPicked(cell); sound.wrong(); haptic(30);
      lockTimer.current = setTimeout(() => { setLock(false); setPicked(null); }, 1200);
      return;
    }
    sound.correct(); haptic(12); onCorrect?.(1);
    setMyDone((d) => d | (1 << cell));
    if (solo) {
      const st = soloRef.current;
      if (!st) return;
      const next = soloAnswer(st, clock(), cell, value);
      if (next !== "wrong") { soloRef.current = next; take(soloView(next)); }
      return;
    }
    try {
      const res = await partyAnswerAction(room.code, cell, value);
      if (!("error" in res)) take(res);
    } catch {}
  }

  async function share() {
    if (!room) return;
    const url = `${SITE_URL}/?pr=${room.code}`;
    const text = ja ? `「${nameJa}」でいっしょにあそぼう！コード ${room.code}` : `Play ${nameEn} with me! Code ${room.code}`;
    try { if (navigator.share) { await navigator.share({ title: "VedAnk Sprint", text, url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setNote(ja ? "リンクをコピーしました" : "Link copied"); } catch {}
  }

  /* ---- no room yet: pick a game, make a room, or type a code ---- */
  if (!room) {
    return (
      <div className="rg party">
        <div className="race-online-menu party-menu">
          <div className="rg-card-title">🎉 {ja ? "みんなであそぶ" : "Party games"}</div>
          <p className="rg-card-sub">{ja ? `🤖 ひとりでコンピューターと、🌐 みんなで（2〜${PARTY_ROOM_MAX}人）でも。` : `🤖 Solo against the computer, or 🌐 with friends (2–${PARTY_ROOM_MAX}).`}</p>
          <div className="party-levels" role="radiogroup" aria-label={ja ? "コンピューターの強さ" : "Computer strength"}>
            <span>{ja ? "🤖 の強さ" : "🤖 strength"}</span>
            {SOLO_LEVELS.map((lv) => (
              <button key={lv.id} role="radio" aria-checked={level === lv.id} className={level === lv.id ? "on" : ""} onClick={() => setLevel(lv.id)}>{lv.icon} {ja ? lv.ja : lv.en}</button>
            ))}
          </div>
          <div className="party-picks">
            {(initialGame === "tug" ? PARTY_GAMES : [initialGame, ...PARTY_GAMES.filter((g) => g !== initialGame)]).map((g) => (
              <div key={g} className={`party-pick ${g}${g === initialGame && g !== "tug" ? " first" : ""}`}>
                <span className="party-pick-ico">{PARTY_NAMES[g][0]}</span>
                <span className="party-pick-txt">
                  <b>{ja ? PARTY_NAMES[g][2] : PARTY_NAMES[g][1]}</b>
                  <small>{blurb(g, ja)}</small>
                  {recs && recChip(g, recs[g], ja) && <em className="party-rec">{recChip(g, recs[g], ja)}</em>}
                </span>
                <span className="party-pick-btns">
                  <button className="btn btn-primary" onClick={() => playSolo(g)} disabled={busy}>🤖 {ja ? "ひとりで" : "Solo"}</button>
                  <button className="btn" onClick={() => create(g)} disabled={busy}>🌐 {ja ? "みんなで" : "Friends"}</button>
                </span>
              </div>
            ))}
          </div>
          <div className="party-join">
            <span className="party-or">{ja ? "友だちのコードで参加" : "Join a friend's room"}</span>
            <span className="race-join">
              <input className="race-join-input mono" value={code} maxLength={4} placeholder={ja ? "コード" : "CODE"} inputMode="text" autoCapitalize="characters"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter" && code.length === 4) join(code); }} enterKeyHint="go" aria-label={ja ? "部屋のコード" : "Room code"} />
              <button className="btn btn-join" onClick={() => join(code)} disabled={busy || code.length !== 4}>{ja ? "参加 ▶" : "Join ▶"}</button>
            </span>
          </div>
          {note && <p className="race-note">{note}</p>}
        </div>
      </div>
    );
  }

  const n = room.players.length;
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const secsLeft = (at: number) => Math.max(0, Math.ceil((at - now) / 1000));

  return (
    <div className={`rg party party-${game}${fx?.kind === "fire" && now - fx.k < 700 ? " shake" : ""}`}>
      <div className="party-head">
        <span className="party-title">{icon} {ja ? nameJa : nameEn}</span>
        <span className="party-meta mono">
          {status === "playing" && game === "tug" && room.tug && `⏱ ${secsLeft(room.tug.endsAt)}s`}
          {status === "playing" && game === "buzz" && room.buzz && `Q${Math.min(BUZZ_QS, room.buzz.q + 1)}/${BUZZ_QS}`}
          {status === "playing" && game === "bingo" && room.bingo && `🎯 ${room.bingo.called}/${BINGO_CALLS}`}
          {status === "playing" && room.race && `⏱ ${secsLeft(room.race.endsAt)}s`}
          {status === "lobby" && `👥 ${n}`}
        </span>
      </div>

      {/* the game area only while a game is on; before and after it the room
          card takes its place at full height, so Start / Play again are never
          pushed out of sight by a long player list */}
      {(status === "countdown" || status === "playing" || (status === "done" && resultsFor !== room.round && room.startAt !== null)) && (
      <div className="party-stage">
        {game === "tug" && <TugStage room={room} ja={ja} myTeam={me?.team ?? 0} pulse={fx?.kind === "pull" ? fx.k : 0} />}
        {game === "buzz" && <BuzzStage room={room} ja={ja} now={now} q={q?.prompt ?? null} ranked={ranked} />}
        {game === "space" && <SpaceRaceStage room={room} ja={ja} ranked={ranked} pulse={fx?.kind === "pull" ? fx.k : 0} />}
        {game === "river" && <FrogRaceStage ja={ja} ranked={ranked} pulse={fx?.kind === "pull" ? fx.k : 0} />}
        {game === "bingo" && <BingoStage room={room} ja={ja} now={now} mask={myDone} lock={lock} wrongCell={lock ? picked : null} onMark={markCell} />}

        {status === "countdown" && room.startAt !== null && (
          <div key={secsLeft(room.startAt)} className="race-count mono">{Math.max(1, secsLeft(room.startAt))}</div>
        )}
      </div>
      )}

        {status === "lobby" && (
          <div className="rg-card party-panel party-lobby">
            <div className="rg-card-title">{ja ? "部屋のコード" : "Room code"}</div>
            <div className="race-code mono">{room.code}</div>
            <GamePicker current={game} ja={ja} canPick={room.isHost} busy={busy} onPick={switchGame}
              label={room.isHost ? (ja ? "あそぶゲーム（同じコードのまま変えられるよ）" : "Game (change it any time, same code)") : (ja ? "あそぶゲーム" : "Game")} />
            <div className="party-lobby-btns">
              <button className="btn" onClick={share}>🔗 {ja ? "友だちに送る" : "Send to friends"}</button>
              {room.isHost
                ? <button className="btn btn-primary" onClick={start} disabled={busy || n < 2}>{n < 2 ? (ja ? "2人以上でスタート" : "Needs 2 players") : (ja ? `${n}人でスタート！` : `Start with ${n}!`)}</button>
                : (
                  <div className="party-waiting">
                    <b>✅ {ja ? "参加しました！" : "You're in!"}</b>
                    <span>{(() => { const h = room.players.find((p) => p.host)?.name ?? (ja ? "ホスト" : "the host"); return ja ? `${h} さんがスタートするのを待っています` : `Waiting for ${h} to start`; })()}<i className="party-dots"><i>.</i><i>.</i><i>.</i></i></span>
                  </div>
                )}
            </div>
            {note && <p className="race-note">{note}</p>}
            <ul className="race-players">
              <li className="race-count-row">{ja ? `参加 ${n}人` : `${n} in the room`}{game === "tug" ? (ja ? "（スタートでチームを半分にわけるよ）" : " (teams are split evenly at the start)") : ""}</li>
              {room.players.map((p) => (
                <li key={p.key}>{p.me ? (ja ? `${p.name}（きみ）` : `${p.name} (you)`) : p.name}{p.host ? " 👑" : ""}</li>
              ))}
              <li className="race-wait">{room.isHost && n < 2
                ? (ja ? "友だちがこのコードを入力するのを待っています（友だちは自分のアカウントでログインしてね）" : "Waiting for a friend to enter this code (signed in with their own account)")
                : (ja ? "友だちを待っています…" : "Waiting for friends…")}</li>
            </ul>
          </div>
        )}

        {status === "done" && (resultsFor === room.round || room.startAt === null) && (
          <div className="rg-card party-panel party-done">
            <div className="rg-card-medal">{resultIcon(room, me?.team ?? 0, me?.key)}</div>
            <div className="rg-card-title">{resultTitle(room, ja, me?.team ?? 0, me?.key)}</div>
            {newBest && <div className="party-best">{ja ? "🎉 自己ベスト！" : "🎉 New personal best!"}</div>}
            {recs && recChip(game, recs[game], ja) && <div className="party-rec">{recChip(game, recs[game], ja)}</div>}
            <ol className="race-results">
              {(game === "tug" ? [...room.players].sort((a, b) => a.team - b.team || b.score - a.score) : ranked).map((p) => (
                <li key={p.key} className={p.me ? "me" : ""}>
                  <span>{game === "tug" ? (p.team === 0 ? "🔴 " : "⚪ ") : ""}{p.me ? (ja ? "きみ" : "You") : p.name}</span>
                  <span className="mono">{game === "buzz" ? `${p.score} ${ja ? "問" : "pts"}`
                    : game === "space" ? `${p.score}/${RACE_GOAL.space} ${ja ? "こ" : "blasts"}`
                    : game === "river" ? `${p.score}/${RACE_GOAL.river} ${ja ? "ジャンプ" : "hops"}`
                    : `${p.score} ${game === "bingo" ? (ja ? "マス" : "marks") : (ja ? "回" : "pulls")}`}</span>
                </li>
              ))}
            </ol>
            {room.isHost
              ? <button className="btn btn-primary" onClick={start} disabled={busy}>{ja ? "もう一回" : "Play again"}</button>
              : <p className="race-note">{ja ? "ホストが次のゲームを始めるのを待っています" : "Waiting for the host to start the next game"}</p>}
            {room.isHost && (
              <GamePicker current={null} ja={ja} canPick busy={busy} onPick={switchGame}
                label={solo ? (ja ? "ほかのゲーム" : "Another game") : (ja ? "次のゲーム（みんなそのまま・同じコード）" : "Next game (everyone stays, same code)")} />
            )}
            {solo && <button className="btn" onClick={() => create(room.game)} disabled={busy}>🌐 {ja ? "友だちとやる" : "Play with friends"}</button>}
          </div>
        )}

      {q && (
        <>
          {isRaceGame(game)
            ? <ArcadeAnswers game={game} round={q} idx={myDone} onPick={pick} picked={picked} disabled={lock} ja={ja} />
            : <>
                <div className="race-q mono">{q.prompt} = ?</div>
                <Answers round={q} onPick={pick} picked={picked} disabled={lock} />
              </>}
          {lock && game === "buzz" && <p className="party-lock">{taken
            ? (ja ? `🔔 ${taken} が先に答えた！次の問題を待ってね` : `🔔 ${taken} answered first! Wait for the next one`)
            : (ja ? "おてつき！ちょっと待ってね" : "Oops, wait a moment")}</p>}
        </>
      )}
      {game === "tug" && status === "playing" && me && (
        <p className={`party-myteam t${me.team}`}>{ja ? `きみは ${TEAM[me.team][1]}！` : `You're on ${TEAM[me.team][0]}!`}</p>
      )}
      <div className="race-online-foot">
        <span className="mono">{solo ? `🤖 ${SOLO_LEVELS[level][ja ? "ja" : "en"]}` : `${ja ? "部屋" : "Room"} ${room.code}`}</span>
        <button className="btn btn-ghost" onClick={() => { setRoom(null); setSolo(false); soloRef.current = null; if (!solo) onBack(); }}>{solo ? (ja ? "← ゲームをえらぶ" : "← Games") : (ja ? "退出" : "Leave")}</button>
      </div>
    </div>
  );
}

/* the three games as chips: the host taps one to switch the room's game */
function GamePicker({ current, ja, canPick, busy, onPick, label }: {
  current: PartyGame | null; ja: boolean; canPick: boolean; busy: boolean; onPick: (g: PartyGame) => void; label: string;
}) {
  if (!canPick && current) {
    return (
      <div className="party-picker">
        <span className="party-picker-lab">{label}</span>
        <span className="party-game-now"><span>{PARTY_NAMES[current][0]}</span>{ja ? PARTY_NAMES[current][2] : PARTY_NAMES[current][1]}</span>
      </div>
    );
  }
  return (
    <div className="party-picker">
      <span className="party-picker-lab">{label}</span>
      <span className="party-picker-row">
        {PARTY_GAMES.map((g) => (
          <button key={g} className={`party-chip${g === current ? " on" : ""}`} disabled={!canPick || busy} onClick={() => onPick(g)} aria-pressed={g === current}>
            <span>{PARTY_NAMES[g][0]}</span>{ja ? PARTY_NAMES[g][2] : PARTY_NAMES[g][1]}
          </button>
        ))}
      </span>
    </div>
  );
}

function blurb(g: PartyGame, ja: boolean) {
  if (g === "tug") return ja ? "2チームで対決。正解でつなを引こう！" : "Two teams. Every right answer pulls the rope!";
  if (g === "buzz") return ja ? "同じ問題を早いもの勝ち！" : "Same sum for all, fastest wins the point!";
  if (g === "space") return ja ? "答えのいん石をうちおとして、先に星に着いたら勝ち！" : "Blast the answer rocks. First rocket to the planet wins!";
  if (g === "river") return ja ? "答えのハスの葉にジャンプ！先に川をわたったら勝ち。" : "Hop to the answer pads. First across the river wins!";
  return ja ? "自分のカードで計算ビンゴ！1列そろえたら勝ち。" : "Mark the sums on your own card. First full line wins!";
}

function resultIcon(room: PartyRoomView, myTeam: 0 | 1, myKey?: string) {
  if (room.game === "tug") return room.tug?.winner === "draw" ? "🤝" : room.tug?.winner === myTeam ? "🏆" : "💪";
  if (room.game === "bingo" && room.bingo?.winnerKey) return room.bingo.winnerKey === myKey ? "🎯" : "🙌";
  if (room.race?.winnerKey) return room.race.winnerKey === myKey ? (room.game === "space" ? "🚀" : "🐸") : "🙌";
  const top = Math.max(...room.players.map((p) => p.score));
  return room.players.find((p) => p.key === myKey)?.score === top && top > 0 ? "🥇" : "🔔";
}
function resultTitle(room: PartyRoomView, ja: boolean, myTeam: 0 | 1, myKey?: string) {
  if (room.game === "tug") {
    const w = room.tug?.winner;
    if (w === "draw") return ja ? "ひきわけ！" : "It's a draw!";
    const name = w === 0 ? TEAM[0] : TEAM[1];
    return w === myTeam ? (ja ? `${name[1]}の勝ち！きみのチームだ！` : `${name[0]} wins, that's your team!`) : (ja ? `${name[1]}の勝ち！` : `${name[0]} wins!`);
  }
  if (room.race?.winnerKey) {
    const w = room.players.find((p) => p.key === room.race!.winnerKey);
    const mine = w?.key === myKey;
    if (room.game === "space") return mine ? (ja ? "一番乗りで星に着いた！" : "First to the planet. You win!") : (ja ? `${w?.name ?? "?"} が一番乗り！` : `${w?.name ?? "?"} reached the planet first!`);
    return mine ? (ja ? "一番に川をわたった！" : "First across the river. You win!") : (ja ? `${w?.name ?? "?"} が一番にわたった！` : `${w?.name ?? "?"} crossed first!`);
  }
  if (room.game === "bingo" && room.bingo?.winnerKey) {
    const w = room.players.find((p) => p.key === room.bingo!.winnerKey);
    return w?.key === myKey ? (ja ? "ビンゴ！きみの勝ち！" : "BINGO! You win!") : (ja ? `${w?.name ?? "?"} がビンゴ！` : `${w?.name ?? "?"} got BINGO!`);
  }
  const top = Math.max(...room.players.map((p) => p.score));
  const winners = room.players.filter((p) => p.score === top);
  if (winners.some((p) => p.key === myKey) && top > 0) return ja ? "きみが1位！" : "You're the champion!";
  return ja ? `${winners.map((w) => w.name).join("・")} が1位！` : `${winners.map((w) => w.name).join(" & ")} wins!`;
}

/* ---- 🪢 Tug of War: one line in the middle ----
   The rope slides toward the side that's ahead. It is drawn so that at a
   lead of TUG_WIN the losing team's front player is pulled over the middle
   line — the moment the game is won. */
function TugStage({ room, ja, myTeam, pulse }: { room: PartyRoomView; ja: boolean; myTeam: 0 | 1; pulse: number }) {
  const t = room.tug;
  const pos = t?.pos ?? 0;
  /* +pos = red ahead = rope moves left. The front players stand 18px from
     the knot and are ~46px wide, so a 50px slide at ±TUG_WIN puts the
     losing front player just over the middle line */
  const shift = Math.max(-1, Math.min(1, pos / TUG_WIN)) * 50;
  const reds = room.players.filter((p) => p.team === 0), whites = room.players.filter((p) => p.team === 1);
  return (
    <div className="tug-field">
      <div className="tug-score">
        <span className="t0">🔴 {TEAM[0][ja ? 1 : 0]}</span>
        <span className="t1">{TEAM[1][ja ? 1 : 0]} ⚪</span>
      </div>
      <span className="tug-line c" />
      <div className="tug-rope" style={{ transform: `translateX(${-shift}px)` }}>
        <div className="tug-team t0">{reds.slice(0, 3).map((p, i) => <span key={p.key} className={`tug-kid${p.me ? " me" : ""}`}>{p.me ? <Mascot animated={false} mood="excited" /> : <Person seed={i * 7 + 3} mood="happy" size={40} />}</span>)}</div>
        <span key={pulse} className={`tug-knot${pulse ? " pulse" : ""}`}>🎀</span>
        <div className="tug-team t1">{whites.slice(0, 3).map((p, i) => <span key={p.key} className={`tug-kid${p.me ? " me" : ""}`}>{p.me ? <Mascot animated={false} mood="excited" /> : <Person seed={i * 5 + 11} mood="happy" size={40} />}</span>)}</div>
      </div>
      <div className="tug-teamsize">
        <span>{ja ? `${t?.redN ?? reds.length}人` : `${t?.redN ?? reds.length}`}{myTeam === 0 ? (ja ? "（きみ）" : " (you)") : ""}</span>
        <span>{myTeam === 1 ? (ja ? "（きみ）" : " (you)") : ""}{ja ? `${t?.whiteN ?? whites.length}人` : `${t?.whiteN ?? whites.length}`}</span>
      </div>
    </div>
  );
}

/* ---- 🔔 Buzzer Quiz: the bell, the question clock, and who got the last one ---- */
function BuzzStage({ room, ja, now, q, ranked }: { room: PartyRoomView; ja: boolean; now: number; q: string | null; ranked: PartyRoomView["players"] }) {
  const b = room.buzz!;
  const prev = b.q > 0 ? b.wins[b.q - 1] : undefined;
  const prevName = prev ? room.players.find((p) => p.key === prev) : null;
  const between = room.status !== "lobby" && now < b.qAt && b.q > 0;
  const left = Math.max(0, b.qAt + BUZZ_Q_MS - now);
  return (
    <div className="buzz-stage">
      <div className={`buzz-bell${between && prev ? " ring" : ""}`}>🔔</div>
      {between ? (
        <div className="buzz-who">{prevName ? (ja ? `ピンポン！ ${prevName.me ? "きみ" : prevName.name} が正解！` : `Ding! ${prevName.me ? "You" : prevName.name} got it!`) : (ja ? "時間切れ！" : "Time's up!")}</div>
      ) : q ? (
        <div className="buzz-clock"><i style={{ width: `${(left / BUZZ_Q_MS) * 100}%` }} /></div>
      ) : null}
      <ol className="buzz-board">
        {ranked.slice(0, 5).map((p, i) => (
          <li key={p.key} className={p.me ? "me" : ""}><span>{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {p.me ? (ja ? "きみ" : "You") : p.name}</span><b className="mono">{p.score}</b></li>
        ))}
      </ol>
    </div>
  );
}

/* ---- 🎯 Math Bingo: the call, the last few calls, my card, and who's close ---- */
function BingoStage({ room, ja, now, mask, lock, wrongCell, onMark }: {
  room: PartyRoomView; ja: boolean; now: number; mask: number; lock: boolean; wrongCell: number | null; onMark: (cell: number) => void;
}) {
  const b = room.bingo;
  if (!b) return null;
  const calls = bingoCalls(room.seed);
  const cur = b.called > 0 ? calls[b.called - 1] : null;
  const prev = calls.slice(Math.max(0, b.called - 4), Math.max(0, b.called - 1)).reverse();
  const left = Math.max(0, b.callEndsAt - now);
  /* リーチ: one cell short of a line */
  const reach = (m: number) => BINGO_LINES.some((l) => marksOf(m & l) === 2);
  const board = [...room.players].sort((x, y) => y.score - x.score).slice(0, 5);
  return (
    <div className="bingo-stage">
      <div className="bingo-call">
        <small>{ja ? `${b.called}問目` : `Call ${b.called}`}</small>
        <b className="mono">{cur ? `${cur.prompt} = ?` : "…"}</b>
        <span className="bingo-call-bar"><i style={{ width: `${(left / BINGO_CALL_MS) * 100}%` }} /></span>
      </div>
      {prev.length > 0 && (
        <div className="bingo-prev">{ja ? "前の問題：" : "Before: "}{prev.map((c) => <span key={c.prompt} className="mono">{c.prompt}</span>)}</div>
      )}
      <div className={`bingo-card${lock ? " locked" : ""}`}>
        {b.card.map((n, i) => (
          <button key={i} className={`bingo-cell${mask & (1 << i) ? " on" : ""}${wrongCell === i ? " wrong" : ""}`} onClick={() => onMark(i)} disabled={!!(mask & (1 << i))}>
            <span className="mono">{n}</span>
          </button>
        ))}
      </div>
      <div className="bingo-board">
        {board.map((p) => (
          <span key={p.key} className={p.me ? "me" : ""}>{p.me ? (ja ? "きみ" : "You") : p.name} <b className="mono">{p.score}</b>{reach(p.done) && !(b.winnerKey) && <em>{ja ? "🔥リーチ" : "🔥1 to go"}</em>}</span>
        ))}
      </div>
      {b.winnerKey && <div className="bingo-win">BINGO!</div>}
    </div>
  );
}

/* the racers to draw: the leaders, and always me */
function lanesOf(ranked: PartyRoomView["players"], n: number) {
  const top = ranked.slice(0, n);
  const me = ranked.find((p) => p.me);
  if (me && !top.includes(me)) top[top.length - 1] = me;
  return top;
}

/* ---- 🚀 Space Blaster race: rockets fly up to a friendly planet ---- */
function SpaceRaceStage({ room, ja, ranked, pulse }: { room: PartyRoomView; ja: boolean; ranked: PartyRoomView["players"]; pulse: number }) {
  const goal = RACE_GOAL.space;
  const lanes = lanesOf(ranked, 6);
  const planet = planetFor(1 + (room.round % 6));
  return (
    <div className="srace">
      <span className="srace-stars" aria-hidden="true" />
      <div className="srace-planet"><PlanetArt p={planet} label={ja ? `ゴール：${planet.ja}` : `Goal: ${planet.en}`} /></div>
      <div className="srace-lanes">
        {lanes.map((p, i) => {
          const f = Math.min(1, p.score / goal);
          return (
            <div key={p.key} className={`srace-lane${p.me ? " me" : ""}`}>
              <span className="srace-trail" style={{ height: `${f * 100}%` }} />
              <span key={p.me ? pulse : 0} className={`srace-rocket${p.me && pulse ? " zap" : ""}`} style={{ bottom: `calc(${f} * (100% - 64px))` }}>
                <svg viewBox="0 0 64 80" width="30" height="38" aria-hidden="true">
                  <path d="M32 4 C44 16 48 34 46 56 L18 56 C16 34 20 16 32 4Z" fill={p.me ? "#ffd84a" : ["#f4f1ea", "#9fe3ff", "#ffc2d4", "#c8f4b0", "#e0c8ff"][i % 5]} stroke="#1d1b33" strokeWidth="4" />
                  <circle cx="32" cy="28" r="8" fill="#5bc8f5" stroke="#1d1b33" strokeWidth="3.5" />
                  <path d="M18 40 L6 60 L18 56Z M46 40 L58 60 L46 56Z" fill="#ff5a5f" stroke="#1d1b33" strokeWidth="3.5" strokeLinejoin="round" />
                </svg>
                <i className="srace-flame" />
              </span>
              <span className="srace-name">{p.me ? (ja ? "きみ" : "You") : p.name}</span>
              <span className="srace-score mono">{p.score}</span>
            </div>
          );
        })}
      </div>
      {pulse > 0 && <span key={pulse} className="srace-boom" aria-hidden="true">☄️</span>}
    </div>
  );
}

/* ---- 🐸 River Hop race: each player's frog hops along a row of lily pads ---- */
function FrogRaceStage({ ja, ranked, pulse }: { ja: boolean; ranked: PartyRoomView["players"]; pulse: number }) {
  const goal = RACE_GOAL.river;
  const lanes = lanesOf(ranked, 6);
  return (
    <div className="frace">
      <span className="frace-bank start" aria-hidden="true" />
      <span className="frace-bank goal" aria-hidden="true"><i>🌸</i><i>🌸</i><i>🌸</i></span>
      <div className="frace-lanes">
        {lanes.map((p) => {
          const at = Math.min(goal, p.score);
          return (
            <div key={p.key} className={`frace-lane${p.me ? " me" : ""}`}>
              <span className="frace-name">{p.me ? (ja ? "きみ" : "You") : p.name}</span>
              <span className="frace-pads" aria-hidden="true">{Array.from({ length: goal - 1 }, (_, i) => <i key={i} className={i < at ? "done" : ""} />)}</span>
              <span key={p.me ? pulse : 0} className={`frace-frog${p.me && pulse ? " hop" : ""}`} style={{ left: `calc(36px + ${at / goal} * (100% - 72px))` }}>
                <svg viewBox="0 0 52 52" width="30" height="30" aria-hidden="true">
                  <ellipse cx="26" cy="32" rx="19" ry="15" fill={p.me ? "#7ed957" : "#a8d8a0"} stroke="#1d4a2a" strokeWidth="3.5" />
                  <circle cx="16" cy="17" r="8" fill={p.me ? "#7ed957" : "#a8d8a0"} stroke="#1d4a2a" strokeWidth="3.5" /><circle cx="36" cy="17" r="8" fill={p.me ? "#7ed957" : "#a8d8a0"} stroke="#1d4a2a" strokeWidth="3.5" />
                  <circle cx="17" cy="16" r="3" fill="#1d1b33" /><circle cx="37" cy="16" r="3" fill="#1d1b33" />
                  <path d="M17 34 Q26 41 35 34" stroke="#1d4a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              <span className="frace-score mono">{p.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- the races play like the arcade games: the choices are asteroids to
   blast (Space Blaster) or lily pads to hop onto (River Hop). The field is
   rebuilt for each sum (keyed by idx), so the rocks start falling afresh. ---- */
const SLOT_X = [18, 50, 82];
function ArcadeAnswers({ game, round, idx, onPick, picked, disabled, ja }: {
  game: "space" | "river"; round: ChoiceRound; idx: number; onPick: (v: number) => void; picked: number | null; disabled: boolean; ja: boolean;
}) {
  const [shot, setShot] = useState<{ k: number; x: number; y: number } | null>(null);
  const [k, setK] = useState(0);
  function tap(v: number, i: number, el: HTMLElement) {
    if (disabled || picked !== null) return;
    if (v === round.answer) {
      const nk = k + 1;
      /* where the rock is right now, so the laser and the blast meet it */
      const box = el.closest(".parc")?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setK(nk); setShot({ k: nk, x: SLOT_X[i], y: box ? r.top + r.height / 2 - box.top : 120 });
      setTimeout(() => setShot((cur) => (cur?.k === nk ? null : cur)), 520);
    }
    onPick(v);
  }
  const x = shot?.x ?? 50;
  return (
    <div className={`parc parc-${game}`}>
      {game === "space" ? <span className="parc-stars" aria-hidden="true" /> : <span className="parc-water" aria-hidden="true" />}
      <div className="parc-screen mono">{round.prompt} = ?</div>
      <div key={`f${idx}`} className="parc-field">
        {round.options.map((o, i) => (
          <button key={o} className={`parc-item i${i}${disabled && picked === o && o !== round.answer ? " wrong" : ""}`} style={{ left: `${SLOT_X[i]}%` }}
            onPointerDown={(e) => { e.preventDefault(); tap(o, i, e.currentTarget); }} disabled={disabled} aria-label={fmt(o)}>
            <span className="parc-body mono">{fmt(o)}</span>
          </button>
        ))}
      </div>
      {game === "space" && shot && (
        <span key={`s${shot.k}`} aria-hidden="true">
          <i className="parc-laser" style={{ left: `${shot.x}%`, top: shot.y }} />
          <i className="parc-boom" style={{ left: `${shot.x}%`, top: shot.y }} />
        </span>
      )}
      {game === "space" ? (
        <span className="parc-ship" style={{ left: `${x}%` }} aria-hidden="true">
          <svg viewBox="0 0 64 80" width="44" height="55">
            <path d="M32 4 C44 16 48 34 46 56 L18 56 C16 34 20 16 32 4Z" fill="#ffd84a" stroke="#1d1b33" strokeWidth="4" />
            <circle cx="32" cy="28" r="8" fill="#5bc8f5" stroke="#1d1b33" strokeWidth="3.5" />
            <path d="M18 40 L6 60 L18 56Z M46 40 L58 60 L46 56Z" fill="#ff5a5f" stroke="#1d1b33" strokeWidth="3.5" strokeLinejoin="round" />
          </svg>
          <i className="srace-flame" />
        </span>
      ) : (
        <span key={`frog${shot?.k ?? 0}`} className={`parc-frog${shot ? " jump" : ""}`} style={{ left: `${x}%` }} aria-hidden="true">
          <svg viewBox="0 0 52 52" width="46" height="46">
            <ellipse cx="26" cy="32" rx="19" ry="15" fill="#7ed957" stroke="#1d4a2a" strokeWidth="3.5" />
            <circle cx="16" cy="17" r="8" fill="#7ed957" stroke="#1d4a2a" strokeWidth="3.5" /><circle cx="36" cy="17" r="8" fill="#7ed957" stroke="#1d4a2a" strokeWidth="3.5" />
            <circle cx="17" cy="16" r="3" fill="#1d1b33" /><circle cx="37" cy="16" r="3" fill="#1d1b33" />
            <path d="M17 34 Q26 41 35 34" stroke="#1d4a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className="parc-tip">{game === "space" ? (ja ? "答えのいん石をタップ！" : "Tap the answer rock!") : (ja ? "答えのハスの葉にジャンプ！" : "Hop to the answer pad!")}</span>
    </div>
  );
}
