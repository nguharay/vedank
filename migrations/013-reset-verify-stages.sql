-- The Verify (digit-sum check) lesson got much harder sums on 5 Nov 2026:
-- multi-term additions and near-miss false answers. Stages cleared on the old,
-- easier sums do not count, so everyone starts that one lesson over. Only
-- rows last touched before the change go, so progress earned on the new sums
-- survives every later replay of this file. Verify gates no other lesson
-- (see LATE_ADDED in src/lib/game/state.ts), so nothing else locks.
-- Applied at build time by scripts/migrate.ts. Safe to re-run.
DO $$
BEGIN
  IF to_regclass('public.topic_progress') IS NULL THEN RETURN; END IF;
  DELETE FROM topic_progress
  WHERE topic_id = 'verifyDS'
    AND updated_at < TIMESTAMPTZ '2026-11-05 07:50:00+00';
END
$$;
