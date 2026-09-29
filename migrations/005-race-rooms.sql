-- Online Math Race. One row per room; players, their progress and the start
-- time live in the jsonb state. Progress is written with jsonb_set so two
-- racers answering at the same instant cannot overwrite each other. Rooms
-- are short-lived and swept on create. Applied at build by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS race_rooms (
    code       text PRIMARY KEY,
    host_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state      jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END
$$;
