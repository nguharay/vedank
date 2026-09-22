# Sutra Sprint

A Vedic Math game built from the book's techniques — 25 sutra topics as stage-based
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

**Spaced repetition** — a missed question enters a Leitner ladder
(0/1/3/7/16/35 days). A correct answer promotes it one box and pushes the due
date out; a miss sends it back to box 0, due now. Graduating the last box
retires it. Only what is *due* surfaces, so the review badge never nags about
work that cannot usefully be done yet.

**Classroom** — a teacher creates a class at `/classroom` and reads the 5-character
code to the room; children join under Class in the app menu. The roster shows
level, streak, last active, assignment progress and — the useful column — the
prompts each child keeps missing. Ownership is re-checked on every teacher read
and write, a child can always leave (which immediately ends the teacher's view),
and the roster carries no email addresses.

Run the suites against a real database:

```bash
npx dotenv -e .env.local -- npx tsx scripts/test-engagement.ts
npx dotenv -e .env.local -- npx tsx scripts/test-social.ts
npx dotenv -e .env.local -- npx tsx scripts/test-srs.ts
npx dotenv -e .env.local -- npx tsx scripts/test-classroom.ts
```

Both create throwaway `@test.local` users and delete them afterwards.

## Schema changes

Edit `src/db/schema.ts`, then push it to the database:

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```
