"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "@/lib/actions/auth-actions";
import { Mascot } from "@/components/game/Mascot";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="VedAnk Academy" className="auth-logo" />
        <div className="auth-mascot">
          <Mascot mood="excited" />
        </div>
        <h1>Start your journey</h1>
        <p className="sub">Create an account to save your stars and stages.</p>
        <form action={formAction}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
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
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="auth-switch">
          Already playing? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
