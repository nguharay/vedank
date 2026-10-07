"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { track } from "@/lib/analytics";

/* ---------- invite a friend ----------
   The app's link, sent any way the player likes: the phone's own share menu
   first, then LINE / WhatsApp / X / Facebook / Telegram / SMS / email, a copy
   button, and a QR code for a friend standing right there. Every link is
   tagged ?utm_source=invite&utm_medium=<channel>, so the activity sheet shows
   which channel brought each new player in ("came from: invite/line"). */

type Channel = { id: string; label: string; icon: string; color: string; href: (text: string, url: string) => string };

const CHANNELS: Channel[] = [
  { id: "line", label: "LINE", icon: "💬", color: "#06C755", href: (t, u) => `https://line.me/R/msg/text/?${encodeURIComponent(`${t}\n${u}`)}` },
  { id: "whatsapp", label: "WhatsApp", icon: "🟢", color: "#25D366", href: (t, u) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { id: "x", label: "X", icon: "𝕏", color: "#111111", href: (t, u) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: "facebook", label: "Facebook", icon: "f", color: "#1877F2", href: (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: "telegram", label: "Telegram", icon: "✈️", color: "#229ED9", href: (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: "sms", label: "SMS", icon: "✉️", color: "#34C759", href: (t, u) => `sms:?&body=${encodeURIComponent(`${t} ${u}`)}` },
  { id: "email", label: "Email", icon: "📧", color: "#EA4335", href: (t, u) => `mailto:?subject=${encodeURIComponent(t.split(/[!！]/)[0] || t)}&body=${encodeURIComponent(`${t}\n\n${u}`)}` },
];

export function InviteSheet({ lang, onClose, extra }: { lang: "en" | "ja"; onClose: () => void; extra?: string }) {
  const ja = lang === "ja";
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const linkFor = (channel: string) => (origin ? `${origin}/?utm_source=invite&utm_medium=${channel}` : "");
  const text = (ja
    ? "インド式数学のゲームで一緒にあそぼう！🐉 暗算でモンスターをたおすよ。無料だよ👇"
    : "Play this Vedic maths game with me! 🐉 Beat monsters with mental maths — it's free 👇")
    + (extra ? `\n${extra}` : "");

  useEffect(() => {
    const o = window.location.origin;
    let live = true;
    QRCode.toString(`${o}/?utm_source=invite&utm_medium=qr`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1d1b33", light: "#ffffff" } })
      .then((svg) => { if (live) { setQr(svg); setOrigin(o); } })
      .catch(() => { if (live) setOrigin(o); });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { live = false; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  async function nativeShare() {
    track("invite_share", { channel: "share-menu" });
    const url = linkFor("share");
    try {
      if (navigator.share) { await navigator.share({ title: ja ? "インド式数学ゲーム" : "Vedic Maths game", text, url }); return; }
    } catch { return; }
    void copy();
  }
  async function copy() {
    track("invite_share", { channel: "copy" });
    try {
      await navigator.clipboard.writeText(`${text} ${linkFor("copy")}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <>
      <div className="menu-overlay share-overlay" onClick={onClose} />
      <div className="share-sheet invite-sheet" role="dialog" aria-modal="true" aria-label={ja ? "友だちを招待" : "Invite friends"}>
        <div className="share-sheet-head">
          <div>
            <div className="share-sheet-title">🎁 {ja ? "友だちを招待" : "Invite friends"}</div>
            <div className="share-sheet-sub">{ja ? "いっしょにやると、もっと楽しい！" : "It's more fun together!"}</div>
          </div>
          <button className="share-close" onClick={onClose} aria-label={ja ? "とじる" : "Close"}>✕</button>
        </div>

        <p className="invite-text">{text}</p>

        <button className="btn btn-primary invite-main" onClick={nativeShare}>📤 {ja ? "シェアする" : "Share"}</button>

        <div className="invite-grid">
          {CHANNELS.map((c) => (
            <a
              key={c.id}
              className="invite-ch"
              href={origin ? c.href(text, linkFor(c.id)) : "#"}
              target={c.id === "sms" || c.id === "email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={() => track("invite_share", { channel: c.id })}
            >
              <span className="invite-ch-ico" style={{ background: c.color }}>{c.icon}</span>
              <span className="invite-ch-lab">{c.label}</span>
            </a>
          ))}
          <button className="invite-ch" onClick={copy}>
            <span className="invite-ch-ico" style={{ background: "#7a58c0" }}>{copied ? "✅" : "🔗"}</span>
            <span className="invite-ch-lab">{copied ? (ja ? "コピーした" : "Copied") : (ja ? "リンクをコピー" : "Copy link")}</span>
          </button>
        </div>

        <div className="invite-qr-row">
          <div className="invite-qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR" />
          <div className="invite-qr-text">
            <b>{ja ? "近くの友だちに" : "Friend next to you?"}</b>
            <span>{ja ? "このQRコードをスマホのカメラで読みこんでもらおう" : "Let them scan this with their phone camera"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
