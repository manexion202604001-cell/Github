import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

// ========== enums ==========
export const userRole = pgEnum('user_role', ['student', 'instructor', 'admin'])
export const skillLevel = pgEnum('skill_level', ['beginner', 'intermediate', 'advanced'])
export const courseStatus = pgEnum('course_status', ['draft', 'published', 'archived'])
export const lessonType = pgEnum('lesson_type', ['video', 'slide', 'text', 'quiz'])
export const progressStatus = pgEnum('progress_status', ['not_started', 'in_progress', 'completed'])
export const qaStatus = pgEnum('qa_status', ['open', 'answered', 'resolved'])
export const reactionKind = pgEnum('reaction_kind', ['clap', 'idea', 'thanks', 'fire'])

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

// ========== ユーザー ==========
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // references auth.users (migration 側で FK)
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  role: userRole('role').notNull().default('student'),
  level: skillLevel('level'),
  isPublic: boolean('is_public').notNull().default(true),
  hideFromRanking: boolean('hide_from_ranking').notNull().default(false),
  totalXp: integer('total_xp').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  lastActiveOn: date('last_active_on'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  createdAt: createdAt(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  role: userRole('role').notNull().default('student'),
  invitedBy: uuid('invited_by').references(() => profiles.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
})

// ========== コース ==========
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  goals: text('goals').array(),
  categoryId: uuid('category_id').references(() => categories.id),
  level: skillLevel('level').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  durationWeeks: integer('duration_weeks').notNull().default(2),
  isSequential: boolean('is_sequential').notNull().default(false),
  status: courseStatus('status').notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => profiles.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id')
    .notNull()
    .references(() => sections.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: lessonType('type').notNull(),
  youtubeVideoId: text('youtube_video_id'),
  slideUrl: text('slide_url'),
  bodyMd: text('body_md'),
  durationMin: integer('duration_min'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
})

export const lessonAttachments = pgTable('lesson_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(),
  sizeBytes: integer('size_bytes'),
})

// ========== 小テスト ==========
export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  passPercent: integer('pass_percent').notNull().default(80),
})

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  explanation: text('explanation'),
  isMultiple: boolean('is_multiple').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const quizChoices = pgTable('quiz_choices', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .references(() => quizQuestions.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  scorePercent: integer('score_percent').notNull(),
  passed: boolean('passed').notNull(),
  answers: jsonb('answers').notNull(),
  createdAt: createdAt(),
})

// ========== 進捗 ==========
export const enrollments = pgTable(
  'enrollments',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    // TODO(decision-#3): 将来の決済導入に備えて source 列を保持
    source: text('source').notNull().default('invitation'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    status: progressStatus('status').notNull().default('not_started'),
    lastPositionSec: integer('last_position_sec').default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] }), index('lesson_progress_user_updated').on(t.userId, t.updatedAt)],
)

export const lessonNotes = pgTable(
  'lesson_notes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    bodyMd: text('body_md'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
)

// ========== Q&A ==========
export const qaThreads = pgTable('qa_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id),
  lessonId: uuid('lesson_id').references(() => lessons.id),
  title: text('title').notNull(),
  bodyMd: text('body_md').notNull(),
  status: qaStatus('status').notNull().default('open'),
  isPrivate: boolean('is_private').notNull().default(false),
  isFaq: boolean('is_faq').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const qaReplies = pgTable('qa_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => qaThreads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  bodyMd: text('body_md').notNull(),
  isOfficial: boolean('is_official').notNull().default(false),
  createdAt: createdAt(),
})

// ========== コミュニティ ==========
export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const channelFollows = pgTable(
  'channel_follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channelId] })],
)

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  bodyMd: text('body_md').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  bodyMd: text('body_md').notNull(),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: createdAt(),
})

export const reactions = pgTable(
  'reactions',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    kind: reactionKind('kind').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId, t.kind] })],
)

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  storagePath: text('storage_path').notNull(),
  createdAt: createdAt(),
})

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => profiles.id),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  reason: text('reason'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: createdAt(),
})

// ========== オフィスアワー ==========
export const officeHours = pgTable('office_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  theme: text('theme'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMin: integer('duration_min').notNull().default(60),
  joinUrl: text('join_url'),
  recordingUrl: text('recording_url'),
  summaryMd: text('summary_md'),
  reminded24hAt: timestamp('reminded_24h_at', { withTimezone: true }),
  reminded1hAt: timestamp('reminded_1h_at', { withTimezone: true }),
  createdAt: createdAt(),
})

export const officeHourQuestions = pgTable('office_hour_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  officeHourId: uuid('office_hour_id')
    .notNull()
    .references(() => officeHours.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: createdAt(),
})

export const officeHourQuestionVotes = pgTable(
  'office_hour_question_votes',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => officeHourQuestions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.userId] })],
)

export const officeHourAttendance = pgTable(
  'office_hour_attendance',
  {
    officeHourId: uuid('office_hour_id')
      .notNull()
      .references(() => officeHours.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.officeHourId, t.userId] })],
)

// ========== ゲーミフィケーション ==========
export const xpRules = pgTable('xp_rules', {
  action: text('action').primaryKey(),
  xp: integer('xp').notNull(),
  dailyCap: integer('daily_cap'),
})

export const xpEvents = pgTable(
  'xp_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    action: text('action')
      .notNull()
      .references(() => xpRules.action),
    xp: integer('xp').notNull(),
    refType: text('ref_type'),
    refId: uuid('ref_id'),
    createdAt: createdAt(),
  },
  (t) => [index('xp_events_user_created').on(t.userId, t.createdAt)],
)

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  criteria: jsonb('criteria').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
)

export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    verifyCode: text('verify_code').notNull().unique(),
    pdfPath: text('pdf_path'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('certificates_user_course').on(t.userId, t.courseId)],
)

// ========== 通知・お知らせ ==========
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    link: text('link'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_read_created').on(t.userId, t.readAt, sql`${t.createdAt} desc`)],
)

export const notificationSettings = pgTable('notification_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  emailQaReply: boolean('email_qa_reply').notNull().default(true),
  emailNewCourse: boolean('email_new_course').notNull().default(true),
  emailOfficeHour: boolean('email_office_hour').notNull().default(true),
  emailMention: boolean('email_mention').notNull().default(true),
  emailWeeklySummary: boolean('email_weekly_summary').notNull().default(false),
})

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  bodyMd: text('body_md').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: createdAt(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => profiles.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  detail: jsonb('detail'),
  createdAt: createdAt(),
})

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
})

// ========== 型 ==========
export type Profile = typeof profiles.$inferSelect
export type Course = typeof courses.$inferSelect
export type Section = typeof sections.$inferSelect
export type Lesson = typeof lessons.$inferSelect
export type LessonAttachment = typeof lessonAttachments.$inferSelect
export type Quiz = typeof quizzes.$inferSelect
export type QuizQuestion = typeof quizQuestions.$inferSelect
export type QuizChoice = typeof quizChoices.$inferSelect
export type Enrollment = typeof enrollments.$inferSelect
export type LessonProgress = typeof lessonProgress.$inferSelect
export type QaThread = typeof qaThreads.$inferSelect
export type QaReply = typeof qaReplies.$inferSelect
export type Channel = typeof channels.$inferSelect
export type Post = typeof posts.$inferSelect
export type Comment = typeof comments.$inferSelect
export type OfficeHour = typeof officeHours.$inferSelect
export type Badge = typeof badges.$inferSelect
export type Certificate = typeof certificates.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type NotificationSettings = typeof notificationSettings.$inferSelect
export type Announcement = typeof announcements.$inferSelect
export type UserRole = Profile['role']
export type SkillLevel = NonNullable<Profile['level']>
