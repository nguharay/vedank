-- Friends competitions: the same timed paper as a class competition, but
-- hosted by a player for their friends instead of by a teacher for a class.
--
-- Run once against the Neon database, e.g.
--   psql "$DATABASE_URL" -f migrate-friend-competitions.sql
-- Safe to re-run.

ALTER TABLE competitions ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'class';

-- Existing rows are all class competitions; the default already says so.
CREATE INDEX IF NOT EXISTS competitions_scope_teacher_idx
  ON competitions (scope, teacher_id);
