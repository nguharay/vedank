import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  // login rate-limiting
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),

  // daily login streak (separate from in-stage streaks)
  lastActiveDate: date("last_active_date"),
  dailyStreak: integer("daily_streak").notNull().default(0),
  bestDailyStreak: integer("best_daily_streak").notNull().default(0),

  // daily mystery chest — gems granted outside of stage/arena progress
  bonusGems: integer("bonus_gems").notNull().default(0),

  // chosen at signup, used as the default UI language
  preferredLang: text("preferred_lang").notNull().default("en"),

  // short shareable code for adding friends; generated on first use
  friendCode: text("friend_code").unique(),

  // signup profile
  username: text("username").unique(),
  country: text("country"),
  phoneCode: text("phone_code"),
  phone: text("phone"),
});

export const topicProgress = pgTable(
  "topic_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id").notNull(),
    cleared: integer("cleared").notNull().default(0),
    stageStars: jsonb("stage_stars").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })]
);

export const arenaProgress = pgTable(
  "arena_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    puzzleId: text("puzzle_id").notNull(),
    solved: boolean("solved").notNull().default(false),
    bestMoves: integer("best_moves"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.puzzleId] })]
);

// one shared puzzle set per calendar day; one attempt per player
export const dailyChallenge = pgTable(
  "daily_challenge",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    correct: integer("correct").notNull().default(0),
    total: integer("total").notNull().default(0),
    elapsedMs: integer("elapsed_ms").notNull().default(0),
    points: integer("points").notNull().default(0),
    playedAt: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })]
);

// points earned inside one ISO week, which decides league standing
export const leaguePoints = pgTable(
  "league_points",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    points: integer("points").notNull().default(0),
    tier: integer("tier").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekStart] })]
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------- engagement loop: wallet, consumables, quests, review ---------- */

// The spend side of the gem wallet plus the consumables bought with it.
// Level stays derived from topic/arena progress alone, so spending gems can
// never de-level a player — only the spendable balance moves.
export const inventory = pgTable("inventory", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  spentGems: integer("spent_gems").notNull().default(0),
  hintTokens: integer("hint_tokens").notNull().default(0),
  fiftyTokens: integer("fifty_tokens").notNull().default(0),
  timeBoosts: integer("time_boosts").notNull().default(0),
  streakFreezes: integer("streak_freezes").notNull().default(0),
  // the day a freeze was spent to cover, so one absence can't be covered twice
  freezeUsedOn: date("freeze_used_on"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Three quests per calendar day, chosen deterministically from the day's seed.
// One row per quest so progress increments are single-statement upserts.
export const questProgress = pgTable(
  "quest_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    questId: text("quest_id").notNull(),
    count: integer("count").notNull().default(0),
    claimed: boolean("claimed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.questId] })]
);

// Questions answered wrong, kept for spaced review. Keyed on the prompt so the
// same question missed twice sharpens one row rather than piling up duplicates.
export const mistakes = pgTable(
  "mistakes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    topicId: text("topic_id").notNull(),
    answer: integer("answer").notNull(),
    misses: integer("misses").notNull().default(1),
    fixes: integer("fixes").notNull().default(0),
    // retired once fixed twice running — it stops surfacing but the row remains
    retired: boolean("retired").notNull().default(false),
    lastMissedAt: timestamp("last_missed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.prompt] })]
);

/* ---------- social: friends by code, head-to-head challenges ---------- */

// Stored in both directions on add, so "my friends" is one indexed read and
// there is no acceptance state to get stuck in. Adding requires knowing the
// other player's code, which is shared out of band — there is deliberately no
// way to search for a child by name or email.
export const friendships = pgTable(
  "friendships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendId: uuid("friend_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.friendId] })]
);

// One row per duel. The challenger's score is fixed at creation; the opponent
// plays once and the row closes.
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("blitz"),
  fromScore: integer("from_score").notNull(),
  toScore: integer("to_score"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});
