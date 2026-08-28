-- SNS COMPASS — Row Level Security(要件66, 67)
--
-- 前提
--   テーブル定義は Prisma スキーマ(prisma/schema.prisma)が単一の出所です。
--   `prisma migrate deploy` もしくは `prisma db push` でテーブルを作成したあと、
--   この SQL を実行して行レベルセキュリティを有効化してください。
--
-- 方針
--   アプリケーションは Prisma からテーブル所有者ロールで接続するため RLS を通過します。
--   認可はサービス層(src/server/authz.ts の requireOrganization / requireBrandAccess)が
--   すべての入口で行い、単体テストで固定しています。
--   この SQL は「アプリを経由しない経路」を塞ぐための多層防御です。
--   Supabase の PostgREST は anon / authenticated ロールで接続するため、
--   RLS を有効化しつつポリシーを作らないことで、これらのロールからの読み書きを
--   すべて拒否します(deny by default)。
--
-- 実行方法
--   psql "$DIRECT_URL" -f supabase/migrations/0001_row_level_security.sql

do $$
declare
  target text;
  api_role text;
  -- Supabase の PostgREST が使うロール。素の PostgreSQL には存在しないため、
  -- 実在するものだけを対象にする(環境差でマイグレーションが落ちないようにする)。
  api_roles text[] := array['anon', 'authenticated'];
  tables text[] := array[
    'users',
    'sessions',
    'organizations',
    'organization_members',
    'brands',
    'brand_products',
    'brand_rules',
    'competitors',
    'research_runs',
    'research_sources',
    'research_insights',
    'ideas',
    'idea_scores',
    'idea_hooks',
    'scripts',
    'script_scenes',
    'production_briefs',
    'video_prompts',
    'script_captions',
    'brand_checks',
    'calendar_items',
    'ai_usage_logs',
    'audit_logs'
  ];
begin
  foreach target in array tables loop
    if to_regclass(format('public.%I', target)) is not null then
      -- RLS を有効化する。ポリシーが無いため、所有者以外のロールからは全操作が拒否される。
      execute format('alter table public.%I enable row level security', target);
      -- 所有者ロール自身にも RLS を適用する(将来ポリシーを追加した際の取りこぼしを防ぐ)。
      -- アプリ接続が所有者ロールの場合はコメントアウトのままにしてください。
      -- execute format('alter table public.%I force row level security', target);

      -- PostgREST 経由(anon / authenticated)の権限を明示的に剥奪する。
      foreach api_role in array api_roles loop
        if exists (select 1 from pg_roles where rolname = api_role) then
          execute format('revoke all on public.%I from %I', target, api_role);
        end if;
      end loop;
    end if;
  end loop;

  -- スキーマそのものへの利用権限も落としておく。
  foreach api_role in array api_roles loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke usage on schema public from %I', api_role);
    end if;
  end loop;
end
$$;

-- 参考: Supabase Auth を認証基盤として使う構成へ移行する場合は、
-- 以下のような組織スコープのポリシーを各テーブルへ追加します。
--
--   create policy "organization members can read brands"
--     on public.brands for select
--     using (
--       exists (
--         select 1 from public.organization_members m
--         where m.organization_id = brands.organization_id
--           and m.user_id = auth.uid()::text
--           and m.joined_at is not null
--       )
--     );
