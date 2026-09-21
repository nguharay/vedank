"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signupAction } from "@/lib/actions/auth-actions";
import { Mascot } from "@/components/game/Mascot";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);
  const [lang, setLang] = useState<"en" | "ja">("en");

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="VedAnk Academy" className="auth-logo" />
        <div className="auth-mascot">
          <Mascot mood="excited" />
        </div>
        <h1>{lang === "ja" ? "冒険をはじめよう" : "Start your journey"}</h1>
        <p className="sub">{lang === "ja" ? "アカウントを作って星とステージを保存しよう。" : "Create an account to save your stars and stages."}</p>
        <form action={formAction}>
          <div className="field">
            <label>{lang === "ja" ? "言語" : "Language"}</label>
            <div className="lang-toggle">
              <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
              <button type="button" className={lang === "ja" ? "active" : ""} onClick={() => setLang("ja")}>日本語</button>
            </div>
            <input type="hidden" name="lang" value={lang} />
          </div>
          <div className="field">
            <label htmlFor="name">{lang === "ja" ? "名前" : "Name"}</label>
            <input id="name" name="name" type="text" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">{lang === "ja" ? "メールアドレス" : "Email"}</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">{lang === "ja" ? "パスワード" : "Password"}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {state?.error && <div className="auth-error">{state.error}</div>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? (lang === "ja" ? "作成中…" : "Creating account…") : lang === "ja" ? "アカウント作成" : "Create account"}
          </button>
        </form>
        <div className="auth-switch">
          {lang === "ja" ? "すでにプレイ中？" : "Already playing?"} <Link href="/login">{lang === "ja" ? "ログイン" : "Sign in"}</Link>
        </div>
      </div>
    </div>
  );
}
