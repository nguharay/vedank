-- Daily reminder notifications, written by admins (the marketing team) and
-- sent by two daily crons: 'morning' (08:00 JST) and 'evening' (19:00 JST).
-- Each day one enabled message per slot is picked, rotating through the slot.
-- reminder_runs makes a slot run at most once per day however often the cron
-- fires. Seeded with a first set of messages only when the table is empty.
-- Applied at build time by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  CREATE TABLE IF NOT EXISTS reminders (
    id         serial PRIMARY KEY,
    slot       text NOT NULL DEFAULT 'evening',
    audience   text NOT NULL DEFAULT 'not_played_today',
    title_ja   text NOT NULL,
    body_ja    text NOT NULL,
    title_en   text NOT NULL,
    body_en    text NOT NULL,
    url        text NOT NULL DEFAULT '/',
    enabled    boolean NOT NULL DEFAULT true,
    sort       integer NOT NULL DEFAULT 0,
    updated_by text,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS reminder_runs (
    slot        text NOT NULL,
    day         date NOT NULL,
    reminder_id integer,
    sent        integer NOT NULL DEFAULT 0,
    ran_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (slot, day)
  );
  IF NOT EXISTS (SELECT 1 FROM reminders) THEN
    INSERT INTO reminders (slot, audience, title_ja, body_ja, title_en, body_en, url, sort) VALUES
      ('morning', 'all', '🐉 おはよう！', 'ドラゴンのおなかが鳴ってるよ。正解10問で朝ごはん！', '🐉 Good morning!', 'Your dragon''s tummy is rumbling. 10 right answers = breakfast!', '/', 1),
      ('morning', 'all', '☀️ 2分だけ脳のストレッチ', 'ピコがあくびしながら待ってる。今日の1バトル、いこう！', '☀️ A 2-minute brain stretch', 'Blip is yawning, waiting for you. One battle to start the day!', '/', 2),
      ('morning', 'all', '🍣 おすし屋さん、開店！', '今日の売上ベスト、こえられる？お客さんがもう並んでるよ。', '🍣 The sushi shop is open!', 'Can you beat your best day? Customers are already lining up.', '/', 3),
      ('morning', 'all', '🏯 夜のあいだに…', 'モンスターがお城にじりじり近づいてきた。今日も守りに来て！', '🏯 While you slept…', 'Monsters crept closer to your castle. Come defend it today!', '/', 4),
      ('morning', 'all', '🥷 忍者の朝修行', 'フルーツを3つ切れたら、今日はもう勝ち。', '🥷 Morning ninja training', 'Slice three fruit and today is already a win.', '/', 5),
      ('morning', 'all', '🧮 11をかける魔法、まだ覚えてる？', '3問だけチェック。たった30秒。', '🧮 Still remember the ×11 magic?', 'A 3-question check. Thirty seconds, tops.', '/', 6),
      ('evening', 'streak_risk', '🔥 ストリークが今夜0時で消えちゃう！', 'あと1回あそべばセーフ。1分でいいよ。', '🔥 Your streak ends at midnight!', 'One quick play keeps it alive. One minute is enough.', '/', 1),
      ('evening', 'not_played_today', '🐉 ドラゴンがまだごはんを食べてない…', '寝る前に10問だけ。おなかいっぱいにしてあげて。', '🐉 Your dragon hasn''t eaten today…', 'Just 10 answers before bed to fill it up.', '/', 2),
      ('evening', 'all', '🏙️ 友だちがきみのまちに来たかも？', 'お店の売上コインを集めに行こう。', '🏙️ Did a friend visit your town?', 'Go collect the coins from your shops.', '/', 3),
      ('evening', 'not_played_today', '⚔️ キングピコ：「今日はこないのか？」', '「よわむし！」…やり返しに行く？', '⚔️ King Blip: "Not coming today?"', '"Chicken!" …Going to show him?', '/', 4),
      ('evening', 'all', '🎵 今日のしめくくりは1曲', 'リズムタップで、音楽にあわせて答えをタップ。', '🎵 End the day with one song', 'Rhythm Tap — answers to the beat.', '/', 5),
      ('evening', 'not_played_today', '🏪 コンビニに行列ができてます！', '店長、レジをおねがいします。おつりは計算で！', '🏪 There''s a queue at the konbini!', 'Manager, the register needs you. Change by mental maths!', '/', 6);
  END IF;
END
$$;
