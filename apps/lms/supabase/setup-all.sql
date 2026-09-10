-- ============================================================
-- studio N LMS 一括セットアップ SQL（Supabase SQL Editor に貼り付けて Run）
-- 内容: テーブル → RLS/関数/トリガー/view/Storage バケット → 初期データ
-- 生成元: supabase/migrations/*.sql + supabase/seed.sql（ローカル PostgreSQL 16 で適用検証済み）
-- ============================================================

-- >>>>> supabase/migrations/20260909000001_schema.sql
-- generated from drizzle/0000_init.sql (npm run db:generate). 手で編集しない。
CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."lesson_type" AS ENUM('video', 'slide', 'text', 'quiz');
CREATE TYPE "public"."progress_status" AS ENUM('not_started', 'in_progress', 'completed');
CREATE TYPE "public"."qa_status" AS ENUM('open', 'answered', 'resolved');
CREATE TYPE "public"."reaction_kind" AS ENUM('clap', 'idea', 'thanks', 'fire');
CREATE TYPE "public"."skill_level" AS ENUM('beginner', 'intermediate', 'advanced');
CREATE TYPE "public"."user_role" AS ENUM('student', 'instructor', 'admin');
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"criteria" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);

CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"verify_code" text NOT NULL,
	"pdf_path" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_verify_code_unique" UNIQUE("verify_code"),
	CONSTRAINT "certificates_user_course" UNIQUE("user_id","course_id")
);

CREATE TABLE "channel_follows" (
	"user_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	CONSTRAINT "channel_follows_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);

CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "channels_slug_unique" UNIQUE("slug")
);

CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body_md" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"goals" text[],
	"category_id" uuid,
	"level" "skill_level" NOT NULL,
	"thumbnail_url" text,
	"duration_weeks" integer DEFAULT 2 NOT NULL,
	"is_sequential" boolean DEFAULT false NOT NULL,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);

CREATE TABLE "enrollments" (
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"source" text DEFAULT 'invitation' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "enrollments_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);

CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);

CREATE TABLE "lesson_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"size_bytes" integer
);

CREATE TABLE "lesson_notes" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"body_md" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_notes_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);

CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'not_started' NOT NULL,
	"last_position_sec" integer DEFAULT 0,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);

CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "lesson_type" NOT NULL,
	"youtube_video_id" text,
	"slide_url" text,
	"body_md" text,
	"duration_min" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "notification_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_qa_reply" boolean DEFAULT true NOT NULL,
	"email_new_course" boolean DEFAULT true NOT NULL,
	"email_office_hour" boolean DEFAULT true NOT NULL,
	"email_mention" boolean DEFAULT true NOT NULL,
	"email_weekly_summary" boolean DEFAULT false NOT NULL
);

CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "office_hour_attendance" (
	"office_hour_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "office_hour_attendance_office_hour_id_user_id_pk" PRIMARY KEY("office_hour_id","user_id")
);

CREATE TABLE "office_hour_question_votes" (
	"question_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "office_hour_question_votes_question_id_user_id_pk" PRIMARY KEY("question_id","user_id")
);

CREATE TABLE "office_hour_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_hour_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "office_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"theme" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"join_url" text,
	"recording_url" text,
	"summary_md" text,
	"reminded_24h_at" timestamp with time zone,
	"reminded_1h_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body_md" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"level" "skill_level",
	"is_public" boolean DEFAULT true NOT NULL,
	"hide_from_ranking" boolean DEFAULT false NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_active_on" date,
	"last_login_at" timestamp with time zone,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE TABLE "qa_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body_md" text NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "qa_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"lesson_id" uuid,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"status" "qa_status" DEFAULT 'open' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_faq" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score_percent" integer NOT NULL,
	"passed" boolean NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quiz_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"question" text NOT NULL,
	"explanation" text,
	"is_multiple" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"pass_percent" integer DEFAULT 80 NOT NULL,
	CONSTRAINT "quizzes_lesson_id_unique" UNIQUE("lesson_id")
);

CREATE TABLE "reactions" (
	"user_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"kind" "reaction_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_user_id_target_type_target_id_kind_pk" PRIMARY KEY("user_id","target_type","target_id","kind")
);

CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);

CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"xp" integer NOT NULL,
	"ref_type" text,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "xp_rules" (
	"action" text PRIMARY KEY NOT NULL,
	"xp" integer NOT NULL,
	"daily_cap" integer
);

ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "channel_follows" ADD CONSTRAINT "channel_follows_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "channel_follows" ADD CONSTRAINT "channel_follows_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lesson_attachments" ADD CONSTRAINT "lesson_attachments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lesson_notes" ADD CONSTRAINT "lesson_notes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "office_hour_attendance" ADD CONSTRAINT "office_hour_attendance_office_hour_id_office_hours_id_fk" FOREIGN KEY ("office_hour_id") REFERENCES "public"."office_hours"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "office_hour_attendance" ADD CONSTRAINT "office_hour_attendance_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "office_hour_question_votes" ADD CONSTRAINT "office_hour_question_votes_question_id_office_hour_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."office_hour_questions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "office_hour_question_votes" ADD CONSTRAINT "office_hour_question_votes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "office_hour_questions" ADD CONSTRAINT "office_hour_questions_office_hour_id_office_hours_id_fk" FOREIGN KEY ("office_hour_id") REFERENCES "public"."office_hours"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "office_hour_questions" ADD CONSTRAINT "office_hour_questions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "posts" ADD CONSTRAINT "posts_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qa_replies" ADD CONSTRAINT "qa_replies_thread_id_qa_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."qa_threads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qa_replies" ADD CONSTRAINT "qa_replies_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qa_threads" ADD CONSTRAINT "qa_threads_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qa_threads" ADD CONSTRAINT "qa_threads_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "qa_threads" ADD CONSTRAINT "qa_threads_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_choices" ADD CONSTRAINT "quiz_choices_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_action_xp_rules_action_fk" FOREIGN KEY ("action") REFERENCES "public"."xp_rules"("action") ON DELETE no action ON UPDATE no action;
CREATE INDEX "lesson_progress_user_updated" ON "lesson_progress" USING btree ("user_id","updated_at");
CREATE INDEX "notifications_user_read_created" ON "notifications" USING btree ("user_id","read_at","created_at" desc);
CREATE INDEX "xp_events_user_created" ON "xp_events" USING btree ("user_id","created_at");
-- >>>>> supabase/migrations/20260909000002_auth_rls_functions.sql
-- ============================================================
-- studio N LMS: auth 連携 / ヘルパー関数 / RLS / トリガー / view
-- REQUIREMENTS.md §7.1, §7.2
-- ============================================================

-- profiles.id → auth.users
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- ---------- ヘルパー ----------
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() in ('instructor', 'admin'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

-- レッスンが公開コースに属するか
create or replace function public.lesson_is_published(p_lesson_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.lessons l
    join public.sections s on s.id = l.section_id
    join public.courses c on c.id = s.course_id
    where l.id = p_lesson_id and c.status = 'published'
  )
$$;

-- ---------- auth.users → profiles 自動作成 ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'student')
  )
  on conflict (id) do nothing;
  insert into public.notification_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['courses','lesson_progress','lesson_notes','qa_threads','posts','app_settings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- 公式回答 → スレッド status = answered ----------
create or replace function public.on_official_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_official then
    update public.qa_threads set status = 'answered', updated_at = now()
      where id = new.thread_id and status = 'open';
  end if;
  return new;
end;
$$;
drop trigger if exists qa_reply_official on public.qa_replies;
create trigger qa_reply_official after insert on public.qa_replies
  for each row execute function public.on_official_reply();

-- ---------- ストリーク（本日の学習活動を記録） ----------
-- JST 基準。連続日なら +1、途切れたら 1 に戻す（罰則的な演出はしない: 数値のみ）
create or replace function public.touch_activity(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Tokyo')::date;
  last_on date;
  streak int;
begin
  select last_active_on, streak_days into last_on, streak from public.profiles where id = p_user_id;
  if last_on = today then
    return;
  elsif last_on = today - 1 then
    update public.profiles set streak_days = streak + 1, last_active_on = today where id = p_user_id;
  else
    update public.profiles set streak_days = 1, last_active_on = today where id = p_user_id;
  end if;
end;
$$;

create or replace function public.on_lesson_progress_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.touch_activity(new.user_id);
  return new;
end;
$$;
drop trigger if exists lesson_progress_touch on public.lesson_progress;
create trigger lesson_progress_touch after insert or update on public.lesson_progress
  for each row execute function public.on_lesson_progress_touch();

-- ---------- XP 合計の同期 ----------
create or replace function public.on_xp_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set total_xp = total_xp + new.xp where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists xp_event_sum on public.xp_events;
create trigger xp_event_sum after insert on public.xp_events
  for each row execute function public.on_xp_event();

-- ---------- ランキング materialized view（5 分ごと refresh） ----------
create materialized view if not exists public.ranking_total as
  select p.id as user_id, p.display_name, p.avatar_url, p.total_xp as xp,
         rank() over (order by p.total_xp desc, p.created_at asc) as rank
  from public.profiles p
  where p.hide_from_ranking = false and p.deleted_at is null and p.total_xp > 0;
create unique index if not exists ranking_total_user on public.ranking_total (user_id);

create materialized view if not exists public.ranking_weekly as
  with s as (
    select user_id, sum(xp) as xp from public.xp_events
    where created_at >= date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    group by user_id
  )
  select p.id as user_id, p.display_name, p.avatar_url, s.xp,
         rank() over (order by s.xp desc, p.created_at asc) as rank
  from s join public.profiles p on p.id = s.user_id
  where p.hide_from_ranking = false and p.deleted_at is null;
create unique index if not exists ranking_weekly_user on public.ranking_weekly (user_id);

create materialized view if not exists public.ranking_monthly as
  with s as (
    select user_id, sum(xp) as xp from public.xp_events
    where created_at >= date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo'
    group by user_id
  )
  select p.id as user_id, p.display_name, p.avatar_url, s.xp,
         rank() over (order by s.xp desc, p.created_at asc) as rank
  from s join public.profiles p on p.id = s.user_id
  where p.hide_from_ranking = false and p.deleted_at is null;
create unique index if not exists ranking_monthly_user on public.ranking_monthly (user_id);

create or replace function public.refresh_rankings()
returns void language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.ranking_total;
  refresh materialized view concurrently public.ranking_weekly;
  refresh materialized view concurrently public.ranking_monthly;
end;
$$;

-- 公開プロフィール view（メールを含まない。ランキング・メンバーページ用）
create or replace view public.public_profiles as
  select id, display_name, avatar_url, bio, level, role, total_xp, streak_days, created_at, deleted_at
  from public.profiles
  where is_public = true or id = auth.uid() or public.is_admin();

-- ---------- 退会（匿名化） ----------
create or replace function public.anonymize_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    display_name = '退会ユーザー', avatar_url = null, bio = null, is_public = false,
    hide_from_ranking = true, deleted_at = now()
  where id = p_user_id;
  delete from public.notification_settings where user_id = p_user_id;
  delete from public.lesson_notes where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','invitations','categories','courses','sections','lessons','lesson_attachments',
    'quizzes','quiz_questions','quiz_choices','quiz_attempts','enrollments','lesson_progress','lesson_notes',
    'qa_threads','qa_replies','channels','channel_follows','posts','comments','reactions','attachments','reports',
    'office_hours','office_hour_questions','office_hour_question_votes','office_hour_attendance',
    'xp_rules','xp_events','badges','user_badges','certificates','notifications','notification_settings',
    'announcements','audit_logs','app_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy "profiles_select" on public.profiles for select to authenticated
  using (is_public or id = auth.uid() or public.is_admin());
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles_admin_all" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- invitations（admin のみ。受諾処理は service role）
create policy "invitations_admin" on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- categories / courses / sections / lessons / attachments / quizzes
create policy "categories_read" on public.categories for select to authenticated, anon using (true);
create policy "categories_staff" on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "courses_read" on public.courses for select to authenticated
  using (status = 'published' or public.is_staff());
create policy "courses_staff" on public.courses for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "sections_read" on public.sections for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or public.is_staff())));
create policy "sections_staff" on public.sections for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "lessons_read" on public.lessons for select to authenticated
  using (public.lesson_is_published(id) or public.is_staff());
create policy "lessons_staff" on public.lessons for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "lesson_attachments_read" on public.lesson_attachments for select to authenticated
  using (public.lesson_is_published(lesson_id) or public.is_staff());
create policy "lesson_attachments_staff" on public.lesson_attachments for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "quizzes_read" on public.quizzes for select to authenticated using (public.lesson_is_published(lesson_id) or public.is_staff());
create policy "quizzes_staff" on public.quizzes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "quiz_questions_read" on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and (public.lesson_is_published(q.lesson_id) or public.is_staff())));
create policy "quiz_questions_staff" on public.quiz_questions for all to authenticated using (public.is_staff()) with check (public.is_staff());
-- 正解フラグは受講生に直接見せない（採点はサーバー側）。ラベルのみ view で公開
create policy "quiz_choices_staff" on public.quiz_choices for all to authenticated using (public.is_staff()) with check (public.is_staff());
create or replace view public.quiz_choices_public as
  select id, question_id, label, sort_order from public.quiz_choices;

create policy "quiz_attempts_self" on public.quiz_attempts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "quiz_attempts_insert" on public.quiz_attempts for insert to authenticated with check (user_id = auth.uid());

-- 進捗
create policy "enrollments_self" on public.enrollments for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "enrollments_insert" on public.enrollments for insert to authenticated with check (user_id = auth.uid());
create policy "enrollments_update" on public.enrollments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lesson_progress_self" on public.lesson_progress for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "lesson_progress_write" on public.lesson_progress for insert to authenticated with check (user_id = auth.uid());
create policy "lesson_progress_update" on public.lesson_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lesson_notes_self" on public.lesson_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Q&A
create policy "qa_threads_read" on public.qa_threads for select to authenticated
  using (is_private = false or user_id = auth.uid() or public.is_staff());
create policy "qa_threads_faq_public" on public.qa_threads for select to anon using (is_faq = true and is_private = false);
create policy "qa_threads_insert" on public.qa_threads for insert to authenticated with check (user_id = auth.uid());
create policy "qa_threads_update_owner" on public.qa_threads for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "qa_threads_staff" on public.qa_threads for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "qa_threads_admin_delete" on public.qa_threads for delete to authenticated using (public.is_admin());

create policy "qa_replies_read" on public.qa_replies for select to authenticated
  using (exists (select 1 from public.qa_threads t where t.id = thread_id and (t.is_private = false or t.user_id = auth.uid() or public.is_staff())));
create policy "qa_replies_faq_public" on public.qa_replies for select to anon
  using (exists (select 1 from public.qa_threads t where t.id = thread_id and t.is_faq and not t.is_private));
create policy "qa_replies_insert" on public.qa_replies for insert to authenticated
  with check (
    user_id = auth.uid() and (
      public.is_staff() or exists (select 1 from public.qa_threads t where t.id = thread_id and t.user_id = auth.uid())
    )
  );
create policy "qa_replies_admin_delete" on public.qa_replies for delete to authenticated using (public.is_admin());

-- コミュニティ
create policy "channels_read" on public.channels for select to authenticated using (true);
create policy "channels_admin" on public.channels for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "channel_follows_self" on public.channel_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "posts_read" on public.posts for select to authenticated using (is_hidden = false or user_id = auth.uid() or public.is_staff());
create policy "posts_insert" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "posts_update_owner" on public.posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "posts_staff" on public.posts for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "posts_delete" on public.posts for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "comments_read" on public.comments for select to authenticated using (is_hidden = false or user_id = auth.uid() or public.is_staff());
create policy "comments_insert" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments_update_staff" on public.comments for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "comments_delete" on public.comments for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "reactions_read" on public.reactions for select to authenticated using (true);
create policy "reactions_self" on public.reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "attachments_read" on public.attachments for select to authenticated using (true);
create policy "attachments_insert" on public.attachments for insert to authenticated with check (true);
create policy "attachments_admin" on public.attachments for delete to authenticated using (public.is_admin());

create policy "reports_insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_admin" on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- オフィスアワー
create policy "office_hours_read" on public.office_hours for select to authenticated using (true);
create policy "office_hours_staff" on public.office_hours for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "oh_questions_read" on public.office_hour_questions for select to authenticated using (true);
create policy "oh_questions_insert" on public.office_hour_questions for insert to authenticated with check (user_id = auth.uid());
create policy "oh_questions_delete" on public.office_hour_questions for delete to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "oh_votes_read" on public.office_hour_question_votes for select to authenticated using (true);
create policy "oh_votes_self" on public.office_hour_question_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "oh_attendance_read" on public.office_hour_attendance for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "oh_attendance_insert" on public.office_hour_attendance for insert to authenticated with check (user_id = auth.uid());

-- ゲーミフィケーション（書き込みは service role のみ）
create policy "xp_rules_read" on public.xp_rules for select to authenticated using (true);
create policy "xp_rules_admin" on public.xp_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "xp_events_self" on public.xp_events for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "badges_read" on public.badges for select to authenticated using (true);
create policy "badges_admin" on public.badges for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "user_badges_read" on public.user_badges for select to authenticated using (true);
create policy "certificates_self" on public.certificates for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- 検証ページ（anon）は verify_code 指定の 1 件のみ読める想定。サーバー側は service role で検証する

-- 通知・お知らせ
create policy "notifications_self" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_self" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notification_settings_self" on public.notification_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "announcements_read" on public.announcements for select to authenticated using (published_at is not null and published_at <= now() or public.is_admin());
create policy "announcements_admin" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "audit_logs_admin" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "app_settings_read" on public.app_settings for select to authenticated, anon using (true);
create policy "app_settings_admin" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage バケット ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp']),
  ('uploads', 'uploads', false, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
  ('lesson-files', 'lesson-files', false, 104857600, null),
  ('certificates', 'certificates', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_self_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_self_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads_member_read" on storage.objects for select to authenticated using (bucket_id = 'uploads');
create policy "uploads_self_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "lesson_files_member_read" on storage.objects for select to authenticated using (bucket_id = 'lesson-files');
create policy "lesson_files_staff_write" on storage.objects for all to authenticated
  using (bucket_id = 'lesson-files' and public.is_staff()) with check (bucket_id = 'lesson-files' and public.is_staff());
create policy "certificates_self_read" on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 全文検索（Q&A） ----------
create index if not exists qa_threads_fts on public.qa_threads
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body_md, '')));
create index if not exists posts_channel_created on public.posts (channel_id, created_at desc);
create index if not exists qa_threads_status_created on public.qa_threads (status, created_at desc);

-- >>>>> supabase/seed.sql
-- studio N LMS 初期データ（カテゴリ・チャンネル・XP ルール・バッジ）
insert into public.categories (slug, name, sort_order) values
  ('ai', 'AI 活用', 1),
  ('n8n', 'n8n', 2),
  ('dev', '開発', 3),
  ('dx', 'DX', 4)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.channels (slug, name, description, sort_order) values
  ('introduce', '自己紹介', 'はじめまして、のご挨拶をどうぞ。', 1),
  ('chat', '雑談', '学びに関係のない話も歓迎です。', 2),
  ('cases', '事例共有', '業務での活用事例を共有しましょう。', 3),
  ('help', 'つまずき相談', '受講生同士で助け合う場です。講師の公式回答は Q&A へ。', 4),
  ('showcase', '作ったもの', '作ったものを見せ合いましょう。', 5)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.xp_rules (action, xp, daily_cap) values
  ('lesson_complete', 10, null),
  ('quiz_pass', 20, null),
  ('course_complete', 100, null),
  ('qa_question', 5, null),
  ('community_post', 5, null),
  ('community_comment', 2, null),
  ('reaction_received', 1, 20),
  ('office_hour_attend', 30, null)
on conflict (action) do nothing;

insert into public.badges (slug, name, description, icon, criteria, sort_order) values
  ('first-step', 'はじめの一歩', '初めてレッスンを完了', 'footprints', '{"type":"lesson_complete","count":1}', 1),
  ('graduate', '修了', '初めてコースを完了', 'award', '{"type":"course_complete","count":1}', 2),
  ('triple-crown', '三冠', 'コースを 3 つ完了', 'crown', '{"type":"course_complete","count":3}', 3),
  ('explorer', '探究者', 'Q&A で 5 回質問', 'compass', '{"type":"qa_question","count":5}', 4),
  ('storyteller', '語り部', 'コミュニティに 10 回投稿', 'feather', '{"type":"community_post","count":10}', 5),
  ('perfect-attendance', '皆勤', 'オフィスアワーに 3 回参加', 'calendar-check', '{"type":"office_hour_attend","count":3}', 6),
  ('seven-days', '七日間', '7 日連続で学習', 'sunrise', '{"type":"streak","days":7}', 7),
  ('n8n-certified', 'n8n 認定', 'n8n カテゴリの全コースを完了', 'badge-check', '{"type":"category_complete","category":"n8n"}', 8),
  ('ai-certified', 'AI 活用 認定', 'AI 活用カテゴリの全コースを完了', 'badge-check', '{"type":"category_complete","category":"ai"}', 9)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, criteria = excluded.criteria, sort_order = excluded.sort_order;

insert into public.app_settings (key, value) values
  ('faq_visibility', '"public"'::jsonb)
on conflict (key) do nothing;
