-- 稟議システム用テーブル(SupabaseのSQL Editorで実行してください)
-- 1行 = 1レコード(稟議書 / メンバー / ルートテンプレート / 採番カウンタ)。
-- id は "doc:xxx" "member:xxx" "template:xxx" "meta:seq" のような prefix 付き。

create table if not exists ringi_records (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS(行レベルセキュリティ)を有効化し、anonキーでの読み書きを許可
alter table ringi_records enable row level security;

create policy "ringi allow all read"   on ringi_records for select using (true);
create policy "ringi allow all insert" on ringi_records for insert with check (true);
create policy "ringi allow all update" on ringi_records for update using (true);
create policy "ringi allow all delete" on ringi_records for delete using (true);

-- リアルタイム反映(他メンバーの操作を即時同期)を有効化
alter publication supabase_realtime add table ringi_records;
