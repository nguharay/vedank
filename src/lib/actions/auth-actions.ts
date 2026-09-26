"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signIn } from "@/auth";
import { COUNTRY_CODES } from "@/lib/countries";
import { addOwnerRow } from "@/lib/owner-notify";

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
  /* Everything non-numeric goes: the field sits next to a dial-code selector
     whose placeholder used to show "+91 …", so people typed the + and the old
     strip (spaces and hyphens only) left it in place — then validation rejected
     it as "digits only", which is a confusing thing to be told about a number
     you were shown how to type. Brackets get the same treatment. */
  const phoneRaw = String(formData.get("phone") || "").replace(/\D/g, "");
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

  /* Every new registration becomes a row in the owner's sheet ("Registrations"
     tab). Best effort and time-boxed (8s): a slow Google must never block a sign-up. */
  await addOwnerRow("Registrations", {
    Name: name,
    Username: username,
    Email: email,
    Country: country,
    Phone: phoneRaw ? `${phoneCodeRaw} ${phoneRaw}` : "",
    Language: preferredLang === "ja" ? "日本語" : "English",
  }).catch(() => false);

  await signIn("credentials", { email, password, redirectTo: safeNext(formData.get("from")) });
}

/* Where to land after signing in. The middleware puts the page you were
   trying to reach in `from`, which matters for an invite link: following one
   while signed out should take you to the race, not the home screen.
   Only same-origin paths are honoured — an absolute URL here would be an open
   redirect. */
function safeNext(raw: FormDataEntryValue | null): string {
  const v = String(raw || "");
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
}

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = safeNext(formData.get("from"));
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return {
        error: "Incorrect email or password, or this account is temporarily locked after too many attempts.",
      };
    }
    throw err;
  }
}
