# Deploying a second instance

This repo already runs at one GitHub + Vercel pair. These are the steps to stand
up an independent one — **its own database, its own users**, sharing only the code.

## 1. Push the code

The repo histories share a root commit, so this is a fast-forward — nothing is
overwritten and the existing commits stay as the base of the history.

```bash
git remote add vedank https://github.com/nguharay/vedank.git
git push vedank main
```

## 2. Create the database

In the Vercel project: **Storage → Create → Neon Postgres**. Attaching it sets
`DATABASE_URL` and `DATABASE_URL_UNPOOLED` on the project automatically.

Then create the tables. `setup-db.sql` is generated from the live schema of the
first instance, dependency-ordered and idempotent:

```bash
psql "$DATABASE_URL" -f setup-db.sql
```

No psql? `npx dotenv -e .env.local -- npx drizzle-kit push` produces the same
schema from `src/db/schema.ts`.

15 tables: `users`, `topic_progress`, `arena_progress`, `daily_challenge`,
`league_points`, `password_reset_tokens`, `inventory`, `quest_progress`,
`mistakes`, `friendships`, `challenges`, `classrooms`, `class_members`,
`competitions`, `competition_entries`.

## 3. Set the environment variables

Vercel → Settings → Environment Variables. See `.env.example` for the full list.
The one you must not copy from the other instance:

```bash
openssl rand -base64 32   # → AUTH_SECRET
```

A fresh secret per deployment. Sharing one means sessions minted by either
instance validate on both.

## 4. Admin access

`/admin` (the signup register) is limited to the addresses in
`src/lib/admin.ts` plus anything in the `ADMIN_EMAILS` environment variable.
`nguharay@gmail.com` is allowed by default. To add someone without touching the
code, set `ADMIN_EMAILS=someone@example.com` on the project.

## 5. Check it

- `/` redirects to `/login` when signed out
- Sign up, and the new account appears in `/admin`
- `/classroom` lets you create a class and read back its join code

## What is not shared

Users, progress, streaks, gems, friendships, classrooms and competitions all
live in the database, so a separate database means a genuinely separate app.
Only the code is common.
