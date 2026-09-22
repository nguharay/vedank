-- 10 demo accounts. Every one has the SAME password: VedAnk2026!
-- Paste into Vercel → Storage → Query (Read-only OFF) and Run.
-- Re-running is safe: ON CONFLICT DO NOTHING skips anyone already there.
-- To remove them later, delete by the exact addresses rather than a LIKE on
-- '%@example.%' — a pattern that broad will also take any real test account you
-- happen to have on example.com:
--   delete from users where email in (
--     'aiko.tanaka@example.jp','rahul.mehta@example.in','sofia.rossi@example.it',
--     'kenji.watanabe@example.jp','priya.nair@example.in','liam.obrien@example.ie',
--     'yuki.sato@example.jp','arjun.rao@example.in','emma.dubois@example.fr',
--     'sana.kapoor@example.in');
insert into users (email, password_hash, name, username, country, phone_code, phone, preferred_lang, daily_streak, best_daily_streak, bonus_gems, created_at)
values
  ('aiko.tanaka@example.jp', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Aiko Tanaka', 'aiko', 'JP', '+81', '9012345678', 'ja', 0, 0, 0, now() - interval '1 days'),
  ('rahul.mehta@example.in', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Rahul Mehta', 'rahulm', 'IN', '+91', '9876543210', 'en', 3, 3, 40, now() - interval '2 days'),
  ('sofia.rossi@example.it', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Sofia Rossi', 'sofiar', 'IT', '+39', '3331234567', 'en', 1, 4, 120, now() - interval '3 days'),
  ('kenji.watanabe@example.jp', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Kenji Watanabe', 'kenji', 'JP', '+81', '9098765432', 'ja', 7, 7, 260, now() - interval '4 days'),
  ('priya.nair@example.in', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Priya Nair', 'priyan', 'IN', '+91', '9812345678', 'en', 2, 2, 20, now() - interval '5 days'),
  ('liam.obrien@example.ie', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Liam O''Brien', 'liamob', 'IE', '+353', '871234567', 'en', 0, 1, 0, now() - interval '6 days'),
  ('yuki.sato@example.jp', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Yuki Sato', 'yukis', 'JP', '+81', '9011223344', 'ja', 5, 5, 180, now() - interval '7 days'),
  ('arjun.rao@example.in', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Arjun Rao', 'arjunr', 'IN', '+91', '9900112233', 'en', 1, 3, 60, now() - interval '8 days'),
  ('emma.dubois@example.fr', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Emma Dubois', 'emmad', 'FR', '+33', '612345678', 'en', 12, 12, 420, now() - interval '9 days'),
  ('sana.kapoor@example.in', '$2b$12$oSkhkcBFwNFjcJxtMjW/eet4Uxj/dI4Tr.HwKfbH4xSoDD3mqb8Kq', 'Sana Kapoor', 'sanak', 'IN', '+91', '9765432100', 'en', 4, 6, 90, now() - interval '10 days')
on conflict (email) do nothing;
