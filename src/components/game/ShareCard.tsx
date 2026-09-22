"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LangCode, UIDict } from "./i18n";

export type ShareStats = {
  level: number;
  rank: string;
  gems: number;
  dailyStreak: number;
  bestStreakEver: number;
  hearts: number;
  blitzBest: number;
  bossClears: number;
  solvedCount: number;
  totalPuzzles: number;
};

/* Which stat the sheet opens on — drives the big headline number. */
export type ShareFocus = "level" | "gems" | "streak" | "hearts" | "blitz" | "bosses" | "puzzles";

type Tile = { key: ShareFocus; icon: string; label: string; value: string };

function tilesFor(s: ShareStats, t: UIDict): Tile[] {
  return [
    { key: "level", icon: "🪔", label: t.share.statLevel, value: `${s.level}` },
    { key: "gems", icon: "💎", label: t.share.statGems, value: `${s.gems}` },
    { key: "streak", icon: "🔥", label: t.share.statBestStreak, value: `${s.bestStreakEver}` },
    { key: "hearts", icon: "❤️", label: t.share.statHearts, value: `${s.hearts}` },
    { key: "blitz", icon: "⚡", label: t.share.statBlitz, value: `${s.blitzBest}` },
    { key: "bosses", icon: "👹", label: t.share.statBosses, value: `${s.bossClears}` },
    { key: "puzzles", icon: "🧩", label: t.share.statPuzzles, value: `${s.solvedCount}/${s.totalPuzzles}` },
  ];
}

/* The sentence that actually gets posted. Each stat gets its own brag line so a
   shared streak doesn't read like a shared blitz score. */
function blurbFor(focus: ShareFocus, s: ShareStats, t: UIDict, lang: LangCode): string {
  const ja = lang === "ja";
  switch (focus) {
    case "blitz":
      return t.share.blitzBlurb(s.blitzBest);
    case "streak":
      return ja
        ? `スートラ・スプリントを${s.bestStreakEver}日連続で学習中です！🔥`
        : `I'm on a ${s.bestStreakEver}-day streak on Sutra Sprint! 🔥`;
    case "gems":
      return ja
        ? `ヴェーダ数学で${s.gems}ジェムを集めました！💎`
        : `I've earned ${s.gems} gems doing Vedic math on Sutra Sprint! 💎`;
    case "bosses":
      return ja
        ? `スートラ・スプリントでボスを${s.bossClears}体倒しました！👹`
        : `I've beaten ${s.bossClears} boss stages on Sutra Sprint! 👹`;
    case "puzzles":
      return ja
        ? `マッチ棒パズルを${s.solvedCount}/${s.totalPuzzles}問クリアしました！🧩`
        : `I've solved ${s.solvedCount} of ${s.totalPuzzles} matchstick puzzles on Sutra Sprint! 🧩`;
    case "hearts":
      return ja
        ? `ハート${s.hearts}個でレベル${s.level}まで来ました！❤️`
        : `Still on ${s.hearts} hearts at level ${s.level} of Sutra Sprint! ❤️`;
    default:
      return t.share.blurb(s.level, s.rank);
  }
}

export function ShareSheet({
  open,
  onClose,
  stats,
  focus,
  onFocus,
  lang,
  t,
}: {
  open: boolean;
  onClose: () => void;
  stats: ShareStats;
  focus: ShareFocus;
  onFocus: (f: ShareFocus) => void;
  lang: LangCode;
  t: UIDict;
}) {
  /* remembering which stat was copied lets "Copied!" clear itself when the
     focus changes, with no effect syncing a second piece of state */
  const [copiedFor, setCopiedFor] = useState<ShareFocus | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const tiles = useMemo(() => tilesFor(stats, t), [stats, t]);
  const active = tiles.find((x) => x.key === focus) || tiles[0];
  const blurb = blurbFor(focus, stats, t, lang);
  const shareUrl = typeof window === "undefined" ? "" : window.location.origin;
  const shareText = `${blurb}`;
  const copied = copiedFor === focus;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function nativeShare() {
    const payload = { title: t.share.title, text: shareText, url: shareUrl };
    // Web Share API is the good path on phones — it opens the real OS sheet.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* user dismissed the sheet, or the browser refused — fall through to copy */
      }
    }
    copy();
  }

  async function copy() {
    const full = shareUrl ? `${shareText} ${shareUrl}` : shareText;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedFor(focus);
      setTimeout(() => setCopiedFor(null), 1800);
    } catch {
      /* clipboard blocked (insecure origin / permission) — the text stays selectable on the card */
    }
  }

  const enc = encodeURIComponent(`${shareText}`);
  const encUrl = encodeURIComponent(shareUrl);
  const networks: { id: string; label: string; icon: string; href: string }[] = [
    { id: "x", label: "X", icon: "𝕏", href: `https://twitter.com/intent/tweet?text=${enc}&url=${encUrl}` },
    { id: "line", label: "LINE", icon: "💬", href: `https://social-plugins.line.me/lineit/share?url=${encUrl}&text=${enc}` },
    { id: "whatsapp", label: "WhatsApp", icon: "🟢", href: `https://wa.me/?text=${enc}%20${encUrl}` },
    { id: "facebook", label: "Facebook", icon: "🔵", href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${enc}` },
  ];

  return (
    <>
      <div className="menu-overlay share-overlay" onClick={onClose} />
      <div className="share-sheet" role="dialog" aria-modal="true" aria-label={t.share.title}>
        <div className="share-sheet-head">
          <div>
            <div className="share-sheet-title">{t.share.title}</div>
            <div className="share-sheet-sub">{t.share.subtitle}</div>
          </div>
          <button ref={closeRef} className="share-close" onClick={onClose} aria-label={t.share.close}>
            ✕
          </button>
        </div>

        {/* the poster: big focused number, then the rest of the run */}
        <div className="share-poster">
          <div className="share-poster-brand">
            <img src="/brand/vedank-mark.png" alt="" />
            <span>{t.home.brand}</span>
          </div>
          <div className="share-poster-big">
            <span className="share-poster-icon" aria-hidden="true">{active.icon}</span>
            <span className="share-poster-num mono">{active.value}</span>
          </div>
          <div className="share-poster-label">{active.label}</div>
          <div className="share-poster-rank">
            {t.share.statLevel} {stats.level} · {stats.rank}
          </div>
        </div>

        <div className="share-tiles" role="group" aria-label={t.share.tapHint}>
          {tiles.map((tile) => (
            <button
              key={tile.key}
              className={`share-tile${tile.key === focus ? " active" : ""}`}
              onClick={() => onFocus(tile.key)}
              aria-pressed={tile.key === focus}
            >
              <span className="share-tile-ico" aria-hidden="true">{tile.icon}</span>
              <span className="share-tile-num mono">{tile.value}</span>
              <span className="share-tile-lab">{tile.label}</span>
            </button>
          ))}
        </div>

        <p className="share-blurb">{shareText}</p>

        <div className="share-actions">
          <button className="btn btn-primary share-primary" onClick={nativeShare}>
            📤 {t.share.shareBtn}
          </button>
          <button className="btn btn-ghost share-copy" onClick={copy}>
            {copied ? `✅ ${t.share.copied}` : `📋 ${t.share.copy}`}
          </button>
        </div>

        <div className="share-networks">
          {networks.map((n) => (
            <a
              key={n.id}
              className={`share-net share-net-${n.id}`}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={n.label}
              title={n.label}
            >
              <span aria-hidden="true">{n.icon}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
