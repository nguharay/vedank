"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/reset-actions";
import { Mascot } from "@/components/game/Mascot";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const actionWithToken = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState(actionWithToken, undefined);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="VedAnk Academy" className="auth-logo" />
        <div className="auth-mascot">
          <Mascot mood={state && "ok" in state ? "excited" : "happy"} />
        </div>
        <h1>Choose a new password</h1>

        {state && "ok" in state ? (
          <>
            <p className="sub">Your password has been updated.</p>
            <Link href="/login">
              <button className="btn btn-primary auth-submit" type="button">
                Sign in
              </button>
            </Link>
          </>
        ) : (
          <form action={formAction}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            {state?.error && <div className="auth-error">{state.error}</div>}
            <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save new password"}
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
