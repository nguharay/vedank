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

## Schema changes

Edit `src/db/schema.ts`, then push it to the database:

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```
