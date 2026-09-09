# E2E（Playwright）

「招待 → 登録 → 受講 → 完了 → 修了証」のフローを検証する。

## 前提

- ローカル Supabase（`supabase start`）または開発用プロジェクトに接続した `.env.local`
- `npm run db:migrate:sql && npm run db:seed` 済み
- 管理者ユーザーが 1 名存在し、`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` に設定されていること
  （最初の管理者は Supabase ダッシュボードで作成し `profiles.role='admin'`、`auth.users.raw_app_meta_data.role='admin'` にする）

```bash
E2E_ADMIN_EMAIL=admin@example.com E2E_ADMIN_PASSWORD=xxxxxxxx npm run test:e2e
```

環境変数が無い場合、DB を必要とするテストは skip される（公開ページのテストのみ実行）。
