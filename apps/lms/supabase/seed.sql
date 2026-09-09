-- studio N LMS 初期データ（カテゴリ・チャンネル・XP ルール・バッジ）
insert into public.categories (slug, name, sort_order) values
  ('ai', 'AI 活用', 1),
  ('n8n', 'n8n', 2),
  ('dev', '開発', 3),
  ('dx', 'DX', 4)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.channels (slug, name, description, sort_order) values
  ('introduce', '自己紹介', 'はじめまして、のご挨拶をどうぞ。', 1),
  ('chat', '雑談', '学びに関係のない話も歓迎です。', 2),
  ('cases', '事例共有', '業務での活用事例を共有しましょう。', 3),
  ('help', 'つまずき相談', '受講生同士で助け合う場です。講師の公式回答は Q&A へ。', 4),
  ('showcase', '作ったもの', '作ったものを見せ合いましょう。', 5)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.xp_rules (action, xp, daily_cap) values
  ('lesson_complete', 10, null),
  ('quiz_pass', 20, null),
  ('course_complete', 100, null),
  ('qa_question', 5, null),
  ('community_post', 5, null),
  ('community_comment', 2, null),
  ('reaction_received', 1, 20),
  ('office_hour_attend', 30, null)
on conflict (action) do nothing;

insert into public.badges (slug, name, description, icon, criteria, sort_order) values
  ('first-step', 'はじめの一歩', '初めてレッスンを完了', 'footprints', '{"type":"lesson_complete","count":1}', 1),
  ('graduate', '修了', '初めてコースを完了', 'award', '{"type":"course_complete","count":1}', 2),
  ('triple-crown', '三冠', 'コースを 3 つ完了', 'crown', '{"type":"course_complete","count":3}', 3),
  ('explorer', '探究者', 'Q&A で 5 回質問', 'compass', '{"type":"qa_question","count":5}', 4),
  ('storyteller', '語り部', 'コミュニティに 10 回投稿', 'feather', '{"type":"community_post","count":10}', 5),
  ('perfect-attendance', '皆勤', 'オフィスアワーに 3 回参加', 'calendar-check', '{"type":"office_hour_attend","count":3}', 6),
  ('seven-days', '七日間', '7 日連続で学習', 'sunrise', '{"type":"streak","days":7}', 7),
  ('n8n-certified', 'n8n 認定', 'n8n カテゴリの全コースを完了', 'badge-check', '{"type":"category_complete","category":"n8n"}', 8),
  ('ai-certified', 'AI 活用 認定', 'AI 活用カテゴリの全コースを完了', 'badge-check', '{"type":"category_complete","category":"ai"}', 9)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, criteria = excluded.criteria, sort_order = excluded.sort_order;

insert into public.app_settings (key, value) values
  ('faq_visibility', '"public"'::jsonb)
on conflict (key) do nothing;
