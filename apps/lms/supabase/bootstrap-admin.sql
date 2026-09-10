-- ============================================================
-- 最初の管理者を作る（setup-all.sql の後に実行）
-- 1. Supabase ダッシュボード → Authentication → Users →「Add user」→「Create new user」で
--    メール + パスワードを入力（Auto Confirm User: ON）
-- 2. 下の <メールアドレス> を書き換えて Run
-- ============================================================
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = '<メールアドレス>';
  if uid is null then raise exception 'ユーザーが見つかりません。先に Authentication → Users で作成してください。'; end if;
  insert into public.profiles (id, display_name, role) values (uid, 'studio N', 'admin')
    on conflict (id) do update set role = 'admin';
  insert into public.notification_settings (user_id) values (uid) on conflict do nothing;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where id = uid;
end $$;

select p.id, u.email, p.display_name, p.role, u.raw_app_meta_data
from public.profiles p join auth.users u on u.id = p.id where p.role = 'admin';
