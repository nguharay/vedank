"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { signupAction } from "@/lib/actions/auth-actions";
import { Mascot } from "@/components/game/Mascot";
import { useLang } from "@/components/game/i18n";
import { COUNTRIES } from "@/lib/countries";

const COPY = {
  en: {
    kicker: "Free · takes a minute",
    title: "Begin Your Indian Style Mathematics Journey",
    sub: "Ancient shortcuts, modern speed. Make an account so your stars, streaks and stages are always waiting for you.",
    lang: "Pick your language",
    name: "Your name",
    namePh: "Your name",
    username: "Username",
    usernamePh: "sutra_ninja",
    usernameHint: "3–20 characters · letters, numbers or _ · this is what the leaderboard shows",
    email: "Email",
    emailPh: "you@example.com",
    emailHint: "Used to sign back in and save your progress.",
    country: "Country",
    countryPh: "Choose your country",
    phone: "Phone",
    optional: "optional",
    phonePh: "90000 00000",
    phoneHint: "Only if you'd like updates. We'll never share it.",
    password: "Password",
    passwordHint: "At least 8 characters. Make it tricky — you're a mental-maths pro now.",
    strength: ["Too short", "Getting there", "Good", "Strong", "Unbreakable"],
    submit: "Create my account",
    pending: "Setting up your dojo…",
    have: "Already playing?",
    signin: "Sign in",
    perks: ["Your stars and stages saved forever", "Daily streaks and mystery chests", "Climb the global leaderboard"],
  },
  ja: {
    kicker: "無料・1分でできます",
    title: "インド式数学の冒険をはじめよう",
    sub: "古代の裏ワザで、計算はもっと速く。アカウントを作れば、星もステージも連続記録もぜんぶ保存されます。",
    lang: "言語をえらぶ",
    name: "お名前",
    namePh: "なんて呼べばいい？",
    username: "ユーザー名",
    usernamePh: "sutra_ninja",
    usernameHint: "3〜20文字・英数字と _ ・ランキングに表示されます",
    email: "メールアドレス",
    emailPh: "you@example.com",
    emailHint: "ログインと進行状況の保存に使います。",
    country: "国",
    countryPh: "国をえらんでください",
    phone: "電話番号",
    optional: "任意",
    phonePh: "90 0000 0000",
    phoneHint: "お知らせがほしい方のみ。共有はしません。",
    password: "パスワード",
    passwordHint: "8文字以上。あなたはもう暗算の達人――むずかしくしよう。",
    strength: ["みじかすぎ", "もう少し", "いいね", "つよい", "かんぺき"],
    submit: "アカウントを作る",
    pending: "道場を準備中…",
    have: "すでにプレイ中？",
    signin: "ログイン",
    perks: ["星とステージをずっと保存", "毎日の連続記録とミステリーボックス", "世界ランキングに挑戦"],
  },
};

function scorePassword(pw: string): number {
  if (pw.length < 8) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}


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

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);
  /* Japanese by default for a Japanese browser; the choice is shared with the
     sign-in screen and the game. */
  const { lang, setLang } = useLang("ja");
  const fromRef = useFromField();
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const c = COPY[lang];

  const dial = useMemo(() => COUNTRIES.find((x) => x.code === country)?.dial ?? "", [country]);
  const strength = scorePassword(password);

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-wide">
        {/* Built from vedank-mark.png — the tree the brand actually uses. The old
            vedank-full.png lockup carried a different, older tree baked in. */}
        <div className="auth-lockup">
          <img src="/brand/vedank-mark.png" alt="" className="auth-lockup-tree" />
          <div className="auth-lockup-words">
            {lang === "ja" ? (
              <>
                <span className="auth-lockup-name">VedAnk Academy</span>
                <span className="auth-lockup-tag">Unleashing Brainpower &amp; Creativity</span>
              </>
            ) : (
              <>
                <span className="auth-lockup-name">Sutra Sprint</span>
                <span className="auth-lockup-tag">Indian-style mental maths, as a game</span>
              </>
            )}
          </div>
        </div>
        <div className="auth-mascot">
          <Mascot mood="excited" />
        </div>
        <div className="auth-kicker">{c.kicker}</div>
        <h1>{c.title}</h1>
        <p className="sub">{c.sub}</p>

        <ul className="auth-perks">
          {c.perks.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <form action={formAction}>
          <input type="hidden" name="from" defaultValue="/" ref={fromRef} />
          <div className="field">
            <label>{c.lang}</label>
            <div className="lang-toggle">
              <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
                English
              </button>
              <button type="button" className={lang === "ja" ? "active" : ""} onClick={() => setLang("ja")}>
                日本語
              </button>
            </div>
            <input type="hidden" name="lang" value={lang} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="name">{c.name}</label>
              <input id="name" name="name" type="text" required autoComplete="name" placeholder={c.namePh} />
            </div>
            <div className="field">
              <label htmlFor="username">{c.username}</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                pattern="[a-zA-Z0-9_]{3,20}"
                autoComplete="username"
                placeholder={c.usernamePh}
              />
            </div>
          </div>
          <p className="field-hint">{c.usernameHint}</p>

          <div className="field">
            <label htmlFor="email">{c.email}</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder={c.emailPh} />
            <p className="field-hint">{c.emailHint}</p>
          </div>

          <div className="field">
            <label htmlFor="country">{c.country}</label>
            <select
              id="country"
              name="country"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="" disabled>
                {c.countryPh}
              </option>
              {COUNTRIES.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.flag} {lang === "ja" ? x.nameJa : x.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="phone">
              {c.phone} <span className="field-optional">{c.optional}</span>
            </label>
            <div className="phone-row">
              {/* Keyed on the dial code so choosing a country remounts this with
                  that country's code already selected — one less thing to pick,
                  and it makes clear the code does not belong in the field beside it. */}
              <select name="phoneCode" key={dial} aria-label="Country code" defaultValue={dial}>
                <option value="">+—</option>
                {COUNTRIES.map((x) => (
                  <option key={x.code} value={x.dial}>
                    {x.flag} {x.dial}
                  </option>
                ))}
              </select>
              {/* The placeholder deliberately omits the dial code: the selector
                  beside it already carries that, and showing "+91 …" here had
                  people typing the + into the number, which validation refused. */}
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={c.phonePh}
              />
            </div>
            <p className="field-hint">{c.phoneHint}</p>
          </div>

          <div className="field">
            <label htmlFor="password">{c.password}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="pw-meter" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < strength ? `on s${strength}` : ""} />
              ))}
            </div>
            <p className="field-hint">
              {password ? c.strength[strength] : c.passwordHint}
            </p>
          </div>

          {state?.error && <div className="auth-error">{state.error}</div>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? c.pending : c.submit}
          </button>
        </form>

        <div className="auth-switch">
          {c.have} <Link href="/login">{c.signin}</Link>
        </div>
      </div>
    </div>
  );
}
