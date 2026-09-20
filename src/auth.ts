import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        const db = getDb();
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = rows[0];
        if (!user) return null;

        // Rate limit: an account locked from too many recent failures stays
        // locked (denied) even with the correct password until it expires.
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedAttempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            await db
              .update(users)
              .set({ failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) })
              .where(eq(users.id, user.id));
          } else {
            await db.update(users).set({ failedAttempts: attempts }).where(eq(users.id, user.id));
          }
          return null;
        }

        if (user.failedAttempts > 0 || user.lockedUntil) {
          await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
});
