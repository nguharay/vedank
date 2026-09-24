-- Admin edits to a topic's lesson text (rule steps, tip, blurb). The code
-- still owns the generators and the defaults; a row here only overrides the
-- prose for one topic. Applied automatically at build time by scripts/migrate.ts.
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS topic_overrides (
    topic_id   text PRIMARY KEY,
    data       jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_by text,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END
$$;
