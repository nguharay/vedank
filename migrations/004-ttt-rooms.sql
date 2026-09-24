-- Online Math Tic-Tac-Toe. One row per room; the whole board is the jsonb
-- state, so a move is read → validate → write. Rooms are short-lived and
-- swept on create. Applied automatically at build time by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS ttt_rooms (
    code       text PRIMARY KEY,
    host_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guest_id   uuid REFERENCES users(id) ON DELETE SET NULL,
    state      jsonb NOT NULL,
    round      integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END
$$;
