-- Notifications are now once a day (evening only; see vercel.json). The one
-- seeded guest message that sat in the morning list moves to the evening, so
-- it still gets sent — unless an admin has already edited it.
DO $$
BEGIN
  IF to_regclass('public.reminders') IS NULL THEN RETURN; END IF;
  UPDATE reminders SET slot = 'evening'
   WHERE audience = 'guests' AND slot = 'morning' AND updated_by IS NULL;
END
$$;
