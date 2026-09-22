import { auth } from "@/auth";

/* The one account that may read the signup register. Kept here rather than in
   the database so revoking it is a deploy, not an UPDATE someone could fat-finger.
   ADMIN_EMAILS (comma-separated) can add more without a code change. */
const DEFAULT_ADMINS = ["nguharay@gmail.com"];

export function adminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMINS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/* Resolves the signed-in admin, or null. Every admin entry point calls this on
   the server — the nav link being hidden is cosmetic, not the control. */
export async function getAdminSession(): Promise<{ email: string } | null> {
  const session = await auth();
  const email = session?.user?.email;
  return isAdminEmail(email) ? { email: email as string } : null;
}
