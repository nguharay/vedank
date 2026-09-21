"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signIn } from "@/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthActionResult = { error: string } | undefined;

export async function signupAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const langRaw = String(formData.get("lang") || "en");
  const preferredLang = langRaw === "ja" ? "ja" : "en";

  if (!name) return { error: "Enter your name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({ name, email, passwordHash, preferredLang });

  await signIn("credentials", { email, password, redirectTo: "/" });
}

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return {
        error: "Incorrect email or password, or this account is temporarily locked after too many attempts.",
      };
    }
    throw err;
  }
}
