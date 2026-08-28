# リポジトリガイド(Claude向け)

## 構成

| パス | 内容 | 注意 |
|---|---|---|
| `apps/web/` | **UCCHAU — AI商品開発OS**(Next.js 15 / TS strict / Prisma / Tailwind v4)。メインプロダクト | ここで開発する |
| `apps/sns/` | **SNS COMPASS — 企業SNS企画・市場調査AI**(Next.js 15 / TS strict / Prisma / Tailwind v4)。市場調査→企画→台本→動画生成AIプロンプト | 独立アプリ。port 3100。詳細は `apps/sns/README.md` |
| `index.html` + `config.js` + `setup.sql` | 顧客台帳(静的サイト・GitHub Pages公開中) | **変更禁止** |
| `k2j-bridge/`, `patent-match/` | 既存の静的サイト | **変更禁止** |
| `docs/` | 設計書(00)とVercelデプロイ手順(01) | |
| `.github/workflows/vercel-setup.yml` | Vercel環境変数・Supabase設定の自動化。`.github/vercel-setup-trigger` を更新してpushすると実行される | 秘密情報はGitHub Secrets(公開リポジトリ) |

## デプロイ

- 本番: https://github-ucchau.vercel.app (Vercel、`main` へのpushで自動デプロイ)
- DB/Storage: Supabase(ref: lhyydbnvrhhyflvyfkdv)。ビルド時に `prisma db push` が走る
- 作業ブランチ `claude/ai-product-dev-os-igp091` → mainへff-merge、が既定フロー

## apps/web の規約(要件121準拠)

- 層: app(表示) → features/*/service(ユースケース+認可) → features/*/domain(純関数) / providers(Adapter) / jobs
- **全service関数の入口で `requireProjectAccess` / `requireOrganization` を呼ぶ**(テナント分離)
- AIプロンプトは `src/prompts/` のみ。各AITaskは zodスキーマ + mock を必ず持つ(キー未設定でも全機能動作)
- 生成AI処理はJob化(`enqueueJob`)。Provider直呼びは `providers/*/adapters/` のみ
- 外部由来テキスト(レビュー等)はAITaskの `untrusted` で渡す(Prompt Injection隔離)
- BYOK: 組織のAPIキーは Integration(暗号化)。Provider解決は `src/server/org-providers.ts`
- 金額はInt(円)。生成物は上書きせずVersionを積む

## apps/sns の規約

- 層: app(表示) → features/*/actions(Server Action + zod検証) → features/*/service(ユースケース+認可) → features/*/domain(純関数)
- **全service関数の入口で `requireOrganization` / `requireBrandAccess` を呼ぶ**(テナント分離)
- AIプロンプトは `src/lib/ai/prompts/` のみ。各AITaskは zodスキーマ + mock を必ず持つ(キー未設定でも全機能動作)
- SNS種別・企画カテゴリ・トーン等はベタ書きせず `src/lib/config/` を単一の出所にする
- 検索結果など外部由来テキストはAITaskの `untrusted` で渡す(Prompt Injection隔離)
- 重要データは物理削除せず `deletedAt`。RLSは `supabase/migrations/0001_row_level_security.sql`
- DBは apps/web と分けること(接続文字列へ `?schema=sns` を付けるか別DB)

## ゲート(各変更後に必ず)

```bash
# apps/web
cd apps/web && npx tsc --noEmit && npm run lint && npx vitest run && npm run build

# apps/sns
cd apps/sns && npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

## 既知の運用メモ

- この開発環境(サンドボックス)からは Vercel/Supabase API へ直接接続不可(egress policy)。
  環境変数の変更は vercel-setup.yml ワークフロー経由で行う
- GitHub Actions の workflow_dispatch は権限不足で不可 → トリガーファイルのpushで起動
- Vercel Hobbyのcronは日次のみ(`/api/jobs/sweep`、要CRON_SECRET)
