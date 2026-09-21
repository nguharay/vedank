"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signIn } from "@/auth";
import { COUNTRY_CODES } from "@/lib/countries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PHONE_RE = /^[0-9]{6,15}$/;

export type AuthActionResult = { error: string } | undefined;

export async function signupAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const country = String(formData.get("country") || "").trim().toUpperCase();
  const phoneCodeRaw = String(formData.get("phoneCode") || "").trim();
  const phoneRaw = String(formData.get("phone") || "").replace(/[\s-]/g, "");
  const langRaw = String(formData.get("lang") || "en");
  const preferredLang = langRaw === "ja" ? "ja" : "en";

  if (!name) return { error: "Enter your name." };
  if (!USERNAME_RE.test(username))
    return { error: "Username must be 3–20 characters, using letters, numbers or underscore." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!COUNTRY_CODES.has(country)) return { error: "Choose your country." };
  if (phoneRaw && !PHONE_RE.test(phoneRaw))
    return { error: "Enter a valid phone number, digits only." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return { error: "An account with that email already exists." };
  const takenName = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (takenName[0]) return { error: "That username is taken — try another." };

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    name,
    username,
    email,
    passwordHash,
    preferredLang,
    country,
    phoneCode: phoneRaw ? phoneCodeRaw : null,
    phone: phoneRaw || null,
  });

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
