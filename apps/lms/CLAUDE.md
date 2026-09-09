# CLAUDE.md — studio N 学習プラットフォーム

このリポジトリは studio N のコミュニティ型学習プラットフォーム。仕様の正は `REQUIREMENTS.md`。
迷ったら REQUIREMENTS.md の §4（設計原則）と §9（デザインシステム）に従う。

## プロジェクト概要

- 既存顧客向け・招待制の学習コミュニティ（月間 100 人規模）
- 動画（YouTube）/ スライド（PDF）/ テキスト（Markdown）のレッスン + 講師 Q&A + 受講生コミュニティ + 月 1 オフィスアワー + XP/バッジ/ランキング/修了証
- 決済なし。外部公開 API なし。日本語のみ

## 技術スタック

Next.js 15 (App Router) / TypeScript strict / Tailwind CSS / shadcn/ui / Supabase (Postgres, Auth, Storage) / Drizzle ORM / Resend / Vercel

## 開発コマンド

```bash
# このアプリはモノレポ（npm workspaces）の apps/lms にある。コマンドは apps/lms で実行する
npm run dev           # 開発サーバー（http://localhost:3100）
npm run build         # 本番ビルド
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Vitest
npm run test:e2e      # Playwright
npm run db:generate   # Drizzle マイグレーション生成（drizzle/）
npm run db:migrate    # Drizzle マイグレーション適用
npm run db:seed       # シード投入（カテゴリ・チャンネル・XP ルール・バッジ）
supabase db push      # supabase/migrations（RLS・トリガー・view）を適用
```

ゲート（各変更後に必ず）: `npm run typecheck && npm run lint && npm run test && npm run build`

## 必ず守ること

### アーキテクチャ
- データ取得は Server Components で行う。クライアントコンポーネントは操作が必要な最小単位に限定する
- ミューテーションは `lib/actions/` の Server Actions のみ。`zod` で入力を検証し、認可は **DB の RLS に加えて** Action 内でも role を確認する
- `SUPABASE_SERVICE_ROLE_KEY` は `lib/supabase/admin.ts` からのみ使用。Cron・Webhook・XP 加算・修了証発行以外では使わない
- DB スキーマ変更は必ず Drizzle マイグレーション + `supabase/migrations/` の RLS/トリガーをセットで更新する
- YouTube は `youtube-nocookie.com` を使う

### デザイン
- 色は `tailwind.config.ts` のトークン（`ink-*` / `stone-*` / `paper-*` / `bronze-*` / `state-*`）のみ。HEX の直書き禁止
- 見出し・本文は `font-serif`（Shippori Mincho）。UI ラベル・ボタン・ナビ・表は `font-sans`（Noto Sans JP）
- 影（`shadow-*`）は使わない。面はボーダー 1px と背景色差で分ける
- 角丸はデフォルト 2px。`rounded-full` はアバターとドットのみ
- モーションは fade + 4〜8px の移動のみ。scale / bounce / パララックス禁止
- リアクション絵文字は 4 種固定（👏 💡 🙏 🔥）。増やさない
- 空状態はイラストを置かず、明朝体の一文 + ghost ボタン 1 つ
- 新しい UI を作る前に `components/ui/` に既存パターンがないか確認する

### コード
- ファイル名：コンポーネントは `PascalCase.tsx`、それ以外は `kebab-case.ts`
- Server Action は `'use server'` を先頭に、戻り値は `{ ok: true, data } | { ok: false, error }` に統一
- エラーメッセージ・UI 文言は日本語。トーンは丁寧だが簡潔（例「保存しました。」「質問を投稿しました。」）
- 日付表示は `lib/utils.ts` の `formatDate` を使う（JST、`2026年9月9日（水）`）
- テスト：XP 計算・バッジ判定・進捗判定は必ず Vitest でカバーする

### やらないこと
- localStorage / sessionStorage に業務データを置かない
- 会員のメールアドレスをクライアントに送らない（本人・admin 画面を除く）
- 派手なアニメーション、グラデーション、原色、ネオン、イラスト
- `any` の使用（やむを得ない場合は `// eslint-disable-next-line` + 理由コメント）

## ディレクトリ

```
app/(public)   ログイン不要ページ
app/(auth)     会員ページ
app/(admin)    管理画面（role = admin のみ、middleware で制御）
components/ui  shadcn ベース（トークン差替済）
lib/actions    Server Actions
lib/db         Drizzle schema / queries
lib/xp.ts      XP ルール・バッジ判定（純粋関数、テスト対象）
supabase/      migrations（RLS・trigger・view）、seed
emails/        react-email テンプレート
```

## 実装の進め方

REQUIREMENTS.md §12 のフェーズ順に進める。各フェーズの受け入れ基準をチェックリストとして扱い、満たすまで次に進まない。

Phase 1 の着手順（推奨）:
1. `tailwind.config.ts` + `app/globals.css` + フォント読み込み（デザインシステムを最初に固める）
2. `components/ui/` の Button / Card / Input / Badge / ProgressBar をトークンで実装
3. Supabase スキーマ + RLS + seed
4. 認証（招待 → 登録 → ログイン）+ middleware
5. レイアウト（Sidebar / MobileTabBar / Header）
6. コース一覧 → コース詳細 → レッスン視聴（動画 → スライド → テキスト）
7. 進捗保存 + ダッシュボード
8. 管理画面（コース・レッスン・会員）

## 参照

- 仕様：`REQUIREMENTS.md`
- 未決事項：`REQUIREMENTS.md` §13 — 該当箇所を実装する際は仮置きの選択肢で進め、`// TODO(decision-#N)` コメントを残す
