# studio N 学習プラットフォーム（apps/lms）デプロイ手順

所要時間: 約 20 分。Vercel + Supabase（いずれも無料プランで開始可）。

## STEP 1: Supabase

1. https://supabase.com → New project（例: `studio-n-lms`、リージョン Tokyo）
2. **Authentication → Providers → Email**: 「Confirm email」OFF（招待制で管理者がユーザーを作成するため）、
   **Authentication → Settings**: 「Allow new users to sign up」OFF
3. **SQL Editor** で `apps/lms/supabase/migrations/*.sql` を番号順に実行 → `apps/lms/supabase/seed.sql` を実行
   （または `supabase link && supabase db push`）
4. **Project Settings → API** の URL / anon key / service_role key、**Connect → Session pooler** の URI を控える
5. 最初の管理者: Authentication → Users → Add user（メール + パスワード）→ SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid>';
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where id = '<uuid>';
   ```
6. （任意）Database → Webhooks: `qa_replies` INSERT と `courses` UPDATE を
   `https://<domain>/api/webhooks/supabase`（HTTP ヘッダー `Authorization: Bearer <CRON_SECRET>`）へ

## STEP 2: Vercel

1. https://vercel.com/new → このリポジトリをインポート
2. **Root Directory = `apps/lms`**（最重要）。Framework: Next.js
3. Environment Variables（`apps/lms/.env.example` 参照）:
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` /
   `RESEND_API_KEY` / `EMAIL_FROM` / `NEXT_PUBLIC_APP_URL` / `CRON_SECRET` / `SENTRY_DSN`（任意）
4. Deploy
5. Supabase の **Authentication → URL Configuration** に Site URL と Redirect URL（`https://<domain>/**`）を追加

## STEP 3: Resend

1. ドメインを追加し SPF / DKIM を設定（TODO(decision-#10)）
2. API キーを `RESEND_API_KEY` に、送信元を `EMAIL_FROM` に設定

## Cron

`apps/lms/vercel.json` に毎時のリマインド（`/api/cron/reminders`）と 5 分ごとのランキング更新（`/api/cron/refresh-ranking`）を定義。
Hobby プランでは日次までのため、必要なら `"schedule": "0 23 * * *"`（JST 8:00）等に変更する。
