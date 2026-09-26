"use server";

import { auth } from "@/auth";
import { addOwnerRow, ownerSheetEnabled } from "@/lib/owner-notify";

/* "Learn with a teacher" enquiries. Nothing is stored in the app: each one is
   added as a row to the owner's Google Sheet ("Enquiries" tab). Setup: ~/vedank-sheet-setup.md. */

export type InterestInput = {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  mode: "online" | "in-person" | "either";
  learner: "child" | "adult" | "teacher-school";
  grade?: string;
  message?: string;
  lang: "ja" | "en";
  source?: string;
  /* honeypot — a real person never fills this */
  website?: string;
};

const clip = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, n);

export async function submitInterestAction(input: InterestInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ja = input.lang === "ja";
  if (input.website) return { ok: true }; // bot: pretend it worked

  const name = clip(input.name, 80);
  const email = clip(input.email, 120).toLowerCase();
  if (!name) return { ok: false, error: ja ? "お名前を入力してください。" : "Please enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: ja ? "メールアドレスを確認してください。" : "Please check your email address." };

  if (!ownerSheetEnabled()) {
    console.error("[interest] sheet not configured — enquiry not saved:", name, email);
    return { ok: false, error: ja ? "ただいま送信できません。しばらくしてからお試しください。" : "Sorry, this can't be sent right now. Please try again later." };
  }

  const session = await auth().catch(() => null);
  const mode = ["online", "in-person", "either"].includes(input.mode) ? input.mode : "either";
  const learner = ["child", "adult", "teacher-school"].includes(input.learner) ? input.learner : "child";
  const MODE = { online: "Online", "in-person": "In person (Japan)", either: "Either" }[mode];
  const WHO = { child: "Child", adult: "Adult", "teacher-school": "Teacher / school" }[learner];
  const saved = await addOwnerRow("Enquiries", {
    Name: name,
    Email: email,
    Phone: clip(input.phone, 40),
    City: clip(input.city, 80),
    "Online / in person": MODE,
    "Who is learning": WHO,
    "Grade / age": clip(input.grade, 40),
    Message: clip(input.message, 1000),
    Language: input.lang === "en" ? "English" : "日本語",
    "Clicked from": clip(input.source, 40),
    "App account": session?.user?.email ?? "",
  });
  if (!saved) return { ok: false, error: ja ? "送信に失敗しました。もう一度お試しください。" : "Couldn't send. Please try again." };
  return { ok: true };
}
