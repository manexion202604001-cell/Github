# AI商品開発OS(apps/web)

商品アイデアの入力から、AI商品画像生成・360度ビュー・市場調査・競合分析・商品スコアリング・利益シミュレーション・商品仕様・OEM仕様書・LP生成・PR動画構成・販売後改善までを一気通貫で管理する BtoB SaaS。株式会社MANEXION。

設計書: [`docs/00-architecture.md`](../../docs/00-architecture.md)

## セットアップ

```bash
cd apps/web
cp .env.example .env        # DATABASE_URL / AUTH_SECRET などを設定
npm install                 # ルートで npm install でも可(workspaces)
npx prisma db push          # スキーマ反映(開発)
npm run db:seed             # デモデータ(任意): demo@manexion.local / demo-password-123
npm run dev                 # http://localhost:3000
```

**APIキーなしで動きます。** AI / 画像 / 動画 / 市場データの各Providerは未設定時に自動で
mock(サンプルデータ生成)へフォールバックし、全工程のUXを検証できます。
実データ・実生成に切り替えるには `.env` の `AI_PROVIDER` / `IMAGE_PROVIDER` /
`VIDEO_PROVIDER` / `MARKET_DATA_PROVIDER` と各APIキーを設定してください。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド(prisma generate 含む) |
| `npm run lint` / `npm run typecheck` / `npm run test` | 品質ゲート |
| `npm run worker` | Jobワーカー(本番はWebと分離して常駐) |
| `npm run db:migrate` / `db:push` / `db:seed` | DB操作 |

## アーキテクチャ(概要)

- **Presentation**: `src/app`(App Router, Server Components 主体)+ `src/components`
- **Application**: `src/features/*/service.ts` — 権限チェック(`requireProjectAccess`)とトランザクション境界
- **Domain**: `src/features/*/domain.ts` — 純粋関数(原価計算・逆算など)。Prisma/Provider非依存でテスト対象
- **Ports/Adapters**: `src/providers/{ai,image,video,market-data,storage}` — ベンダーSDKはAdapter内に隔離
- **Jobs**: `src/jobs` — 生成AI処理は全てJob化。`FOR UPDATE SKIP LOCKED` で多重Worker安全
- **Prompts**: `src/prompts` — AIプロンプトをコンポーネントから分離。外部テキストは `<untrusted_data>` に隔離

環境変数は `src/lib/env.ts` のみが読む。APIキーがフロントへ渡る経路はない。
