-- Web Push: one row per browser a player has allowed notifications on. A
-- person can have several (phone, laptop), so the endpoint is the identity,
-- not the user.
--
-- Applied automatically at build time by scripts/migrate.ts. One statement,
-- wrapped in a DO block, safe to replay.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'users table not created yet — nothing to migrate';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint   text PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    p256dh     text NOT NULL,
    auth       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
    ON push_subscriptions (user_id);
END
$$;
