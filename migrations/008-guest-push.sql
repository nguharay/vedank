-- Notifications for guests (players without an account). push_subscriptions
-- needs a user, so guest browsers get their own table, keyed by endpoint.
-- last_active_day is sent by the game when a guest opens it, so the daily
-- reminders can tell "hasn't played today" for guests too. A guest who signs
-- up has their row moved to push_subscriptions by the game.
-- Also seeds three guest-only reminders (audience 'guests') if there are none.
-- Applied at build time by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS guest_push (
    endpoint        text PRIMARY KEY,
    p256dh          text NOT NULL,
    auth            text NOT NULL,
    lang            text NOT NULL DEFAULT 'ja',
    last_active_day date,
    created_at      timestamptz NOT NULL DEFAULT now()
  );
  IF to_regclass('public.reminders') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM reminders WHERE audience = 'guests') THEN
    INSERT INTO reminders (slot, audience, title_ja, body_ja, title_en, body_en, url, sort) VALUES
      ('evening', 'guests', '🥚 たまごに名前がまだないよ', '無料アカウントを作ると、ドラゴンもまちも、どのスマホからでも会えるよ。', '🥚 Your egg has no name yet', 'Make a free account and your dragon and town follow you to any phone.', '/signup', 20),
      ('morning', 'guests', '🐉 ゲストのきみへ', 'きのうの記録、このスマホにだけ入ってるよ。なくなる前に保存しよう！', '🐉 Hey, guest!', 'Yesterday''s progress lives only on this phone. Save it before it''s gone!', '/signup', 20),
      ('evening', 'guests', '🏆 友だちとレースしたい？', 'アカウントがあれば、友だちとオンラインで計算レースができるよ。', '🏆 Want to race a friend?', 'With an account you can race friends online in Math Race.', '/signup', 21);
  END IF;
END
$$;
