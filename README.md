# Sutra Sprint

A Vedic Math game built from the book's techniques — 14 sutras as stage-based
lessons (5 stages each, escalating difficulty, star ratings), an interactive
matchstick puzzle dojo, and mixed question formats (typed, multiple choice,
tap-target, true/false).

Every player has their own account and progress is saved server-side, so it
follows them across devices.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Auth.js (NextAuth v5)** — email/password via the Credentials provider,
  passwords hashed with bcrypt, JWT sessions
- **Neon Postgres** (via the Vercel Marketplace) with **Drizzle ORM**
- Deployed on **Vercel**, auto-deploying on every push to `main`

## Local development

```bash
npm install
npx dotenv -e .env.local -- npx next dev
```

`.env.local` holds the Neon connection strings (provisioned automatically by
the Vercel Neon integration) plus `AUTH_SECRET`. Pull the latest with:

```bash
vercel env pull .env.local
```

## Engagement loop

Beyond the lessons, three systems give a reason to come back:

- **Daily Quests** — three goals per calendar day, chosen deterministically from
  the date so everyone gets the same set. Progress is reported by gameplay
  (`reportQuestEvent`) and claimed for gems.
- **Shop** — the sink for gems, which previously only accumulated. Everything on
  sale helps a player keep going (hint, extra 50/50, Blitz time boost, streak
  freeze); nothing gates play behind a purchase and nothing costs money. Level is
  derived from lesson progress alone, so spending can never de-level anyone.
- **Mistake Bank** — a wrong answer is banked and resurfaces in *Fix Your
  Misses*. Two clean fixes retire a question; missing it again un-retires it.

Friends are **code-only** (`VEDA-XXXXXX`): there is deliberately no way to search
for a player by name or email, and a friend sees only display name, level and
streak. Duels are asynchronous — send your Blitz score, they get one run to beat
it, and the result settles once.

Run the suites against a real database:

```bash
npx dotenv -e .env.local -- npx tsx scripts/test-engagement.ts
npx dotenv -e .env.local -- npx tsx scripts/test-social.ts
```

Both create throwaway `@test.local` users and delete them afterwards.

## Schema changes

Edit `src/db/schema.ts`, then push it to the database:

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```
