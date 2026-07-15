-- PatentBridge PoC用テーブル(SupabaseのSQL Editorで実行してください)
-- 既存の顧客台帳と同じSupabaseプロジェクトで動きます(テーブル名は pb_ プレフィックスで分離)

create table if not exists pb_patents (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,           -- {title, patent_no, applicant, abstract, created_by, analysis}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pb_comments (
  id uuid primary key default gen_random_uuid(),
  patent_id uuid not null references pb_patents(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- RLS(行レベルセキュリティ)を有効化し、anonキーでの読み書きを許可
alter table pb_patents enable row level security;
alter table pb_comments enable row level security;

create policy "pb_patents allow all read"   on pb_patents for select using (true);
create policy "pb_patents allow all insert" on pb_patents for insert with check (true);
create policy "pb_patents allow all update" on pb_patents for update using (true);
create policy "pb_patents allow all delete" on pb_patents for delete using (true);

create policy "pb_comments allow all read"   on pb_comments for select using (true);
create policy "pb_comments allow all insert" on pb_comments for insert with check (true);
create policy "pb_comments allow all delete" on pb_comments for delete using (true);

-- リアルタイム反映(他メンバーの登録・解析を即時同期)
alter publication supabase_realtime add table pb_patents;
alter publication supabase_realtime add table pb_comments;
