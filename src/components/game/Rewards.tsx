"use client";

import { useEffect, useState } from "react";
import {
  CARDS, ownedCards, claimDailyGift, dailyGiftDue, gamesToUnlock, untriedGames, GAME_NAMES, giftStreak,
  type Card,
} from "@/lib/game/progression";
import { addTownCoins } from "./town";
import { track } from "@/lib/analytics";

/* ---------- rewards layer ----------
   One place for every reward moment, driven by window events so any screen
   can raise one:
     vedank:card        — a card was won        → the card flips in
     vedank:unlock      — new games opened      → celebration + play buttons
     vedank:nudge       — "try this game next"  → suggestion with the card reward
     vedank:locked      — tapped a locked game  → how many games to go
     vedank:collection  — open the card book
   plus the daily gift, offered once a day when the app opens (`giftReady`). */

type L = "en" | "ja";
const RARITY: Record<Card["rarity"], [string, string]> = { common: ["Common", "ノーマル"], rare: ["Rare", "レア"], legendary: ["Legendary", "レジェンド"] };
const gname = (id: string, ja: boolean) => (GAME_NAMES[id] ? GAME_NAMES[id][ja ? 1 : 0] : id);

export function CardFace({ card, lang, size = "big" }: { card: Card; lang: L; size?: "big" | "mini" }) {
  const ja = lang === "ja";
  const no = CARDS.findIndex((c) => c.id === card.id) + 1;
  return (
    <div className={`mcard ${card.rarity} ${size}`} style={{ ["--cc" as string]: card.color }}>
      <div className="mcard-top">
        <span>{RARITY[card.rarity][ja ? 1 : 0]}</span>
        <span className="mono">No.{String(no).padStart(2, "0")}</span>
      </div>
      <div className="mcard-art"><span>{card.glyph}</span></div>
      <div className="mcard-name">{ja ? card.nameJa : card.name}</div>
      {size === "big" && (
        <>
          <div className="mcard-years mono">{card.years}</div>
          <div className="mcard-line">{card.quote ? `“${ja ? card.lineJa : card.line}”` : `💡 ${ja ? card.lineJa : card.line}`}</div>
        </>
      )}
    </div>
  );
}

function untilTomorrow(): string {
  const now = Date.now();
  const jst = now + 9 * 3600_000;
  const next = Math.ceil(jst / 86400_000) * 86400_000 - 9 * 3600_000;
  const m = Math.max(0, Math.round((next - now) / 60000));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

type Pop =
  | { kind: "card"; card: Card; reason: string; game?: string }
  | { kind: "unlock"; games: string[] }
  | { kind: "nudge"; from: string; to: string }
  | { kind: "locked"; game: string }
  | { kind: "gift" }
  | { kind: "collection" };

export function RewardsLayer({ lang, onPlay, giftReady }: { lang: L; onPlay: (id: string) => void; giftReady: boolean }) {
  const ja = lang === "ja";
  const [queue, setQueue] = useState<Pop[]>([]);
  const [gift, setGift] = useState<null | ReturnType<typeof claimDailyGift>>(null);
  const [detail, setDetail] = useState<Card | null>(null);
  const [, bump] = useState(0);
  const pop = queue[0];
  const push = (p: Pop) => setQueue((q) => (q.some((x) => x.kind === p.kind && x.kind !== "card") ? q : [...q, p]));
  const close = () => { setQueue((q) => q.slice(1)); setGift(null); setDetail(null); };

  useEffect(() => {
    const on = (kind: Pop["kind"]) => (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if (kind === "card") { push({ kind, card: d.card, reason: d.reason, game: d.game }); track("card_won", { card: d.card.id, reason: d.reason }); }
      else if (kind === "unlock") { push({ kind, games: d.games }); track("game_unlocked", { detail: d.games.join(",") }); }
      else if (kind === "nudge") { push({ kind, from: d.from, to: d.to }); track("nudge_shown", { game: d.to }); }
      else if (kind === "locked") push({ kind, game: d.game });
      else if (kind === "collection") { push({ kind }); track("collection_open"); }
      bump((n) => n + 1);
    };
    const names = ["card", "unlock", "nudge", "locked", "collection"] as const;
    const fns = names.map((n) => [n, on(n)] as const);
    fns.forEach(([n, f]) => window.addEventListener(`vedank:${n}`, f));
    return () => fns.forEach(([n, f]) => window.removeEventListener(`vedank:${n}`, f));
  }, []);

  /* the daily gift, once the app is settled (no intro, tour or chest showing) */
  useEffect(() => {
    if (!giftReady) return;
    const t = setTimeout(() => { if (dailyGiftDue()) setQueue((q) => (q.some((x) => x.kind === "gift") ? q : [{ kind: "gift" }, ...q])); }, 1200);
    return () => clearTimeout(t);
  }, [giftReady]);

  if (!pop) return null;
  const owned = ownedCards();

  if (pop.kind === "collection") {
    const have = CARDS.filter((c) => owned[c.id]).length;
    return (
      <div className="rw-wrap" role="dialog" aria-modal="true" aria-label={ja ? "偉人カード図鑑" : "Card collection"}>
        <div className="rw-card rw-book">
          <button className="rw-x" onClick={close} aria-label={ja ? "とじる" : "Close"}>×</button>
          <div className="rw-title">📚 {ja ? "偉人カード図鑑" : "Great Minds collection"}</div>
          <div className="rw-progress"><i style={{ width: `${(have / CARDS.length) * 100}%` }} /><b className="mono">{have} / {CARDS.length}</b></div>
          <p className="rw-sub">{ja ? "🎁 毎日アプリを開くと1まい ・ 🎮 新しいゲームをはじめてクリアで1まい" : "🎁 One a day when you open the app · 🎮 one for every new game you finish"}</p>
          <div className="rw-grid">
            {CARDS.map((c) =>
              owned[c.id] ? (
                <button key={c.id} className="rw-grid-item" onClick={() => setDetail(c)}><CardFace card={c} lang={lang} size="mini" /></button>
              ) : (
                <div key={c.id} className={`mcard mini locked ${c.rarity}`}><div className="mcard-art"><span>?</span></div><div className="mcard-name">???</div></div>
              )
            )}
          </div>
        </div>
        {detail && (
          <div className="rw-detail" onClick={() => setDetail(null)}>
            <CardFace card={detail} lang={lang} />
          </div>
        )}
      </div>
    );
  }

  if (pop.kind === "gift") {
    return (
      <div className="rw-wrap" role="dialog" aria-modal="true" aria-label={ja ? "今日のプレゼント" : "Today's gift"}>
        <div className="rw-card">
          {!gift ? (
            <button className="rw-gift" onClick={() => {
              const g = claimDailyGift();
              if (g.coins) addTownCoins(g.coins);
              setGift(g);
              window.dispatchEvent(new CustomEvent("vedank:giftclaimed"));
              track("daily_gift", { card: g.card?.id ?? "", coins: g.coins, streak: g.streak });
            }}>
              <span className="rw-gift-box">🎁</span>
              <b>{ja ? "今日のプレゼント！" : "Today's gift!"}</b>
              <span>{ja ? "タップしてあけよう" : "Tap to open"}</span>
            </button>
          ) : (
            <>
              <div className="rw-title">{ja ? `🔥 ${gift.streak}日連続ログイン！` : `🔥 Day ${gift.streak} in a row!`}</div>
              {gift.card ? <div className="rw-flip"><CardFace card={gift.card} lang={lang} /></div> : <p className="rw-sub">{ja ? "カードはぜんぶ集まった！すごい！" : "You have every card — amazing!"}</p>}
              {gift.card && <div className="rw-new">{ja ? "✨ 新しいカード！" : "✨ New card!"}</div>}
              <div className="rw-coins mono">+{gift.coins} 🪙</div>
              <p className="rw-sub">
                {ja ? `明日もまた来てね！次のカードが待ってるよ（あと ${untilTomorrow()}）` : `Come back tomorrow for another card (in ${untilTomorrow()})`}
                {gift.streak < 7 && <><br />{ja ? `7日連続でレジェンドカードが出やすくなる！` : `7 days in a row = better chance of a Legendary!`}</>}
              </p>
              <div className="rw-btns">
                <button className="btn btn-primary" onClick={close}>{ja ? "やったー！" : "Awesome!"}</button>
                <button className="btn btn-ghost" onClick={() => { setGift(null); setQueue((q) => [{ kind: "collection" }, ...q.slice(1)]); }}>📚 {ja ? "図鑑を見る" : "See collection"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (pop.kind === "card") {
    return (
      <div className="rw-wrap" role="dialog" aria-modal="true">
        <div className="rw-card">
          <div className="rw-title">{pop.reason === "game" && pop.game
            ? (ja ? `🎉「${gname(pop.game, true)}」はじめてクリア！` : `🎉 First clear: ${gname(pop.game, false)}!`)
            : (ja ? "🎉 カードをゲット！" : "🎉 New card!")}</div>
          <div className="rw-flip"><CardFace card={pop.card} lang={lang} /></div>
          <p className="rw-sub">{ja ? `図鑑 ${Object.keys(owned).length} / ${CARDS.length} まい` : `${Object.keys(owned).length} of ${CARDS.length} collected`}</p>
          <div className="rw-btns">
            <button className="btn btn-primary" onClick={close}>{ja ? "やったー！" : "Awesome!"}</button>
            <button className="btn btn-ghost" onClick={() => setQueue((q) => [{ kind: "collection" }, ...q.slice(1)])}>📚 {ja ? "図鑑を見る" : "See collection"}</button>
          </div>
        </div>
      </div>
    );
  }

  if (pop.kind === "unlock") {
    return (
      <div className="rw-wrap" role="dialog" aria-modal="true">
        <div className="rw-card rw-unlock">
          <div className="rw-lock-ico">🔓</div>
          <div className="rw-title">{ja ? "新しいゲームがアンロック！" : "New game unlocked!"}</div>
          <div className="rw-list">
            {pop.games.map((g) => (
              <button key={g} className="rw-play" onClick={() => { close(); onPlay(g); }}>
                <span>{gname(g, ja)}</span><b>{ja ? "あそぶ ▶" : "Play ▶"}</b>
              </button>
            ))}
          </div>
          <p className="rw-sub">{ja ? "はじめてクリアすると偉人カードがもらえるよ！" : "Finish it once to win a Great Minds card!"}</p>
          <button className="btn btn-ghost" onClick={close}>{ja ? "あとで" : "Later"}</button>
        </div>
      </div>
    );
  }

  if (pop.kind === "nudge") {
    return (
      <div className="rw-wrap rw-soft" role="dialog" aria-modal="true">
        <div className="rw-card">
          <div className="rw-title">{ja ? `🎮「${gname(pop.from, true)}」がとくいだね！` : `🎮 You're great at ${gname(pop.from, false)}!`}</div>
          <p className="rw-sub big">{ja ? <>まだ遊んでいない<b>「{gname(pop.to, true)}」</b>もやってみよう。<br />はじめてクリアで<b>偉人カード</b>がもらえるよ 🃏</> : <>Try <b>{gname(pop.to, false)}</b> next — you haven&apos;t played it yet.<br />Finish it once to win a <b>Great Minds card</b> 🃏</>}</p>
          <div className="rw-btns">
            <button className="btn btn-primary" onClick={() => { track("nudge_accept", { game: pop.to }); close(); onPlay(pop.to); }}>{ja ? "やってみる ▶" : "Try it ▶"}</button>
            <button className="btn btn-ghost" onClick={close}>{ja ? "あとで" : "Later"}</button>
          </div>
        </div>
      </div>
    );
  }

  /* locked */
  const left = gamesToUnlock(pop.game);
  const tryNow = untriedGames().slice(0, 3);
  return (
    <div className="rw-wrap rw-soft" role="dialog" aria-modal="true">
      <div className="rw-card rw-unlock">
        <div className="rw-lock-ico">🔒</div>
        <div className="rw-title">{ja ? `「${gname(pop.game, true)}」はまだロック中` : `${gname(pop.game, false)} is locked`}</div>
        <p className="rw-sub big">{ja ? <>どれかのゲームを<b>あと {left} 回クリア</b>するとアンロック！</> : <>Finish <b>{left} more game{left === 1 ? "" : "s"}</b> (any game) to unlock it!</>}</p>
        {tryNow.length > 0 && (
          <div className="rw-list">
            {tryNow.map((g) => (
              <button key={g} className="rw-play" onClick={() => { close(); onPlay(g); }}>
                <span>{gname(g, ja)} <small>{ja ? "🃏 初クリアでカード" : "🃏 card on first clear"}</small></span><b>▶</b>
              </button>
            ))}
          </div>
        )}
        <button className="btn btn-ghost" onClick={close}>{ja ? "OK" : "OK"}</button>
      </div>
    </div>
  );
}

/* the little "🃏 7/28" button that opens the collection */
export function CollectionChip({ lang }: { lang: L }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const read = () => setN(Object.keys(ownedCards()).length);
    const t = setTimeout(read, 0);
    window.addEventListener("vedank:card", read);
    window.addEventListener("vedank:giftclaimed", read);
    return () => { clearTimeout(t); window.removeEventListener("vedank:card", read); window.removeEventListener("vedank:giftclaimed", read); };
  }, []);
  return (
    <button className="collection-chip" onClick={() => window.dispatchEvent(new CustomEvent("vedank:collection"))} aria-label={lang === "ja" ? "偉人カード図鑑" : "Card collection"}>
      🃏 <b className="mono">{n}/{CARDS.length}</b>
    </button>
  );
}

/* the Home card for the collection */
export function CollectionCard({ lang }: { lang: L }) {
  const ja = lang === "ja";
  const [n, setN] = useState(0);
  useEffect(() => {
    const read = () => setN(Object.keys(ownedCards()).length);
    const t = setTimeout(read, 0);
    ["vedank:card", "vedank:giftclaimed"].forEach((e) => window.addEventListener(e, read));
    return () => { clearTimeout(t); ["vedank:card", "vedank:giftclaimed"].forEach((e) => window.removeEventListener(e, read)); };
  }, []);
  return (
    <button className="collection-card" onClick={() => window.dispatchEvent(new CustomEvent("vedank:collection"))}>
      <span className="collection-card-fan" aria-hidden="true"><i>π</i><i>∞</i><i>Σ</i></span>
      <span className="collection-card-body">
        <b>{ja ? "偉人カード図鑑" : "Great Minds cards"}</b>
        <span>{ja ? "毎日ひらくと1まい・新しいゲームを初クリアで1まい" : "One a day · one for each new game you finish"}</span>
        <span className="collection-card-bar"><i style={{ width: `${(n / CARDS.length) * 100}%` }} /></span>
      </span>
      <span className="collection-card-count mono">{n}/{CARDS.length}</span>
    </button>
  );
}

export { giftStreak };
