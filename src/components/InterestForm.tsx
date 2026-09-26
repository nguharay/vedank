"use client";

import { useState } from "react";
import { submitInterestAction, type InterestInput } from "@/lib/actions/interest-actions";
import { Mascot } from "@/components/game/Mascot";

/* Brand marks (Simple Icons, CC0) and plain phone / mail glyphs, all on a 24×24 grid. */
const ICON_PATHS: Record<string, string> = {
  tel: "M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z",
  line: "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314",
  fb: "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  ig: "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 7.2L20 6.5V6H4v.5l8 4.7zM4 8.8V18h16V8.8l-8 4.7-8-4.7z",
  wa: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
};

/* Direct ways to reach Ray先生, shown under the form. */
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
      <div className="contact-title">{ja ? "Ray先生に直接お問い合わせもOK 👇" : "Prefer to talk? Contact Ray Sensei directly 👇"}</div>
      <div className="contact-grid">
        {CONTACTS.map((c) => (
          <a key={c.key} className="contact-btn" href={c.href} target={c.key === "tel" || c.key === "mail" ? undefined : "_blank"} rel="noopener noreferrer"
            style={{ "--c": c.color } as React.CSSProperties}>
            <span className="contact-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d={ICON_PATHS[c.key]} fill="#fff" /></svg>
            </span>
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
        <div className="classes-hero-title">{ja ? "Ray先生と一緒に、インド式数学！" : "Learn Vedic Maths with Ray Sensei!"}</div>
        <div className="classes-hero-tags">
          <span>🧒 {ja ? "子ども" : "Kids"}</span><span>🧑 {ja ? "大人" : "Adults"}</span><span>📚 {ja ? "先生・学校" : "Teachers"}</span>
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
  { v: "teacher-school", icon: "📚", en: "Teacher / school", ja: "先生・学校" },
];

/* The "learn with a teacher" form. Used in the in-app sheet and on /classes. */
export function InterestForm({ lang, source, onDone, onClose }: { lang: "ja" | "en"; source: string; onDone?: () => void; onClose?: () => void }) {
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
        <p>{ja ? "内容を受け取りました。近日中にRay先生からご連絡します。" : "Ray Sensei has your details and will be in touch soon."}</p>
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
      {onClose && (
        <button type="button" className="if-close" onClick={onClose}>{ja ? "閉じる" : "Close"}</button>
      )}
    </form>
  );
}
