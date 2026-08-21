# AI商品開発OS — アーキテクチャ設計書 v1.0

株式会社MANEXION / 要件定義書 v1.0 に対する実装設計。

---

## 1. Repository Analysis(既存リポジトリ分析)

### 1.1 現状

本リポジトリは **ビルド不要の静的HTMLサイト集合** であり、GitHub Pages(`.github/workflows/pages.yml` がリポジトリルートをそのまま artifact 化)で公開されている。

| パス | 内容 | 形態 |
|---|---|---|
| `index.html` + `config.js` + `setup.sql` | 顧客台帳(紹介者・報酬管理)。Supabase(anon key直叩き)+ localStorage | 単一HTML |
| `k2j-bridge/` | 韓国→日本 商品開発支援プラットフォームのLP + デモダッシュボード(2,869行の単一HTML)。BYOK方式でRakuten API / LLM API / 画像生成APIをブラウザから直接呼ぶ | 単一HTML |
| `patent-match/` | 特許×企業マッチングのLP・デモ | 単一HTML |
| `k2j-bridge/n8n/` | 商品企画をn8nで実行するワークフローJSON | JSON |

### 1.2 既存資産のうち再利用するもの

- **ドメイン知識**: `k2j-bridge/dashboard.html` は本要件のサブセット(トレンド分析・AI商品企画・原価プランナー・工場ディレクトリ・マーケティングロードマップ)を既に実装している。原価計算式・RFQ文面・工場スコアリングの考え方は本OSの `cost-simulation` / `oem` featureへ移植する。
- **デザイン言語**: 要件105〜107の Luxury Minimal / 淡いラベンダー は新規トークンとして定義する(既存のQuiet Luxury=ダークグリーン系とは別テーマ)。
- **Supabase**: 既存の顧客台帳が使用中。AI商品開発OSは **別プロジェクト or 別スキーマ** を用い、既存テーブル(`customers`)には触れない。

### 1.3 既存を壊さないための制約

1. リポジトリルートの静的サイト群(`index.html`, `k2j-bridge/`, `patent-match/`)は **一切変更しない**。
2. GitHub Pages ワークフローは変更しない。新アプリは `apps/web` 配下に隔離し、Pages の成果物としては無害な静的ファイルとして同梱されるだけとする(`node_modules` / `.next` は `.gitignore`)。
3. ルートに `package.json`(npm workspaces)を新設するが、Pages のビルドは走らないため公開に影響しない。
4. 新アプリのデプロイ先は Vercel / Node ホスティングを想定(GitHub Pagesは静的専用のため対象外)。

### 1.4 ギャップ

| 要件 | 現状 | 対応 |
|---|---|---|
| 認証・組織・権限 | 無し(簡易パスコード) | 新規実装(Phase 1) |
| 永続化 | localStorage / 単一jsonbテーブル | PostgreSQL + Prisma(28エンティティ) |
| APIキー管理 | ブラウザ(BYOK) | **サーバー専用**。フロントへ渡さない(要件110) |
| 非同期処理 | 無し(同期fetch) | Job Queue(要件92〜94) |
| 型安全 | 素のJS | TypeScript strict |
| Provider抽象化 | 無し(Gemini/Claude直呼び) | AI/Image/Video/MarketData/Storage の5系統Adapter |

---

## 2. Architecture(全体アーキテクチャ)

### 2.1 レイヤ構成

```
┌──────────────────────────────────────────────────────────┐
│ Presentation           app/ (Server Components 主体)      │
│                        components/ui  features/*/components│
├──────────────────────────────────────────────────────────┤
│ Application            features/*/service.ts              │
│  (ユースケース)         トランザクション境界 / 権限チェック    │
├──────────────────────────────────────────────────────────┤
│ Domain                 features/*/domain.ts               │
│  (純粋関数・計算)       原価計算・スコアリング・逆算          │
├──────────────────────────────────────────────────────────┤
│ Ports (interface)      providers/*/types.ts               │
│                        AIProvider / ImageProvider /        │
│                        VideoProvider / MarketDataProvider /│
│                        StorageProvider                     │
├──────────────────────────────────────────────────────────┤
│ Adapters               providers/*/adapters/*.ts          │
│                        openai / anthropic / google / mock  │
├──────────────────────────────────────────────────────────┤
│ Infrastructure         server/db.ts (Prisma) / jobs/       │
└──────────────────────────────────────────────────────────┘
```

**依存の向きは常に上→下。** Domain層は Prisma にも Provider にも依存しない純粋TypeScript(単体テスト対象)。

### 2.2 実行モデル

- **Next.js App Router**。読み取りは Server Component が直接 service を呼ぶ(APIを経由しない)。
- **書き込み**は Route Handler(`/api/*`)。要件104のAPI設計をそのまま実装し、外部連携・将来のモバイル利用にも耐える。
- **生成AI処理は必ず Job 化**(要件92)。`POST /api/xxx` は Job を作って `202 + jobId` を返し、クライアントは `/api/jobs/:id` をポーリング(SSEは将来拡張)。
- **Worker** は同一コードベースの `src/jobs/worker-runner.ts`。開発時はインプロセス実行、本番は別プロセス/Cronで `claimNextJob → handler → complete` を回す。DB行ロック(`FOR UPDATE SKIP LOCKED` 相当)で多重起動安全。

### 2.3 マルチテナンシー

すべての業務テーブルは `organizationId` を保持、または `projectId` 経由で辿れる。
アクセスは必ず `requireProjectAccess(projectId, minRole)` を通す(要件110)。Prismaの生クエリを Component から呼ぶことを禁止(要件121)。

### 2.4 Version管理(要件112, 74)

- AI生成物は **上書きしない**。`ProductVersion` / `ProductImageSet` / `LandingPage.version` / `ProductSpecification.version` で世代を積む。
- 「現在有効な世代」は `isCurrent` フラグ + 一意制約で表現。

---

## 3. Database Schema

要件96の28エンティティを全て実装。PostgreSQL + Prisma。詳細は `apps/web/prisma/schema.prisma`。

### 3.1 エンティティ関連(主要)

```
Organization 1─* OrganizationMember *─1 User
Organization 1─* Project
Project 1─1 Product 1─* ProductVersion
                  1─* ProductImageSet 1─* ProductImage
Project 1─* MarketResearch 1─* CompetitorProduct
                           1─* ReviewInsight
Project 1─* ProductScore
Project 1─* CostSimulation
Project 1─* ProductSpecification
Organization 1─* OEMSupplier 1─* OEMQuote *─1 Project
Project 1─* SampleEvaluation
Project 1─* LandingPage 1─* LandingPageSection
Project 1─* VideoProject 1─* VideoScene 1─* VideoJob
Project 1─* SalesData
Project 1─* Improvement
Project 1─* AIConversation 1─* AIMessage
Organization 1─* AIJob / AuditLog / Integration / UsageRecord
```

### 3.2 設計方針

- **金額は Int(最小通貨単位=円)**。浮動小数の誤差を避ける。通貨は `currency` 列(既定 `JPY`)。
- **AI生成の生データ**は `rawData Json` に保存(要件112: 過程を消さない)。表示用の正規化列は別に持つ。
- **Enum** は Prisma enum で定義(`ProjectStage`, `JobStatus`, `ScoreDecision`, `ImageAngle`, `MemberRole` …)。
- **削除は論理削除**(`archivedAt`)を基本とし、監査ログを残す。

---

## 4. Directory Structure

要件122〜125に準拠。

```
apps/web/
  prisma/schema.prisma, seed.ts
  src/
    app/
      (marketing)/            公開LP
      (auth)/                 login / signup / reset
      (app)/                  認証必須
        dashboard/
        projects/[projectId]/  overview|images|market|competitors|score|
                               cost|spec|oem|sample|lp|video|launch|sales|improvement
      api/                     要件104のエンドポイント
    components/ui/             Button/Card/Input/Slider/Tabs/... (shadcn相当・自前)
    components/layout/
    features/<name>/           domain.ts / service.ts / schema.ts / components/
    lib/                       cn / format / result / errors / logger / rate-limit
    server/                    db / auth / session / authz / audit / usage
    providers/ai|image|video|market-data|storage/
    jobs/                      queue / worker / handlers/
    prompts/                   要件125の11ファイル
    types/  hooks/  store/  validators/
```

**禁止事項の機械的担保**: `features/*/domain.ts` は `@prisma/client` を import しない(ESLint `no-restricted-imports`)。Provider固有SDKは `providers/*/adapters/` 以外で import 禁止。

---

## 5. Provider Architecture

### 5.1 共通形

```ts
export interface Provider { readonly id: string }
export interface ProviderRegistry<T extends Provider> {
  get(id?: string): T          // 未指定なら env の既定
  list(): T[]
  withFallback(ids: string[]): T
}
```

`ProviderResult<T> = { ok: true; data: T; usage: UsageMetrics } | { ok: false; error: ProviderError }`
→ 例外を投げず結果型で返す(要件121「エラーを握り潰さない」/ 114 Retry・Fallback)。

### 5.2 各Port

| Port | メソッド | 実装Adapter(MVP) |
|---|---|---|
| `AIProvider` | `complete`, `completeJson<T>`(zodスキーマ強制), `stream` | `anthropic`, `openai`, `google`, `mock` |
| `ImageProvider` | `generate`, `edit`, `variation`, `multiAngle` | `google`(Nano Banana), `openai`, `mock`(決定論的SVG) |
| `VideoProvider` | `generate`, `getJob`, `cancel`, `download` | `mock`(+ 汎用REST Adapter) |
| `MarketDataProvider` | `searchProducts`, `getProduct`, `getMarket`, `getKeyword`, `getCompetitors`, `getReviews` | `rakuten`(公式API), `scraper`, `mock` |
| `StorageProvider` | `put`, `get`, `signedUrl`, `delete` | `local`(開発), `s3`, `supabase` |

### 5.3 Fallback / Retry(要件114, 115)

`withFallback(['anthropic','openai'])` が `RETRYABLE` エラー時に指数バックオフ(3回)→ 次Providerへ。すべて失敗したら `AIJob.status=FAILED` + `error` を保存しユーザーへ通知。

### 5.4 コスト計測(要件116, 117)

すべてのProvider呼び出しは `UsageRecord`(provider/model/tokens/images/videoSeconds/estimatedCostMicroJPY)を書き込む。Organization単位で集計しプラン制限の基礎とする。

### 5.5 スクレイピングについて(要件24)

`MarketDataProvider` の実装の一つとして `ScraperMarketDataProvider` を用意する。ただしコアロジックは Adapter 内に閉じ、Business Logic からは他Providerと同一に見える。実装は次を必須とする。

- `robots.txt` 尊重・レート制限(既定 1req/2s・同時1)・User-Agent明示・キャッシュ(既定24h)
- 公式API(PA-API/SP-API/Rakuten等)が利用可能な場合はそちらを優先する Provider 選択順
- 取得データの保存は分析目的に限定し、再配布しない

> 注記: EC各社の利用規約によりスクレイピングが禁止・制限される場合があります。運用時は対象サイトのToS確認と、可能な限り公式API/データ提携への切替を推奨します。設計上はProvider差し替えのみで対応可能です。

---

## 6. API Design

要件104に対応。すべて `/api` 配下、認証必須(`/api/auth/*` 除く)、Zod検証、`{ data }` or `{ error: { code, message, details } }` を返す。

| Method | Path | 概要 | 非同期 |
|---|---|---|---|
| POST | `/api/auth/signup` `/login` `/logout` `/password-reset` `/verify-email` | 認証 | - |
| GET/POST | `/api/projects` | 一覧/作成 | - |
| GET/PATCH/DELETE | `/api/projects/:id` | 取得/更新/アーカイブ | - |
| GET/POST | `/api/products` , `/api/products/:id` | 商品情報CRUD・構造化 | - |
| POST | `/api/products/:id/interview` | AIヒアリング(次の質問生成) | Job |
| POST | `/api/images/generate` | コンセプト3案 | Job |
| POST | `/api/images/multi-angle` | 8方向生成 | Job |
| POST | `/api/images/edit` | 色/素材/背景変更 | Job |
| POST/GET | `/api/market-research` | 市場調査 | Job |
| GET | `/api/competitors` | 競合一覧 | - |
| POST | `/api/reviews/analyze` | レビュー解析・不満クラスタ | Job |
| POST/GET | `/api/product-score` | スコアリング/判定 | Job |
| POST/GET | `/api/cost-simulation` | 利益計算・逆算 | 同期(純計算) |
| POST/GET | `/api/specifications` | 商品仕様 | Job |
| GET/POST | `/api/oem` , `/api/oem/quotes` | OEM管理・見積比較 | - |
| POST/GET | `/api/sample-evaluation` | サンプル評価 | Job |
| POST | `/api/lp/generate` , GET/PATCH `/api/lp` | LP生成・編集 | Job |
| POST | `/api/video/storyboard` `/api/video/generate` , GET `/api/video/jobs` | 動画 | Job |
| GET/POST | `/api/sales` | 販売データ | - |
| GET/POST | `/api/improvements` | 改善提案・次回ロット | Job |
| POST | `/api/assistant` | AI Assistant(Project Context注入) | stream |
| GET | `/api/jobs/:id` | Jobステータス共通 | - |
| POST | `/api/webhooks/:provider` | 署名検証つきWebhook | - |

---

## 7. Phase Implementation Plan

| Phase | 内容 | 完了条件 |
|---|---|---|
| 1 | 基盤: Next.js/TS strict/Tailwindトークン/UIキット/Prisma schema/Auth/Organization/Project/Dashboard/Storage/Job基盤/AuditLog | build・lint・typecheck・test green |
| 2 | 商品概要・AIヒアリング・構造化・AI Assistant(Context) | 同上 |
| 3 | 商品画像3案 → Anchor Image → 8方向 → 360 Viewer → 画像編集 | 同上 |
| 4 | 市場調査・競合分析・レビュー分析・不満クラスタ・商品スコア(GO/IMPROVE_GO/NO_GO) | 同上 |
| 5 | 原価/利益シミュレーション(逆算)・商品仕様・OEM仕様書・見積比較・サンプル評価 | 同上 |
| 6 | LP生成・LP Editor・レスポンシブPreview・HTML/JSON出力 | 同上 |
| 7 | PR動画: 戦略→絵コンテ→台本→プロンプト→VideoProvider→Job管理・シーン単位再生成 | 同上 |
| 8 | 販売準備チェックリスト・販売分析・AI改善提案・ProductVersion・次回ロット・次商品提案 | 同上 |

各Phaseの完了時に `npm run lint && npm run typecheck && npm run build && npm run test` を実行し、commitする。

---

## 8. Risks

| # | リスク | 影響 | 緩和策 |
|---|---|---|---|
| R1 | ECサイトのスクレイピング規約・法的リスク(要件24) | サービス停止・法的請求 | Provider抽象化で公式API/提携データへ即切替可能に。robots.txt/レート制限/キャッシュを実装。運用判断ポイントとして明示 |
| R2 | 生成画像の一貫性(角度でデザインが変わる) | UX毀損 | Anchor Image + 同一seed + 参照画像入力 + 角度別プロンプト定型化。失敗時は再生成UI |
| R3 | 外部AIコスト暴走 | 収益性 | UsageRecordで実測、Organization単位のクォータ、Job並列度制限 |
| R4 | 動画生成Providerの成熟度・価格変動 | Phase 7遅延 | 自社生成せずAdapter経由。MVPはmock+汎用REST Adapterで先行、契約後に実装差替 |
| R5 | Prompt Injection(競合レビュー・スクレイピング結果をLLMに投入) | 情報漏洩・誤動作 | 外部テキストは必ず `<untrusted>` で囲みsystemで無効化指示、Tool Calling権限を最小化、出力はzodで検証 |
| R6 | 28エンティティの実装量 | 納期 | Phase分割 + featureごとの縦切り実装。共通CRUDはservice層のヘルパで圧縮 |
| R7 | LLM出力のJSON不整合 | 機能停止 | `completeJson` でzodスキーマ検証 + 1回リトライ + 失敗時fallback値 |
| R8 | 個人情報のProvider送信(要件111) | コンプライアンス | Context構築時にallowlist方式で明示的にフィールドを選択。PIIはマスク |
| R9 | 既存GitHub Pagesサイトへの影響 | 既存業務停止 | `apps/web` に隔離、既存HTML無変更、workflow無変更 |

---

## 9. 実装履歴(Phase 9以降の追加)

設計時のPhase 1〜8(MVP)は完了。以降の追加実装:

| Phase | 内容 |
|---|---|
| 9 | 運用機能: 設定画面(BYOK APIキー管理・暗号化保存)/ メンバー招待・権限管理 / 利用量ダッシュボード / メール実送信(Resend) |
| 9.5 | ブランド適用(UCCHAU)/ rectangular UI / モデル切替プルダウン |
| 10 | LP公開URL(/lp/[slug])/ 競合CSVエクスポート / 監査ログ画面 / Job自動復旧cron(/api/jobs/sweep) |
| 10.5 | 市場データの複数ソース併用(楽天+Amazon(Rainforest API)を同時取得・マージ、レビューは出所ソースへ問い合わせ) |
| 11 | 次商品提案 → ワンクリック新プロジェクト作成(要件127のループ完成)/ ダッシュボード「AIからの提案」 |
| 11.5 | コードレビュー2回(機能パス+セキュリティ監査)。テナント分離・OAuthリンク・権限昇格・Job復旧・レート制限等の13件を修正 |

### 運用構成(現行)

- 本番: Vercel(main push で自動デプロイ)+ Supabase(DB/Storage)
- 環境変数管理: GitHub Actions `vercel-setup.yml`(GitHub Secrets → Vercel API)。
  `.github/vercel-setup-trigger` の更新pushで再実行
- BYOK: AI/画像/市場データのキーはアプリ内設定画面から組織単位で登録(暗号化)
- cron: `/api/jobs/sweep`(日次、CRON_SECRET認証)が停止Jobを復旧
