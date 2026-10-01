"use client";

import { useEffect, useRef, useState } from "react";
import { townSaveAction, townFriendsAction, townVisitAction, townBuyAction, townStickerAction, townCollectAction } from "@/lib/actions/game-actions";
import type { FriendTown, Sticker } from "@/lib/game/townOnline";
import { Mascot } from "../Mascot";
import type { useSound } from "../useSound";
import {
  useTown, build, demolish, claimWelcome, townPop, townRank, rankForPop, BUILDINGS, BUILDING, RANKS,
  TOWN_COLS, WELCOME_GIFT, addTownCoins, spendTownCoins, shopPrice, STICKERS,
} from "../town";

type Sound = ReturnType<typeof useSound>;
/* only called from handlers, never during render */
const nowMs = () => Date.now();

/* ---------- 🏙️ Math Town ----------
   The town you build with the coins every game pays out (1 right answer =
   1 🪙). Tap an empty plot to build, tap a building to see it, play the game
   it belongs to, or knock it down for half its cost back. Population raises
   the town's rank, and each rank unlocks bigger buildings. */
export function TownView({ lang, sound, celebrate, onPlay, guest }: {
  lang: "en" | "ja"; sound: Sound; celebrate: () => void; onPlay: (game: string) => void; guest: boolean;
}) {
  const ja = lang === "ja";
  const town = useTown();

  /* ---- friends (signed-in only) ----
     The town is mirrored to the server whenever it changes, so friends can
     visit; coins friends spent here are collected when the town opens. */
  const [friends, setFriends] = useState<FriendTown[] | null>(null);
  const [visiting, setVisiting] = useState<{ town: FriendTown; stickers: Sticker[] } | null>(null);
  const [myStickers, setMyStickers] = useState<Sticker[]>([]);
  const [gift, setGift] = useState<{ coins: number; visits: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (guest || opened.current) return;
    opened.current = true;
    void (async () => {
      try {
        const g = await townCollectAction();
        setMyStickers(g.stickers);
        if (g.gifts > 0) { addTownCoins(g.gifts); setGift({ coins: g.gifts, visits: g.visits }); sound.levelUp(); }
      } catch {}
      try { setFriends(await townFriendsAction()); } catch { setFriends([]); }
    })();
  }, [guest, sound]);
  useEffect(() => {
    if (guest) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void townSaveAction({ coins: town.coins, earned: town.earned, plots: town.plots }).catch(() => {}); }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [guest, town]);

  async function visit(f: FriendTown) {
    setBusy(true); setNote(null);
    try { const r = await townVisitAction(f.id); if ("error" in r) setNote(r.error); else setVisiting(r); } catch {}
    setBusy(false);
  }
  async function buy(buildingId: string) {
    if (!visiting) return;
    const b = BUILDING(buildingId); if (!b) return;
    const price = shopPrice(buildingId);
    if (!spendTownCoins(price)) { setNote(ja ? "コインが足りない！ゲームでかせごう" : "Not enough coins — earn some in a game!"); sound.wrong(); return; }
    sound.correct();
    setNote(ja ? `${b.emoji} ${visiting.town.name}の${b.nameJa}で ${price}🪙 つかった！` : `${b.emoji} Spent ${price}🪙 at ${visiting.town.name}'s ${b.name.toLowerCase()}!`);
    try { await townBuyAction(visiting.town.id, buildingId, price); } catch {}
  }
  async function sticker(emoji: string) {
    if (!visiting) return;
    sound.click();
    try {
      const r = await townStickerAction(visiting.town.id, emoji);
      if (!("error" in r)) setVisiting({ ...visiting, stickers: [{ from: ja ? "きみ" : "You", emoji, at: nowMs() }, ...visiting.stickers].slice(0, 20) });
    } catch {}
  }
  const [plot, setPlot] = useState<number | null>(null);
  const [justBuilt, setJustBuilt] = useState<number | null>(null);
  const pop = townPop(town);
  const rank = townRank(town);
  const rankInfo = RANKS[rank - 1];
  const next = RANKS[rank];
  const pct = next ? Math.min(100, ((pop - rankInfo.min) / (next.min - rankInfo.min)) * 100) : 100;
  const selId = plot !== null ? town.plots[plot] : null;
  const sel = selId ? BUILDING(selId) : null;

  function doBuild(id: string) {
    if (plot === null) return;
    if (!build(plot, id)) { sound.wrong(); return; }
    sound.levelUp();
    setJustBuilt(plot); setTimeout(() => setJustBuilt(null), 900);
    setPlot(null);
    /* a new rank is worth confetti */
    if (rankForPop(pop + (BUILDING(id)?.pop ?? 0)) > rank) celebrate();
  }

  /* ---- a friend's town ---- */
  if (visiting) {
    const vt = visiting.town;
    return (
      <div className="town">
        <div className="town-head">
          <div className="town-rank">
            <span className="town-rank-name">🏙️ {ja ? `${vt.name}のまち` : `${vt.name}'s town`}</span>
            <span className="town-rank-sub mono">👥 {vt.plots.reduce((a, id) => a + (id ? BUILDING(id)?.pop ?? 0 : 0), 0)} · 👣 {vt.visits}</span>
          </div>
          <div className="town-coins mono">🪙 {town.coins}</div>
        </div>
        <p className="town-lede">{ja ? "お店をタップして買い物すると、友だちにコインがとどくよ" : "Tap a shop to buy something — your friend gets the coins!"}</p>
        <div className="town-map" style={{ gridTemplateColumns: `repeat(${TOWN_COLS}, 1fr)` }}>
          {vt.plots.map((id, i) => {
            const b = id ? BUILDING(id) : null;
            const shop = !!b?.game;
            return (
              <button key={i} className={`town-plot${b ? " built" : ""}${shop ? " shop" : ""}`} disabled={!shop} onClick={() => b && buy(b.id)}
                aria-label={b ? (ja ? b.nameJa : b.name) : ""}>
                {b ? <span className="town-bld">{b.emoji}</span> : <span className="town-empty" />}
                {shop && <span className="town-price mono">{shopPrice(b!.id)}🪙</span>}
              </button>
            );
          })}
        </div>
        {note && <p className="race-note town-note">{note}</p>}
        <div className="town-stickers-row">
          <span>{ja ? "ステッカーをのこす：" : "Leave a sticker:"}</span>
          {STICKERS.map((e) => <button key={e} className="town-sticker-btn" onClick={() => sticker(e)}>{e}</button>)}
        </div>
        {visiting.stickers.length > 0 && (
          <ul className="town-stickers">
            {visiting.stickers.slice(0, 8).map((st, i) => <li key={i}><b>{st.emoji}</b> {st.from}</li>)}
          </ul>
        )}
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => { setVisiting(null); setNote(null); }}>← {ja ? "自分のまちへもどる" : "Back to my town"}</button>
      </div>
    );
  }

  return (
    <div className="town">
      <div className="town-head">
        <div className="town-rank">
          <span className="town-rank-name">🏙️ {ja ? rankInfo.nameJa : rankInfo.name}</span>
          <span className="town-rank-sub mono">👥 {pop}{next ? ` / ${next.min}` : ""} · {ja ? "ランク" : "Rank"} {rank}</span>
          <span className="town-rank-bar"><i style={{ width: `${pct}%` }} /></span>
        </div>
        <div className="town-coins mono">🪙 {town.coins}</div>
      </div>

      {!town.welcome && (
        <button className="town-gift" onClick={() => { claimWelcome(); sound.levelUp(); celebrate(); }}>
          🎁 {ja ? `はじめてのプレゼント：${WELCOME_GIFT}🪙 をもらう` : `Welcome gift: claim ${WELCOME_GIFT}🪙`}
        </button>
      )}
      <p className="town-lede">{ja ? "どのゲームでも、正解1問 = 1🪙。コインでまちをつくろう！" : "Every right answer in any game = 1🪙. Spend coins to build your town!"}</p>

      <div className="town-map" style={{ gridTemplateColumns: `repeat(${TOWN_COLS}, 1fr)` }}>
        {town.plots.map((id, i) => {
          const b = id ? BUILDING(id) : null;
          return (
            <button key={i} className={`town-plot${b ? " built" : ""}${plot === i ? " sel" : ""}${justBuilt === i ? " pop" : ""}`}
              onClick={() => { setPlot(i); sound.click(); }} aria-label={b ? (ja ? b.nameJa : b.name) : (ja ? "空き地" : "Empty plot")}>
              {b ? <span className="town-bld">{b.emoji}</span> : <span className="town-empty">+</span>}
            </button>
          );
        })}
        <span className="town-mayor" aria-hidden="true"><Mascot animated mood="happy" /></span>
      </div>

      {gift && (
        <div className="town-gift-banner">
          🎁 {ja ? `友だちがきみのお店で ${gift.coins}🪙 つかってくれた！（きみのまちに ${gift.visits} 回おきゃくさん）` : `Friends spent ${gift.coins}🪙 in your shops! (${gift.visits} visits to your town)`}
        </div>
      )}
      {myStickers.length > 0 && (
        <ul className="town-stickers mine">
          {myStickers.slice(0, 6).map((st, i) => <li key={i}><b>{st.emoji}</b> {st.from}</li>)}
        </ul>
      )}

      {!guest && (
        <div className="town-friends">
          <div className="town-friends-head">{ja ? "👫 友だちのまちへ行く" : "👫 Visit a friend's town"}</div>
          {friends === null ? <p className="race-note">{ja ? "よみこみ中…" : "Loading…"}</p>
            : friends.length === 0 ? <p className="race-note">{ja ? "まだ友だちのまちがありません。友だちを追加して、まちを建ててもらおう！" : "No friends' towns yet. Add friends and get them building!"}</p>
            : (
              <div className="town-friends-list">
                {friends.map((f) => {
                  const fp = f.plots.reduce((a, id) => a + (id ? BUILDING(id)?.pop ?? 0 : 0), 0);
                  const shops = f.plots.filter((id) => id && BUILDING(id)?.game).length;
                  return (
                    <button key={f.id} className="town-friend" onClick={() => visit(f)} disabled={busy}>
                      <span className="town-friend-art" aria-hidden="true">{f.plots.filter(Boolean).slice(0, 3).map((id, k) => <i key={k}>{BUILDING(id!)?.emoji}</i>)}{!f.plots.some(Boolean) && <i>🌱</i>}</span>
                      <span className="town-friend-body">
                        <span className="town-friend-name">{f.name}</span>
                        <span className="town-friend-sub mono">{ja ? RANKS[rankForPop(fp) - 1].nameJa : RANKS[rankForPop(fp) - 1].name} · 👥 {fp} · 🏪 {shops}</span>
                      </span>
                      <span className="game-card-go">›</span>
                    </button>
                  );
                })}
              </div>
            )}
          {note && <p className="race-note town-note">{note}</p>}
        </div>
      )}

      {plot !== null && (
        <>
          <div className="menu-overlay" onClick={() => setPlot(null)} />
          <div className="hint-sheet town-sheet" role="dialog" aria-modal="true">
            <button className="interest-close" aria-label={ja ? "閉じる" : "Close"} onClick={() => setPlot(null)}>✕</button>
            {sel ? (
              <>
                <div className="town-sheet-big">{sel.emoji}</div>
                <h3>{ja ? sel.nameJa : sel.name}</h3>
                <p className="town-sheet-sub">{sel.pop > 0 ? (ja ? `👥 ${sel.pop}人が住んでいます` : `👥 ${sel.pop} people live here`) : (ja ? "まちがきれいになる！" : "Makes the town prettier!")}</p>
                {sel.game && (
                  <button className="btn btn-primary" onClick={() => { const gid = sel.game!; setPlot(null); onPlay(gid); }}>
                    ▶ {ja ? "ここでゲームをする" : "Play the game here"}
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => { demolish(plot); sound.click(); setPlot(null); }}>
                  {ja ? `こわす（+${Math.floor(sel.cost / 2)}🪙）` : `Knock down (+${Math.floor(sel.cost / 2)}🪙)`}
                </button>
              </>
            ) : (
              <>
                <h3>{ja ? "なにを建てる？" : "What will you build?"}</h3>
                <div className="town-shop">
                  {BUILDINGS.map((b) => {
                    const locked = rank < b.rank;
                    const poor = town.coins < b.cost;
                    return (
                      <button key={b.id} className={`town-item${locked ? " locked" : poor ? " poor" : ""}`} disabled={locked || poor} onClick={() => doBuild(b.id)}>
                        <span className="town-item-emoji">{locked ? "🔒" : b.emoji}</span>
                        <span className="town-item-name">{ja ? b.nameJa : b.name}</span>
                        <span className="town-item-cost mono">{locked ? (ja ? RANKS[b.rank - 1].nameJa : RANKS[b.rank - 1].name) : `${b.cost}🪙`}</span>
                        {b.game && !locked && <span className="town-item-game">🎮</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
