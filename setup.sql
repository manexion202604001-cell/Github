-- 顧客管理システム用テーブル(SupabaseのSQL Editorで実行してください)

create table if not exists customers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS(行レベルセキュリティ)を有効化し、anonキーでの読み書きを許可
alter table customers enable row level security;

create policy "allow all read"   on customers for select using (true);
create policy "allow all insert" on customers for insert with check (true);
create policy "allow all update" on customers for update using (true);
create policy "allow all delete" on customers for delete using (true);

-- リアルタイム反映(他メンバーの編集を即時同期)を有効化
alter publication supabase_realtime add table customers;
