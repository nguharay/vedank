"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { Mascot } from "@/components/game/Mascot";
import { useLang } from "@/components/game/i18n";

/* The sign-in screen is the first page a shared link lands on, so it repeats
   the pitch rather than asking for a password cold. Japanese first — that is
   who the link is being shared with — with English kept alongside. */
const COPY = {
  en: {
    kicker: "VEDANK ACADEMY",
    hero: "Indian-style mental maths, as a game",
    tagline: "Think it. Spot it. Take it on.",
    pitch:
      "A game that doesn't just teach Indian calculation methods — it teaches you to see mathematics differently.",
    title: "Welcome back",
    sub: "Sign in to keep your streak alive.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in…",
    forgot: "Forgot password?",
    newHere: "New here?",
    create: "Create an account",
    lang: "Language",
  },
  ja: {
    kicker: "VEDANK ACADEMY",
    hero: "インド式算数ゲーム",
    tagline: "考えて、ひらめいて、挑戦しよう！",
    pitch: "インド式算数を覚えるアプリではなく、数学の「見方」を発見するゲーム。",
    title: "おかえりなさい",
    sub: "ログインして、連続記録をつづけよう。",
    email: "メールアドレス",
    password: "パスワード",
    submit: "ログイン",
    pending: "ログインしています…",
    forgot: "パスワードをお忘れですか？",
    newHere: "はじめての方は",
    create: "アカウントを作成",
    lang: "言語",
  },
} as const;


/* The middleware puts the page you were bounced from in `?from=`, and an
   invite link needs it to survive the sign-in. Written straight into the
   hidden field rather than held in state: it is a DOM value the form reads on
   submit, never something the page renders. Reading location instead of
   useSearchParams also keeps the page static — no Suspense for one string. */
function useFromField() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("from");
      if (v && v.startsWith("/") && !v.startsWith("//") && ref.current) ref.current.value = v;
    } catch {}
  }, []);
  return ref;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  /* Shared with the game, so the language picked here carries through after
     sign-in — and a Japanese browser lands on Japanese by default. */
  const { lang, setLang } = useLang("ja");
  const fromRef = useFromField();
  const c = COPY[lang];

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="VedAnk Academy" className="auth-logo" />

        <div className="auth-hero">
          <div className="auth-kicker">{c.kicker}</div>
          <div className="auth-hero-title">{c.hero}</div>
          <div className="auth-hero-tagline">{c.tagline}</div>
          <p className="auth-hero-pitch">{c.pitch}</p>
        </div>

        <div className="auth-mascot">
          <Mascot mood="happy" />
        </div>
        <h1>{c.title}</h1>
        <p className="sub">{c.sub}</p>

        <div className="lang-toggle auth-lang">
          <button type="button" className={lang === "ja" ? "active" : ""} onClick={() => setLang("ja")}>
            日本語
          </button>
          <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
            English
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="from" defaultValue="/" ref={fromRef} />
          <div className="field">
            <label htmlFor="email">{c.email}</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">{c.password}</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state?.error && <div className="auth-error">{state.error}</div>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? c.pending : c.submit}
          </button>
        </form>
        <div className="auth-switch">
          <Link href="/forgot-password">{c.forgot}</Link>
        </div>
        <div className="auth-switch">
          {c.newHere} <Link href="/signup">{c.create}</Link>
        </div>
        <Link className="auth-try" href="/try">
          {lang === "ja" ? "▶ アカウントなしで遊んでみる" : "▶ Just play — no account needed"}
        </Link>
      </div>
    </div>
  );
}
