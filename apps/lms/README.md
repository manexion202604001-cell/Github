# studio N — コミュニティ型学習プラットフォーム

既存顧客向け・招待制の学習コミュニティ。仕様は [`REQUIREMENTS.md`](REQUIREMENTS.md)、開発規約は [`CLAUDE.md`](CLAUDE.md)。

- Next.js 15（App Router）/ TypeScript strict / Tailwind CSS / Radix UI
- Supabase（Postgres・Auth・Storage）/ Drizzle ORM / Resend / Vercel

## セットアップ

```bash
# リポジトリルートで（npm workspaces）
npm install

cd apps/lms
cp .env.example .env.local   # 値を設定

# DB: Supabase CLI がある場合
supabase link --project-ref <ref>
supabase db push             # supabase/migrations（テーブル・RLS・トリガー・view）
supabase db seed             # または下記

# DB: CLI が無い場合（DATABASE_URL に直接適用）
npm run db:migrate:sql       # supabase/migrations を順に適用
npm run db:seed              # カテゴリ・チャンネル・XP ルール・バッジ

npm run dev                  # http://localhost:3100
```

### 最初の管理者

登録は招待制のため、最初の管理者は Supabase ダッシュボード（Authentication → Users → Add user）で作成し、
SQL Editor で以下を実行する。

```sql
update public.profiles set role = 'admin' where id = '<user uuid>';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where id = '<user uuid>';
```

以降は管理画面（`/admin/members`）から招待リンクを発行できる。

## 環境変数

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 接続（クライアント・RLS 適用） |
| `SUPABASE_SERVICE_ROLE_KEY` | service role（`lib/supabase/admin.ts` のみで使用） |
| `DATABASE_URL` | Drizzle 接続（Session pooler の URI 推奨） |
| `RESEND_API_KEY` / `EMAIL_FROM` | メール送信（未設定時はログ出力のみ） |
| `NEXT_PUBLIC_APP_URL` | 招待リンク・メール内 URL の基点 |
| `CRON_SECRET` | `/api/cron/*` と `/api/webhooks/supabase` の Bearer 認証 |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | エラー監視（任意） |
| `FAQ_VISIBILITY` | FAQ ページの公開範囲は `app_settings.faq_visibility` で管理（TODO(decision-#6)） |

## コマンド

```bash
npm run typecheck && npm run lint && npm run test && npm run build   # ゲート
npm run test:e2e        # Playwright（tests/e2e/README.md 参照）
npm run db:generate     # Drizzle マイグレーション生成（schema.ts 変更時）
```

## デプロイ（Vercel）

1. Vercel でリポジトリをインポートし **Root Directory を `apps/lms`** に設定
2. 上記の環境変数を設定
3. `vercel.json` の Cron（毎時 `/api/cron/reminders`、5 分ごと `/api/cron/refresh-ranking`）が有効になる
   （Hobby プランは日次 Cron のみのため、その場合はスケジュールを `0 23 * * *` 等に変更する）
4. Supabase の Database Webhooks で `qa_replies`(INSERT) と `courses`(UPDATE) を
   `https://<domain>/api/webhooks/supabase` に、ヘッダー `Authorization: Bearer <CRON_SECRET>` で設定（任意。Action 側でも同等の通知を行う）

## ディレクトリ

```
app/(public)   ログイン不要ページ（/, /login, /signup, /reset-password, /verify/[code], /faq, /terms, /privacy）
app/(auth)     会員ページ
app/(admin)    管理画面（instructor / admin）
app/api        Route Handlers（upload, attachments, certificates pdf, office-hours ics, cron, webhooks）
components/    ui（トークン済み）/ layout / learn / qa / community / gamification / admin / settings / shared
lib/actions    Server Actions（auth, learn, qa, community, office-hours, settings, notifications, admin/*）
lib/db         Drizzle schema / queries / rls
lib/xp.ts      XP・バッジ・進捗・小テスト採点（純粋関数、Vitest）
supabase/      migrations（RLS・トリガー・materialized view）・seed.sql
emails/        react-email テンプレート
tests/         unit（Vitest）/ e2e（Playwright）
```
