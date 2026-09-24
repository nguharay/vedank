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

**In a web SQL console** (Vercel's Query tab, and anything else that sends the
whole buffer as one prepared statement) use `setup-db-single.sql` instead — the
same schema wrapped in one PL/pgSQL block, because those consoles reject
multi-statement input with "cannot insert multiple commands into a prepared
statement". Turn off the console's Read-only toggle first, or the DDL is refused.

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

## Schema changes

`migrations/` holds one SQL file per change, each a single idempotent `DO`
block. They are replayed on every build by `scripts/migrate.ts`, which is
wired into `npm run build` — so a deploy applies them automatically using the
deploy environment's `DATABASE_URL`. A build with no `DATABASE_URL` skips
them; a migration that fails stops the build rather than shipping code that
expects a column the database does not have.

Run them by hand against any database with:

```bash
DATABASE_URL="postgres://…" npm run migrate
```
