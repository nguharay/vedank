"use client";

import { useState } from "react";
import { submitInterestAction, type InterestInput } from "@/lib/actions/interest-actions";
import { Mascot } from "@/components/game/Mascot";

/* Direct ways to reach the teacher, shown under the form. */
const CONTACTS = [
  { key: "tel", href: "tel:+817084553125", icon: "📞", en: "Call", ja: "電話", sub: "+81-708-455-3125", color: "#2E7D32" },
  { key: "line", href: "https://line.me/ti/p/BATZBOmDb8", icon: "🟩", en: "LINE", ja: "LINE", sub: "Add friend", color: "#06C755" },
  { key: "fb", href: "https://www.facebook.com/vedankacademy", icon: "👍", en: "Facebook", ja: "Facebook", sub: "vedankacademy", color: "#1877F2" },
  { key: "ig", href: "https://www.instagram.com/vedankac/", icon: "📸", en: "Instagram", ja: "Instagram", sub: "@vedankac", color: "#D62976" },
  { key: "mail", href: "mailto:vedankac@gmail.com", icon: "✉️", en: "Email", ja: "メール", sub: "vedankac@gmail.com", color: "#E8631C" },
  { key: "wa", href: "https://wa.me/817084663784", icon: "💬", en: "WhatsApp", ja: "WhatsApp", sub: "+81 70-8466-3784", color: "#25D366" },
] as const;

export function ContactLinks({ lang }: { lang: "ja" | "en" }) {
  const ja = lang === "ja";
  return (
    <div className="contact-box">
      <div className="contact-title">{ja ? "直接お問い合わせもOK 👇" : "Prefer to talk? Contact us directly 👇"}</div>
      <div className="contact-grid">
        {CONTACTS.map((c) => (
          <a key={c.key} className="contact-btn" href={c.href} target={c.key === "tel" || c.key === "mail" ? undefined : "_blank"} rel="noopener noreferrer"
            style={{ "--c": c.color } as React.CSSProperties}>
            <span className="contact-ic" aria-hidden="true">{c.icon}</span>
            <span className="contact-txt">
              <span className="contact-name">{ja ? c.ja : c.en}</span>
              <span className="contact-sub">{c.key === "line" ? (ja ? "友だち追加" : "Add friend") : c.sub}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* Header card for the form: mascot, headline and the three offers. */
export function ClassesHero({ lang }: { lang: "ja" | "en" }) {
  const ja = lang === "ja";
  return (
    <div className="classes-hero">
      <div className="classes-hero-mascot"><Mascot mood="excited" /></div>
      <div className="classes-hero-text">
        <div className="classes-hero-kicker">{ja ? "オンライン ・ 対面（日本）" : "Online · In person in Japan"}</div>
        <div className="classes-hero-title">{ja ? "先生と一緒に、インド式数学！" : "Learn Vedic Maths with a teacher!"}</div>
        <div className="classes-hero-tags">
          <span>🧒 {ja ? "子ども" : "Kids"}</span><span>🧑 {ja ? "大人" : "Adults"}</span><span>👩‍🏫 {ja ? "先生・学校" : "Teachers"}</span>
        </div>
      </div>
    </div>
  );
}

type Opt<T extends string> = { v: T; icon: string; en: string; ja: string };
const MODES: Opt<InterestInput["mode"]>[] = [
  { v: "online", icon: "💻", en: "Online", ja: "オンライン" },
  { v: "in-person", icon: "🏫", en: "In person", ja: "対面（日本）" },
  { v: "either", icon: "✨", en: "Either", ja: "どちらでも" },
];
const LEARNERS: Opt<InterestInput["learner"]>[] = [
  { v: "child", icon: "🧒", en: "Child", ja: "子ども" },
  { v: "adult", icon: "🧑", en: "Adult", ja: "大人" },
  { v: "teacher-school", icon: "👩‍🏫", en: "Teacher / school", ja: "先生・学校" },
];

/* The "learn with a teacher" form. Used in the in-app sheet and on /classes. */
export function InterestForm({ lang, source, onDone }: { lang: "ja" | "en"; source: string; onDone?: () => void }) {
  const ja = lang === "ja";
  const [f, setF] = useState<Omit<InterestInput, "lang" | "source">>({
    name: "", email: "", phone: "", city: "", mode: "either", learner: "child", grade: "", message: "", website: "",
  });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) { setErr(ja ? "連絡に同意してください。" : "Please agree to be contacted."); return; }
    setBusy(true); setErr(null);
    const res = await submitInterestAction({ ...f, lang, source });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="interest-done">
        <div className="interest-burst" aria-hidden="true">{["🎉", "⭐", "✨", "🎈", "🌸", "⭐"].map((e, i) => <span key={i} style={{ "--k": i } as React.CSSProperties}>{e}</span>)}</div>
        <div className="interest-done-mascot"><Mascot mood="excited" /></div>
        <h3>{ja ? "ありがとうございます！" : "Thank you!"}</h3>
        <p>{ja ? "内容を受け取りました。近日中にご連絡します。" : "We've got your details and will be in touch soon."}</p>
        <ContactLinks lang={lang} />
        {onDone && <button className="btn btn-primary" onClick={onDone}>{ja ? "閉じる" : "Close"}</button>}
      </div>
    );
  }

  const pick = <T extends string>(name: "mode" | "learner", opts: Opt<T>[], value: T) => (
    <div className="pick-grid" role="radiogroup">
      {opts.map((o) => (
        <button type="button" key={o.v} role="radio" aria-checked={value === o.v}
          className={`pick-card${value === o.v ? " on" : ""}`}
          onClick={() => setF((p) => ({ ...p, [name]: o.v }))}>
          <span className="pick-ic">{o.icon}</span>
          <span className="pick-label">{ja ? o.ja : o.en}</span>
        </button>
      ))}
    </div>
  );

  return (
    <form className="interest-form" onSubmit={submit}>
      <section className="if-step">
        <div className="if-step-head"><span className="if-num">1</span>{ja ? "あなたについて" : "About you"}</div>
        <label className="if-field"><span className="if-ic">🙂</span>
          <input value={f.name} onChange={set("name")} required maxLength={80} autoComplete="name" placeholder={ja ? "お名前 *" : "Your name *"} /></label>
        <label className="if-field"><span className="if-ic">✉️</span>
          <input type="email" value={f.email} onChange={set("email")} required maxLength={120} autoComplete="email" placeholder={ja ? "メールアドレス *" : "Email *"} /></label>
        <div className="if-row">
          <label className="if-field"><span className="if-ic">📱</span>
            <input type="tel" value={f.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" placeholder={ja ? "電話（任意）" : "Phone (optional)"} /></label>
          <label className="if-field"><span className="if-ic">📍</span>
            <input value={f.city} onChange={set("city")} maxLength={80} placeholder={ja ? "地域（任意）" : "City (optional)"} /></label>
        </div>
      </section>

      <section className="if-step">
        <div className="if-step-head"><span className="if-num">2</span>{ja ? "どうやって学ぶ？" : "How would you like to learn?"}</div>
        {pick("mode", MODES, f.mode)}
        <div className="if-sublabel">{ja ? "学ぶのはだれ？" : "Who is learning?"}</div>
        {pick("learner", LEARNERS, f.learner)}
        <label className="if-field"><span className="if-ic">🎒</span>
          <input value={f.grade} onChange={set("grade")} maxLength={40} placeholder={ja ? "学年・年齢（任意）" : "Grade / age (optional)"} /></label>
      </section>

      <section className="if-step">
        <div className="if-step-head"><span className="if-num">3</span>{ja ? "ひとこと" : "Anything else?"}</div>
        <textarea value={f.message} onChange={set("message")} maxLength={1000} rows={3}
          placeholder={ja ? "ご希望の曜日・時間、質問など（任意）" : "Preferred days/times, questions… (optional)"} />
      </section>

      {/* honeypot, hidden from people */}
      <input className="interest-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} aria-hidden="true" />
      <label className="interest-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{ja ? "授業についての連絡を受け取ることに同意します。" : "I agree to be contacted about classes."}</span>
      </label>
      {err && <div className="auth-error">{err}</div>}
      <button className="if-submit" type="submit" disabled={busy}>
        {busy ? "…" : <>{ja ? "送信する" : "Send"} <span aria-hidden="true">🚀</span></>}
      </button>
      <ContactLinks lang={lang} />
    </form>
  );
}
