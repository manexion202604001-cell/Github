# Vercelデプロイ手順(AI商品開発OS)

所要時間: 約15分。無料プラン(Hobby)で動作します。

## 必要なもの

1. **Vercelアカウント** — https://vercel.com にGitHubアカウントで登録
2. **PostgreSQLデータベース** — Supabase(無料)を推奨。既存の顧客台帳用プロジェクトとは**別プロジェクト**を作ること

## STEP 1: Supabaseの準備(5分)

1. https://supabase.com → New project(例: `ai-product-os`、リージョン Tokyo)
2. **接続文字列を取得**: プロジェクトの `Connect` ボタン → `Session pooler` の URI をコピー
   - 形式: `postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`
   - `[PASSWORD]` をプロジェクト作成時のDBパスワードに置き換える
3. **画像保存用バケットを作成**: 左メニュー Storage → New bucket
   - 名前: `product-os`、**Public bucket: ON**
4. **service_role キーを控える**: Project Settings → API → `service_role`(secretの方)

## STEP 2: Vercelへインポート(5分)

1. https://vercel.com/new → 「Import Git Repository」でこのリポジトリ(`manexion202604001-cell/Github`)を選択
2. **Root Directory** を `apps/web` に変更(Edit → apps/web を選択)← 最重要
3. Framework Preset: Next.js(自動検出)
4. **Environment Variables** に以下を入力:

| Name | Value |
|---|---|
| `DATABASE_URL` | STEP 1-2 の接続文字列 |
| `AUTH_SECRET` | ランダム文字列(ターミナルで `openssl rand -base64 32`、なければ長いパスワードでも可) |
| `ENCRYPTION_KEY` | 同上(AUTH_SECRETとは別の値) |
| `STORAGE_PROVIDER` | `supabase` |
| `SUPABASE_URL` | `https://<プロジェクトID>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | STEP 1-4 のキー |
| `SUPABASE_STORAGE_BUCKET` | `product-os` |
| `JOBS_INLINE` | `true` |

5. **Deploy** を押す。ビルド中に `prisma db push` が実行され、テーブルが自動作成されます

## STEP 3: デプロイ後(2分)

1. 発行されたURL(例 `https://xxx.vercel.app`)を開き、**新規登録**からアカウント作成
2. Vercelの Settings → Environment Variables に `APP_URL` = 発行されたURL を追加 → Redeploy
   (メール内リンク・Google OAuth リダイレクトに使用)

## AIを実際に動かす場合(任意)

未設定でもサンプルデータで全機能が動きます。実AIに切り替えるには環境変数を追加して Redeploy:

| Name | Value | 効果 |
|---|---|---|
| `AI_PROVIDER` | `anthropic` / `openai` / `google` | 市場分析・スコアリング・LP等の文章生成 |
| `ANTHROPIC_API_KEY` 等 | 各社のAPIキー | 〃 |
| `IMAGE_PROVIDER` | `google` | 商品画像の実生成(Nano Banana) |
| `GOOGLE_AI_API_KEY` | Google AI Studioのキー | 〃 |
| `MARKET_DATA_PROVIDER` | `rakuten` | 楽天市場の実データで市場調査 |
| `RAKUTEN_APPLICATION_ID` | 楽天ウェブサービスのアプリID | 〃 |

Googleログインを使う場合は Google Cloud Console でOAuthクライアントを作成し、
リダイレクトURI `https://<あなたのドメイン>/api/auth/google/callback` を登録して
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を設定します。

## 制限事項(Hobbyプラン)

- 生成系APIは1リクエスト最大60秒(`maxDuration=60` 設定済み)。mock/通常のLLM生成は収まります
- 長時間の動画生成ジョブを本格運用する場合は、`JOBS_INLINE=false` にして
  別サーバーで `npm run worker` を常駐させる構成(Railway/Fly.io等)を推奨

## トラブルシューティング

| 症状 | 確認 |
|---|---|
| ビルドで `Can't reach database` | DATABASE_URL のパスワード・ポート(5432 / Session pooler)を確認 |
| 画像が表示されない | STORAGE_PROVIDER=supabase、バケットが **Public** か、service_role キーが正しいか |
| ログイン後すぐログアウトされる | AUTH_SECRET が全環境(Production/Preview)で同一か |
