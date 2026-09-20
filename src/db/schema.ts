import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
