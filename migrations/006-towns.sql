-- Math Town, saved per signed-in player so friends can visit. The town itself
-- (plots, coins) is the client's jsonb state, mirrored here whenever it
-- changes. `gifts` is coins friends have spent in this player's shops that
-- the owner has not collected yet; `stickers` are notes visitors left.
-- Applied at build time by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS towns (
    user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state      jsonb NOT NULL,
    gifts      integer NOT NULL DEFAULT 0,
    visits     integer NOT NULL DEFAULT 0,
    stickers   jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
END
$$;
