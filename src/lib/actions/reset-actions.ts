"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";

const TOKEN_TTL_MINUTES = 30;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type RequestResetResult =
  | { error: string }
  | { ok: true; devLink?: string }
  | undefined;

// No email provider is configured yet (by explicit choice). Until one is
// added, the reset link is handed back directly instead of emailed — so
// this is a development convenience, not something a real, un-trusted user
// should rely on in production.
export async function requestPasswordResetAction(
  _prev: RequestResetResult,
  formData: FormData
): Promise<RequestResetResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  // Always report success either way, so this can't be used to check
  // which emails have accounts.
  if (!user) return { ok: true };

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
  });

  return { ok: true, devLink: `/reset-password/${token}` };
}

export type ResetPasswordResult = { error: string } | { ok: true } | undefined;

export async function resetPasswordAction(
  token: string,
  _prev: ResetPasswordResult,
  formData: FormData
): Promise<ResetPasswordResult> {
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = getDb();
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  const record = rows[0];
  if (!record) return { error: "This reset link is invalid or has expired." };

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(users)
    .set({ passwordHash, failedAttempts: 0, lockedUntil: null })
    .where(eq(users.id, record.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, record.id));

  return { ok: true };
}
