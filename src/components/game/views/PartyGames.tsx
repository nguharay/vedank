"use client";

import { useEffect, useRef, useState } from "react";
import { SITE_URL } from "@/lib/site";
import { haptic } from "../util";
import { Person } from "../Person";
import { Mascot } from "../Mascot";
import type { useSound } from "../useSound";
import { Answers } from "./RunGames";
import { track } from "@/lib/analytics";
import {
  partyCreateAction, partyJoinAction, partyRoomAction, partyStartAction, partyAnswerAction,
} from "@/lib/actions/game-actions";
import {
  PARTY_NAMES, PARTY_ROOM_MAX, TUG_WIN, BUZZ_QS, BUZZ_Q_MS, BOSS_HEARTS, BOSS_WAVE_MS,
  partyQuestion, buzzQuestion, buildPartyView, type PartyGame, type PartyState, type PartyView as PartyRoomView,
} from "@/lib/game/party";
import { soloStart, soloAnswer, soloTick, SOLO_LEVELS, SOLO_ME, type SoloLevel } from "@/lib/game/partySolo";

/* ---------- party games: Tug of War, Buzzer Quiz, Boss Battle ----------
   One screen for all three. The room part (make / join by code / share /
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
  const soloView = (st: PartyState) => buildPartyView(st, { code: "SOLO", hostId: SOLO_ME, viewerId: SOLO_ME, now: clock() });
  const game: PartyGame = room?.game ?? initialGame;
  const [icon, nameEn, nameJa] = PARTY_NAMES[game];

  function take(v: PartyRoomView) {
    offset.current = v.now - clock();
    /* a new round — or a different room — starts my count from zero */
    if (v.round !== round.current || v.code !== roomRef.current) {
      round.current = v.round;
      roomRef.current = v.code;
      lastHearts.current = 0;
      setMyDone(0); setPicked(null); setLock(false);
    }
    const mine = v.players.find((p) => p.me);
    if (mine && v.game !== "buzz") setMyDone((d) => Math.max(d, mine.done));
    /* the dragon's fire got through: shake the screen */
    if (v.boss && v.boss.heartsLost > lastHearts.current) {
      lastHearts.current = v.boss.heartsLost;
      setFx({ k: clock(), kind: "fire" }); sound.wrong(); haptic(40);
    }
    setRoom(v);
  }

  /* solo rounds keep counting up across games, so each new game is a new round */
  const soloRound = useRef(0);
  function playSolo(g: PartyGame) {
    soloRound.current = Math.max(soloRound.current, round.current) + 1;
    const st = soloStart(g, ja, ja ? "きみ" : "You", soloRound.current, clock());
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
      if ("error" in res) setNote(res.error); else { setSolo(false); soloRef.current = null; take(res); track("party_join", { game: res.game }); }
    } catch { setNote(ja ? "参加できませんでした" : "Could not join"); }
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
    }, 1000);
    const tick = setInterval(() => setNow(clock() + offset.current), 100);
    return () => { clearInterval(poll); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);
  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current); }, []);

  /* status from the local clock, so the countdown flips on time everywhere */
  const status = !room ? null
    : room.status === "countdown" && room.startAt !== null && now >= room.startAt ? "playing" : room.status;

  /* the question on my screen */
  const me = room?.players.find((p) => p.me);
  const buzzOpen = !!room?.buzz && status === "playing" && now >= room.buzz.qAt && room.buzz.q < BUZZ_QS;
  const q = !room || status !== "playing" ? null
    : room.game === "buzz" ? (buzzOpen ? buzzQuestion(room.seed, room.buzz!.q) : null)
    : partyQuestion(room.seed, room.mySlot, myDone);

  /* celebrate a win once per round */
  useEffect(() => {
    if (status !== "done" || !room || celebrated.current === room.round) return;
    celebrated.current = room.round;
    const won = room.game === "tug" ? room.tug?.winner === me?.team
      : room.game === "boss" ? room.boss?.result === "win"
      : !!me && Math.max(...room.players.map((p) => p.score)) === me.score && me.score > 0;
    if (won) { celebrate(); sound.levelUp(); }
    track("party_end", { game: room.game, won, players: room.players.length });
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
    sound.correct(); haptic(12); onCorrect?.(1);
    setFx({ k: clock(), kind: room.game === "boss" ? "hit" : "pull" });
    const idx = room.game === "buzz" ? room.buzz!.q : myDone;
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

  async function share() {
    if (!room) return;
    const url = `${SITE_URL}/?pr=${room.code}`;
    const text = ja ? `「${nameJa}」でいっしょにあそぼう！コード ${room.code}` : `Play ${nameEn} with me! Code ${room.code}`;
    try { if (navigator.share) { await navigator.share({ title: "Sutra Sprint", text, url }); return; } } catch { return; }
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
            {(["tug", "buzz", "boss"] as PartyGame[]).map((g) => (
              <div key={g} className={`party-pick ${g}`}>
                <span className="party-pick-ico">{PARTY_NAMES[g][0]}</span>
                <b>{ja ? PARTY_NAMES[g][2] : PARTY_NAMES[g][1]}</b>
                <small>{blurb(g, ja)}</small>
                <span className="party-pick-btns">
                  <button className="btn btn-primary" onClick={() => playSolo(g)} disabled={busy}>🤖 {ja ? "ひとりで" : "Solo"}</button>
                  <button className="btn" onClick={() => create(g)} disabled={busy}>🌐 {ja ? "みんなで" : "Friends"}</button>
                </span>
              </div>
            ))}
          </div>
          <div className="party-or">{ja ? "コードをもらったら" : "Got a code?"}</div>
          <div className="race-join">
            <input className="race-join-input mono" value={code} maxLength={4} placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} aria-label={ja ? "部屋のコード" : "Room code"} />
            <button className="btn" onClick={() => join(code)} disabled={busy || code.length !== 4}>{ja ? "参加" : "Join"}</button>
          </div>
          {note && <p className="race-note">{note}</p>}
          <button className="btn btn-ghost" onClick={onBack}>← {ja ? "もどる" : "Back"}</button>
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
          {status === "playing" && game === "boss" && room.boss && `${ja ? "ウェーブ" : "Wave"} ${room.boss.wave + 1}`}
          {status === "lobby" && `👥 ${n}`}
        </span>
      </div>

      <div className="party-stage">
        {game === "tug" && <TugStage room={room} ja={ja} myTeam={me?.team ?? 0} pulse={fx?.kind === "pull" ? fx.k : 0} />}
        {game === "buzz" && <BuzzStage room={room} ja={ja} now={now} q={q?.prompt ?? null} ranked={ranked} />}
        {game === "boss" && <BossStage room={room} ja={ja} now={now} hit={fx?.kind === "hit" ? fx.k : 0} fire={fx?.kind === "fire" ? fx.k : 0} />}

        {status === "countdown" && room.startAt !== null && (
          <div key={secsLeft(room.startAt)} className="race-count mono">{Math.max(1, secsLeft(room.startAt))}</div>
        )}

        {status === "lobby" && (
          <div className="rg-card party-lobby">
            <div className="rg-card-title">{ja ? "部屋のコード" : "Room code"}</div>
            <div className="race-code mono">{room.code}</div>
            <button className="btn" onClick={share}>🔗 {ja ? "友だちに送る" : "Send to friends"}</button>
            <ul className="race-players">
              <li className="race-count-row">{ja ? `参加 ${n}人` : `${n} in the room`}{game === "tug" ? (ja ? "（スタートでチームを半分にわけるよ）" : " (teams are split evenly at the start)") : ""}</li>
              {room.players.map((p) => (
                <li key={p.key}>{p.me ? (ja ? `${p.name}（きみ）` : `${p.name} (you)`) : p.name}{p.host ? " 👑" : ""}</li>
              ))}
              <li className="race-wait">{ja ? "友だちを待っています…" : "Waiting for friends…"}</li>
            </ul>
            {room.isHost
              ? <button className="btn btn-primary" onClick={start} disabled={busy || n < 2}>{n < 2 ? (ja ? "2人以上でスタート" : "Needs 2 players") : (ja ? "スタート！" : "Start!")}</button>
              : <p className="race-note">{ja ? "ホストがスタートするのを待っています" : "Waiting for the host to start"}</p>}
            {note && <p className="race-note">{note}</p>}
          </div>
        )}

        {status === "done" && (
          <div className="rg-card party-done">
            <div className="rg-card-medal">{resultIcon(room, me?.team ?? 0, me?.key)}</div>
            <div className="rg-card-title">{resultTitle(room, ja, me?.team ?? 0, me?.key)}</div>
            <ol className="race-results">
              {(game === "tug" ? [...room.players].sort((a, b) => a.team - b.team || b.score - a.score) : ranked).map((p) => (
                <li key={p.key} className={p.me ? "me" : ""}>
                  <span>{game === "tug" ? (p.team === 0 ? "🔴 " : "⚪ ") : ""}{p.me ? (ja ? "きみ" : "You") : p.name}</span>
                  <span className="mono">{game === "buzz" ? `${p.score} ${ja ? "問" : "pts"}` : `${p.score} ${game === "boss" ? (ja ? "ヒット" : "hits") : (ja ? "回" : "pulls")}`}</span>
                </li>
              ))}
            </ol>
            {room.isHost
              ? <button className="btn btn-primary" onClick={start} disabled={busy}>{ja ? "もう一回" : "Play again"}</button>
              : <p className="race-note">{ja ? "ホストが次のゲームを始めるのを待っています" : "Waiting for the host to start the next game"}</p>}
            {solo && <button className="btn" onClick={() => create(room.game)} disabled={busy}>🌐 {ja ? "友だちとやる" : "Play with friends"}</button>}
          </div>
        )}
      </div>

      {q && (
        <>
          <div className="race-q mono">{q.prompt} = ?</div>
          <Answers round={q} onPick={pick} picked={picked} disabled={lock} />
          {lock && game === "buzz" && <p className="party-lock">{ja ? "おてつき！ちょっと待ってね" : "Oops — wait a moment"}</p>}
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

function blurb(g: PartyGame, ja: boolean) {
  if (g === "tug") return ja ? "2チームで対決。正解でつなを引こう！" : "Two teams. Every right answer pulls the rope!";
  if (g === "buzz") return ja ? "同じ問題を早いもの勝ち！" : "Same sum for all — fastest wins the point!";
  return ja ? "みんなで力をあわせてドラゴンをたおせ！" : "Team up and beat the dragon together!";
}

function resultIcon(room: PartyRoomView, myTeam: 0 | 1, myKey?: string) {
  if (room.game === "tug") return room.tug?.winner === "draw" ? "🤝" : room.tug?.winner === myTeam ? "🏆" : "💪";
  if (room.game === "boss") return room.boss?.result === "win" ? "🏆" : "🐉";
  const top = Math.max(...room.players.map((p) => p.score));
  return room.players.find((p) => p.key === myKey)?.score === top && top > 0 ? "🥇" : "🔔";
}
function resultTitle(room: PartyRoomView, ja: boolean, myTeam: 0 | 1, myKey?: string) {
  if (room.game === "tug") {
    const w = room.tug?.winner;
    if (w === "draw") return ja ? "ひきわけ！" : "It's a draw!";
    const name = w === 0 ? TEAM[0] : TEAM[1];
    return w === myTeam ? (ja ? `${name[1]}の勝ち！きみのチームだ！` : `${name[0]} wins — that's your team!`) : (ja ? `${name[1]}の勝ち！` : `${name[0]} wins!`);
  }
  if (room.game === "boss") return room.boss?.result === "win" ? (ja ? "ドラゴンをたおした！" : "Dragon defeated!") : (ja ? "ドラゴンの勝ち…もう一回！" : "The dragon won… try again!");
  const top = Math.max(...room.players.map((p) => p.score));
  const winners = room.players.filter((p) => p.score === top);
  if (winners.some((p) => p.key === myKey) && top > 0) return ja ? "きみが1位！" : "You're the champion!";
  return ja ? `${winners.map((w) => w.name).join("・")} が1位！` : `${winners.map((w) => w.name).join(" & ")} wins!`;
}

/* ---- 🪢 Tug of War: the rope's knot slides toward the winning side ---- */
function TugStage({ room, ja, myTeam, pulse }: { room: PartyRoomView; ja: boolean; myTeam: 0 | 1; pulse: number }) {
  const t = room.tug;
  const pos = t?.pos ?? 0;
  /* +pos = red ahead = rope moves left; TUG_WIN is the line */
  const shift = Math.max(-1, Math.min(1, pos / TUG_WIN)) * 38;
  const reds = room.players.filter((p) => p.team === 0), whites = room.players.filter((p) => p.team === 1);
  return (
    <div className="tug-field">
      <div className="tug-score">
        <span className="t0">🔴 {TEAM[0][ja ? 1 : 0]} <b className="mono">{t?.red ?? 0}</b></span>
        <span className="t1"><b className="mono">{t?.white ?? 0}</b> {TEAM[1][ja ? 1 : 0]} ⚪</span>
      </div>
      <span className="tug-line l" /><span className="tug-line c" /><span className="tug-line r" />
      <div className="tug-rope" style={{ transform: `translateX(${-shift}%)` }}>
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

/* ---- 🐉 Boss Battle: HP bar, hearts, and the wave's "block the fire" meter ---- */
function BossStage({ room, ja, now, hit, fire }: { room: PartyRoomView; ja: boolean; now: number; hit: number; fire: number }) {
  const b = room.boss;
  const n = room.players.length;
  const hp = b ? b.hp - b.dmg : 0;
  const need = b?.need ?? 0;
  const waveLeft = b ? Math.max(0, b.waveEndsAt - now) : BOSS_WAVE_MS;
  const blocked = b ? b.waveHits >= need : false;
  return (
    <div className="boss-stage">
      <div className="boss-hearts" aria-label={ja ? "チームのハート" : "Team hearts"}>
        {Array.from({ length: BOSS_HEARTS }, (_, i) => <span key={i} className={i < BOSS_HEARTS - (b?.heartsLost ?? 0) ? "on" : ""}>❤️</span>)}
      </div>
      <div className="boss-hp"><i style={{ width: `${b ? (hp / b.hp) * 100 : 100}%` }} /><span className="mono">{b ? `${hp} / ${b.hp}` : `HP ${n * 14}`}</span></div>
      <div key={hit} className={`boss-dragon${hit ? " hit" : ""}${b?.result === "win" ? " down" : ""}`}>🐉</div>
      {fire > 0 && now - fire < 900 && <div key={fire} className="boss-fire">🔥🔥🔥</div>}
      {b && !b.result && (
        <div className={`boss-wave${blocked ? " ok" : ""}`}>
          <span>{blocked ? (ja ? "🛡️ ほのおをガードできる！" : "🛡️ Fire blocked this wave!") : (ja ? `🛡️ あと ${need - b.waveHits} ヒットでほのおをガード` : `🛡️ ${need - b.waveHits} more hits to block the fire`)}</span>
          <span className="boss-wave-bar"><i style={{ width: `${(waveLeft / BOSS_WAVE_MS) * 100}%` }} /></span>
        </div>
      )}
    </div>
  );
}
