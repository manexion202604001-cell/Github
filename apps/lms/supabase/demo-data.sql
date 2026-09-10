-- デモデータ（開発・動作確認用。本番には投入しない）。auth.users 4 名 + コース 3 件 + Q&A / コミュニティ / オフィスアワー

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('11111111-1111-1111-1111-111111111111','admin@example.com','{"display_name":"studio N 講師"}','{"role":"admin"}'),
 ('22222222-2222-2222-2222-222222222222','yamada@example.com','{"display_name":"山田"}','{}'),
 ('33333333-3333-3333-3333-333333333333','sato@example.com','{"display_name":"佐藤"}','{}'),
 ('44444444-4444-4444-4444-444444444444','suzuki@example.com','{"display_name":"鈴木"}','{}')
on conflict do nothing;
update public.profiles set bio = 'n8n で社内の定型業務を自動化しています。', level = 'intermediate', streak_days = 5, last_active_on = (now() at time zone 'Asia/Tokyo')::date where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set bio = 'studio N の講師です。AI 活用と業務自動化を担当しています。' where id = '11111111-1111-1111-1111-111111111111';

insert into public.courses (id, slug, title, description, goals, category_id, level, status, published_at, is_sequential, created_by, sort_order) values
 ('aaaaaaaa-0000-0000-0000-000000000001','n8n-basics','n8n で業務自動化 入門','ノーコードのワークフローツール n8n を使って、日々の定型業務を自動化する方法を 2 週間で学びます。

Gmail・Slack・スプレッドシートをつなぎ、**トリガー → 処理 → 通知** の基本パターンを身につけます。', array['n8n の基本概念（ノード・ワークフロー・実行）を説明できる','Webhook と定期実行のワークフローを自分で作れる','Google スプレッドシートと連携した通知を組める'], (select id from public.categories where slug='n8n'), 'beginner', 'published', now() - interval '20 days', false, '11111111-1111-1111-1111-111111111111', 1),
 ('aaaaaaaa-0000-0000-0000-000000000002','ai-prompting','AI 活用 実践：プロンプト設計','ChatGPT / Claude を業務で使いこなすためのプロンプト設計を学びます。', array['役割・制約・出力形式を含むプロンプトを書ける','業務文書の下書きを AI に任せられる'], (select id from public.categories where slug='ai'), 'intermediate', 'published', now() - interval '5 days', true, '11111111-1111-1111-1111-111111111111', 2),
 ('aaaaaaaa-0000-0000-0000-000000000003','dx-roadmap','小さな会社の DX ロードマップ','現場から始める DX の進め方。', null, (select id from public.categories where slug='dx'), 'advanced', 'published', now() - interval '1 day', false, '11111111-1111-1111-1111-111111111111', 3);

insert into public.sections (id, course_id, title, sort_order) values
 ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','第1週：基礎',1),
 ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','第2週：実践',2),
 ('bbbbbbbb-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000002','第1週：プロンプトの型',1),
 ('bbbbbbbb-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000003','第1週',1);

insert into public.lessons (id, section_id, title, type, youtube_video_id, body_md, duration_min, sort_order) values
 ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001','n8n とは何か','video','dQw4w9WgXcQ','このレッスンでは n8n の全体像と、他のツールとの違いを説明します。

- ワークフロー
- ノード
- 実行履歴', 8, 1),
 ('cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001','最初のワークフローを作る','text',null,'## 最初のワークフロー

1. 左上の **New workflow** を押す
2. `Manual Trigger` ノードを追加
3. `Set` ノードで値を入れる

```js
// Code ノードの例
return items.map(i => ({ json: { ...i.json, checked: true } }))
```

> ポイント: まずは手動実行で動きを確かめてから、トリガーを差し替えます。', 12, 2),
 ('cccccccc-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000001','基礎の確認テスト','quiz',null,null, 5, 3),
 ('cccccccc-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000002','Gmail → Slack 通知','video','dQw4w9WgXcQ','Gmail の新着を Slack に流すワークフローを作ります。', 15, 1),
 ('cccccccc-0000-0000-0000-000000000005','bbbbbbbb-0000-0000-0000-000000000002','スプレッドシート連携','slide',null,'資料スライドです。', 10, 2),
 ('cccccccc-0000-0000-0000-000000000006','bbbbbbbb-0000-0000-0000-000000000003','プロンプトの 4 要素','text',null,'## 役割・文脈・制約・出力形式

良いプロンプトはこの 4 つを明示します。', 10, 1),
 ('cccccccc-0000-0000-0000-000000000007','bbbbbbbb-0000-0000-0000-000000000003','実践：議事録の要約','video','dQw4w9WgXcQ',null, 12, 2),
 ('cccccccc-0000-0000-0000-000000000008','bbbbbbbb-0000-0000-0000-000000000004','現状把握のフレーム','text',null,'まず現場の業務を棚卸しします。', 10, 1);

insert into public.quizzes (id, lesson_id, pass_percent) values ('eeeeeeee-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000003',80);
insert into public.quiz_questions (id, quiz_id, question, explanation, is_multiple, sort_order) values
 ('eeeeeeee-1111-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001','n8n のワークフローを構成する最小単位はどれですか？','ワークフローはノードのつながりで構成されます。',false,1),
 ('eeeeeeee-1111-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000001','トリガーとして使えるものをすべて選んでください。','手動実行・スケジュール・Webhook はいずれもトリガーです。',true,2);
insert into public.quiz_choices (question_id, label, is_correct, sort_order) values
 ('eeeeeeee-1111-0000-0000-000000000001','ノード',true,1),('eeeeeeee-1111-0000-0000-000000000001','クレデンシャル',false,2),('eeeeeeee-1111-0000-0000-000000000001','実行履歴',false,3),
 ('eeeeeeee-1111-0000-0000-000000000002','Manual Trigger',true,1),('eeeeeeee-1111-0000-0000-000000000002','Schedule',true,2),('eeeeeeee-1111-0000-0000-000000000002','Set',false,3),('eeeeeeee-1111-0000-0000-000000000002','Webhook',true,4);

-- 山田: n8n コース受講中（2/5 完了）、AI コース完了 → 修了証
insert into public.enrollments (user_id, course_id, enrolled_at) values ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000001', now() - interval '6 days');
insert into public.lesson_progress (user_id, lesson_id, status, last_position_sec, completed_at, updated_at) values
 ('22222222-2222-2222-2222-222222222222','cccccccc-0000-0000-0000-000000000001','completed',480, now() - interval '5 days', now() - interval '5 days'),
 ('22222222-2222-2222-2222-222222222222','cccccccc-0000-0000-0000-000000000002','completed',0, now() - interval '3 days', now() - interval '3 days'),
 ('22222222-2222-2222-2222-222222222222','cccccccc-0000-0000-0000-000000000004','in_progress',312, null, now() - interval '1 hour');
insert into public.enrollments (user_id, course_id, enrolled_at, completed_at) values ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002', now() - interval '12 days', now() - interval '2 days');
insert into public.lesson_progress (user_id, lesson_id, status, completed_at, updated_at) values
 ('22222222-2222-2222-2222-222222222222','cccccccc-0000-0000-0000-000000000006','completed', now() - interval '4 days', now() - interval '4 days'),
 ('22222222-2222-2222-2222-222222222222','cccccccc-0000-0000-0000-000000000007','completed', now() - interval '2 days', now() - interval '2 days');
insert into public.certificates (user_id, course_id, verify_code, issued_at) values ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002','SN-2026-7F3K9Q', now() - interval '2 days');
insert into public.lesson_notes (user_id, lesson_id, body_md) values ('22222222-2222-2222-2222-222222222222','cccccccc-0000-0000-0000-000000000004','- Slack の Webhook URL は社内 wiki 参照
- フィルタ条件は件名に「請求」');

-- XP
insert into public.xp_events (user_id, action, xp, created_at) values
 ('22222222-2222-2222-2222-222222222222','lesson_complete',10, now() - interval '5 days'),
 ('22222222-2222-2222-2222-222222222222','lesson_complete',10, now() - interval '3 days'),
 ('22222222-2222-2222-2222-222222222222','lesson_complete',10, now() - interval '4 days'),
 ('22222222-2222-2222-2222-222222222222','lesson_complete',10, now() - interval '2 days'),
 ('22222222-2222-2222-2222-222222222222','course_complete',100, now() - interval '2 days'),
 ('22222222-2222-2222-2222-222222222222','community_post',5, now() - interval '1 day'),
 ('33333333-3333-3333-3333-333333333333','lesson_complete',10, now() - interval '1 day'),
 ('33333333-3333-3333-3333-333333333333','community_post',5, now() - interval '2 days'),
 ('33333333-3333-3333-3333-333333333333','qa_question',5, now() - interval '2 days'),
 ('44444444-4444-4444-4444-444444444444','lesson_complete',10, now() - interval '3 days'),
 ('44444444-4444-4444-4444-444444444444','lesson_complete',10, now() - interval '20 days'),
 ('44444444-4444-4444-4444-444444444444','office_hour_attend',30, now() - interval '20 days');
insert into public.user_badges (user_id, badge_id, earned_at) select '22222222-2222-2222-2222-222222222222', id, now() - interval '5 days' from public.badges where slug in ('first-step','graduate');
select public.refresh_rankings();

-- Q&A
insert into public.qa_threads (id, user_id, course_id, lesson_id, title, body_md, status, is_faq, created_at) values
 ('dddddddd-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000004','Gmail トリガーが動かない','Gmail Trigger を設定しましたが、新着メールが来てもワークフローが実行されません。ポーリング間隔は 1 分にしています。','answered', true, now() - interval '2 days'),
 ('dddddddd-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000001',null,'スプレッドシートの行を追記するときの注意点は？','Append 操作でヘッダー行がずれてしまいます。','open', false, now() - interval '3 hours'),
 ('dddddddd-0000-0000-0000-000000000003','44444444-4444-4444-4444-444444444444','aaaaaaaa-0000-0000-0000-000000000002',null,'プロンプトに社外秘の情報を入れても大丈夫？','業務文書をそのまま貼ってよいのか気になります。','resolved', true, now() - interval '10 days');
insert into public.qa_replies (thread_id, user_id, body_md, is_official, created_at) values
 ('dddddddd-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Gmail Trigger は **OAuth の権限スコープ** が不足していると新着を検知できません。クレデンシャルを一度削除して再認証し、`gmail.readonly` が付与されているか確認してください。', true, now() - interval '1 day'),
 ('dddddddd-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','再認証したら動きました。ありがとうございます。', false, now() - interval '20 hours'),
 ('dddddddd-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','契約プランによって扱いが異なります。原則として個人情報・社外秘は伏せ字にしてから入力してください。', true, now() - interval '9 days');

-- コミュニティ
insert into public.posts (id, channel_id, user_id, body_md, is_pinned, created_at) values
 ('ffffffff-0000-0000-0000-000000000001',(select id from public.channels where slug='introduce'),'11111111-1111-1111-1111-111111111111','はじめまして。講師の studio N です。ここは自己紹介のチャンネルです。お気軽にどうぞ。', true, now() - interval '30 days'),
 ('ffffffff-0000-0000-0000-000000000002',(select id from public.channels where slug='introduce'),'33333333-3333-3333-3333-333333333333','佐藤です。経理をやっています。請求書の処理を n8n で楽にしたくて参加しました。', false, now() - interval '2 days'),
 ('ffffffff-0000-0000-0000-000000000003',(select id from public.channels where slug='showcase'),'22222222-2222-2222-2222-222222222222','日報を Slack に投稿すると自動でスプレッドシートに集計されるワークフローを作りました。

@佐藤 さんの請求書処理にも応用できそうです。', false, now() - interval '1 day'),
 ('ffffffff-0000-0000-0000-000000000004',(select id from public.channels where slug='help'),'44444444-4444-4444-4444-444444444444','Code ノードで日付を JST に変換するやり方、どなたか分かりますか？', false, now() - interval '5 hours');
insert into public.comments (post_id, user_id, body_md, created_at) values
 ('ffffffff-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','これはすごい。今度教えてください。', now() - interval '20 hours'),
 ('ffffffff-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','`$now.setZone(''Asia/Tokyo'')` で変換できます。', now() - interval '4 hours');
insert into public.reactions (user_id, target_type, target_id, kind) values
 ('33333333-3333-3333-3333-333333333333','post','ffffffff-0000-0000-0000-000000000003','clap'),
 ('44444444-4444-4444-4444-444444444444','post','ffffffff-0000-0000-0000-000000000003','fire'),
 ('11111111-1111-1111-1111-111111111111','post','ffffffff-0000-0000-0000-000000000003','idea');

-- オフィスアワー
insert into public.office_hours (id, title, theme, scheduled_at, duration_min, join_url) values
 ('99999999-0000-0000-0000-000000000001','9 月のオフィスアワー','n8n のエラーハンドリング', now() + interval '6 days', 60, 'https://zoom.us/j/000000000');
insert into public.office_hours (id, title, theme, scheduled_at, duration_min, recording_url, summary_md) values
 ('99999999-0000-0000-0000-000000000002','8 月のオフィスアワー','プロンプト設計の相談会', now() - interval '25 days', 60, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '- 00:00 はじめに
- 05:30 プロンプトの 4 要素
- 21:00 参加者の事例');
insert into public.office_hour_questions (id, office_hour_id, user_id, body) values
 ('99999999-1111-0000-0000-000000000001','99999999-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','ワークフローが途中で失敗したとき、Slack に通知する定番の組み方を知りたいです。'),
 ('99999999-1111-0000-0000-000000000002','99999999-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','リトライの回数と間隔はどう決めていますか？');
insert into public.office_hour_question_votes (question_id, user_id) values ('99999999-1111-0000-0000-000000000001','22222222-2222-2222-2222-222222222222'),('99999999-1111-0000-0000-000000000001','44444444-4444-4444-4444-444444444444');
insert into public.office_hour_attendance (office_hour_id, user_id) values ('99999999-0000-0000-0000-000000000002','44444444-4444-4444-4444-444444444444');

-- お知らせ・通知
insert into public.announcements (title, body_md, published_at, created_by) values ('9 月の新コース「小さな会社の DX ロードマップ」を公開しました','今月はオフィスアワーで DX の進め方も取り上げます。', now() - interval '1 day','11111111-1111-1111-1111-111111111111');
insert into public.notifications (user_id, type, title, body, link, created_at) values
 ('22222222-2222-2222-2222-222222222222','badge','バッジ「修了」を獲得しました','初めてコースを完了','/badges', now() - interval '2 days'),
 ('22222222-2222-2222-2222-222222222222','course_complete','「AI 活用 実践：プロンプト設計」を修了しました','修了証を発行しました。','/certificates', now() - interval '2 days'),
 ('22222222-2222-2222-2222-222222222222','mention','佐藤 さんがあなたをメンションしました',null,'/community/posts/ffffffff-0000-0000-0000-000000000003', now() - interval '20 hours');
