"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { Mascot } from "@/components/game/Mascot";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="VedAnk Academy" className="auth-logo" />
        <div className="auth-mascot">
          <Mascot mood="happy" />
        </div>
        <h1>Welcome back</h1>
        <p className="sub">Sign in to keep your streak alive.</p>
        <form action={formAction}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state?.error && <div className="auth-error">{state.error}</div>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="auth-switch">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
