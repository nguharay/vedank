-- Party games (Tug of War, Buzzer Quiz, Boss Battle). One row per room, like
-- race_rooms: the game, players, scores and start time live in the jsonb
-- state; answers are written with jsonb_set so players answering at the same
-- instant cannot overwrite each other. Rooms are swept on create.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS party_rooms (
    code       text PRIMARY KEY,
    host_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state      jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END
$$;
