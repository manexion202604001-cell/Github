-- SNS COMPASS — Seed
--
-- デモデータは TypeScript 側(prisma/seed.ts)で管理しています。
-- Prisma のスキーマと型を単一の出所にするため、SQL では投入しません。
--
--   npm run db:seed -w @manexion/sns
--
-- 作成されるもの(要件100, 101)
--   組織 : 株式会社サンプルクリーン
--   ブランド: サンプルクリーン(エアコンクリーニング / 東京都内 / 30〜50代ファミリー)
--   調査 : エアコンクリーニング市場調査(出典・インサイト付き)
--   企画 : 3件(AI推定スコア付き)
--   台本 : 1件(5シーン)
--   ログイン: demo@example.com / demo-password-2026

select 'デモデータの投入は npm run db:seed を使用してください。' as notice;
