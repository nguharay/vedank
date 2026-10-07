-- Remove the 10 demo accounts that seed-demo-users.sql once added by hand.
-- Exact addresses only (never a LIKE on '%@example.%'), so no real account
-- can be caught. Their progress, friends and class memberships go with them
-- through the existing ON DELETE CASCADE foreign keys. Safe to re-run.
-- Applied at build time by scripts/migrate.ts.
DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  DELETE FROM users WHERE email IN (
    'aiko.tanaka@example.jp', 'rahul.mehta@example.in', 'sofia.rossi@example.it',
    'kenji.watanabe@example.jp', 'priya.nair@example.in', 'liam.obrien@example.ie',
    'yuki.sato@example.jp', 'arjun.rao@example.in', 'emma.dubois@example.fr',
    'sana.kapoor@example.in'
  );
END
$$;
