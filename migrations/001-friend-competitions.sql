-- Friends competitions: the same timed paper as a class competition, but
-- hosted by a player for their friends instead of by a teacher for a class.
--
-- Applied automatically at build time by scripts/migrate.ts. One file is one
-- statement, so it is wrapped in a DO block: that keeps it atomic, lets it
-- skip cleanly on a database where the table does not exist yet, and means
-- the runner never has to split SQL on semicolons.
DO $$
BEGIN
  IF to_regclass('public.competitions') IS NULL THEN
    RAISE NOTICE 'competitions table not created yet — nothing to migrate';
    RETURN;
  END IF;

  -- a friends competition has no class behind it
  ALTER TABLE competitions ALTER COLUMN class_id DROP NOT NULL;

  -- class | friends — decides who may sit the paper
  ALTER TABLE competitions ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'class';

  CREATE INDEX IF NOT EXISTS competitions_scope_teacher_idx
    ON competitions (scope, teacher_id);
END
$$;
