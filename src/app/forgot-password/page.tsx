"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/reset-actions";
import { Mascot } from "@/components/game/Mascot";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="" className="auth-logo" />
        <div className="auth-mascot">
          <Mascot mood="happy" />
        </div>
        <h1>Reset your password</h1>
        <p className="sub">Enter the email on your account and we&rsquo;ll get you a reset link.</p>

        {state && "ok" in state ? (
          <>
            <div className="auth-error" style={{ background: "#D7FFB8", color: "#3E9401" }}>
              If that email has an account, a reset link is ready.
            </div>
            {state.devLink && (
              <div className="field">
                <label>Dev-mode link (no email service is configured yet)</label>
                <p style={{ wordBreak: "break-all", marginTop: 6 }}>
                  <Link href={state.devLink}>{state.devLink}</Link>
                </p>
              </div>
            )}
          </>
        ) : (
          <form action={formAction}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            {state?.error && <div className="auth-error">{state.error}</div>}
            <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
