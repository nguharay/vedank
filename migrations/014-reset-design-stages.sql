-- The two design lessons (Digit Sum in a Circle, Digit Sum in a Square)
-- changed on 7 Nov 2026: from battle 3 nothing of the table is given any
-- more, so stages cleared under the old, easier rules do not count and
-- everyone starts both lessons over. Only rows last touched before the
-- change go, so progress made afterwards survives every replay of this
-- file. They are the last two lessons, so nothing else locks.
-- Applied at build time by scripts/migrate.ts. Safe to re-run.
DO $$
BEGIN
  IF to_regclass('public.topic_progress') IS NULL THEN RETURN; END IF;
  DELETE FROM topic_progress
  WHERE topic_id IN ('dsCircle', 'dsSquare')
    AND updated_at < TIMESTAMPTZ '2026-11-07 06:10:00+00';
END
$$;
