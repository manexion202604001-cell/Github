/**
 * XP ルール・レベル・バッジ判定・進捗判定（純粋関数。テスト対象）
 * REQUIREMENTS.md §5.6 / §5.2
 */

export const XP_ACTIONS = [
  'lesson_complete',
  'quiz_pass',
  'course_complete',
  'qa_question',
  'community_post',
  'community_comment',
  'reaction_received',
  'office_hour_attend',
] as const
export type XpAction = (typeof XP_ACTIONS)[number]

export const XP_ACTION_LABEL: Record<XpAction, string> = {
  lesson_complete: 'レッスン完了',
  quiz_pass: '小テスト合格',
  course_complete: 'コース完了',
  qa_question: 'Q&A で質問',
  community_post: 'コミュニティに投稿',
  community_comment: 'コミュニティにコメント',
  reaction_received: 'リアクションを受け取る',
  office_hour_attend: 'オフィスアワー参加',
}

export type XpRule = { action: string; xp: number; dailyCap: number | null }

export const DEFAULT_XP_RULES: XpRule[] = [
  { action: 'lesson_complete', xp: 10, dailyCap: null },
  { action: 'quiz_pass', xp: 20, dailyCap: null },
  { action: 'course_complete', xp: 100, dailyCap: null },
  { action: 'qa_question', xp: 5, dailyCap: null },
  { action: 'community_post', xp: 5, dailyCap: null },
  { action: 'community_comment', xp: 2, dailyCap: null },
  { action: 'reaction_received', xp: 1, dailyCap: 20 },
  { action: 'office_hour_attend', xp: 30, dailyCap: null },
]

/**
 * 付与すべき XP を計算する。日次上限がある場合は本日の獲得済み XP を考慮する。
 * @returns 付与 XP（0 の場合は付与しない）
 */
export function calcXpAward(rules: XpRule[], action: string, todayEarnedForAction = 0): number {
  const rule = rules.find((r) => r.action === action)
  if (!rule || rule.xp <= 0) return 0
  if (rule.dailyCap == null) return rule.xp
  const remaining = rule.dailyCap - todayEarnedForAction
  if (remaining <= 0) return 0
  return Math.min(rule.xp, remaining)
}

/** レベル: 累計 XP から算出。Lv.n に必要な XP = 100 × n × (n − 1) / 2 （Lv.2=100, Lv.3=300, Lv.4=600 …） */
export function xpToLevel(totalXp: number): { level: number; current: number; next: number; progress: number } {
  const xp = Math.max(0, Math.floor(totalXp))
  let level = 1
  while (xpRequiredForLevel(level + 1) <= xp) level++
  const current = xpRequiredForLevel(level)
  const next = xpRequiredForLevel(level + 1)
  const progress = next === current ? 1 : (xp - current) / (next - current)
  return { level, current, next, progress: Math.min(1, Math.max(0, progress)) }
}

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0
  return (100 * level * (level - 1)) / 2
}

// ---------- 進捗 ----------

/** コース進捗率 = 完了レッスン数 / 全レッスン数（%、整数） */
export function calcCourseProgress(totalLessons: number, completedLessons: number): number {
  if (totalLessons <= 0) return 0
  const pct = Math.round((Math.min(completedLessons, totalLessons) / totalLessons) * 100)
  return Math.max(0, Math.min(100, pct))
}

export function isCourseComplete(totalLessons: number, completedLessons: number): boolean {
  return totalLessons > 0 && completedLessons >= totalLessons
}

/** 動画: 90% 以上視聴で完了扱い */
export function isVideoWatched(positionSec: number, durationSec: number, threshold = 0.9): boolean {
  if (durationSec <= 0) return false
  return positionSec / durationSec >= threshold
}

/** 順番受講: 直前までのレッスンがすべて完了していれば解放 */
export function isLessonUnlocked(
  isSequential: boolean,
  orderedLessonIds: string[],
  targetLessonId: string,
  completedLessonIds: Set<string> | string[],
): boolean {
  if (!isSequential) return true
  const completed = completedLessonIds instanceof Set ? completedLessonIds : new Set(completedLessonIds)
  const idx = orderedLessonIds.indexOf(targetLessonId)
  if (idx < 0) return false
  for (let i = 0; i < idx; i++) {
    const id = orderedLessonIds[i]
    if (id && !completed.has(id)) return false
  }
  return true
}

// ---------- 小テスト ----------

export type QuizQuestionInput = { id: string; isMultiple: boolean; correctChoiceIds: string[] }
export type QuizAnswers = Record<string, string[]>

export function gradeQuiz(
  questions: QuizQuestionInput[],
  answers: QuizAnswers,
  passPercent = 80,
): { scorePercent: number; passed: boolean; correct: number; total: number; perQuestion: Record<string, boolean> } {
  const total = questions.length
  let correct = 0
  const perQuestion: Record<string, boolean> = {}
  for (const q of questions) {
    const given = [...new Set(answers[q.id] ?? [])].sort()
    const expected = [...new Set(q.correctChoiceIds)].sort()
    const isCorrect = given.length === expected.length && given.every((v, i) => v === expected[i])
    perQuestion[q.id] = isCorrect
    if (isCorrect) correct++
  }
  const scorePercent = total === 0 ? 0 : Math.round((correct / total) * 100)
  return { scorePercent, passed: total > 0 && scorePercent >= passPercent, correct, total, perQuestion }
}

// ---------- ストリーク ----------

/** 前回活動日と今日（いずれも YYYY-MM-DD, JST）から新しいストリークを求める */
export function nextStreak(lastActiveOn: string | null, today: string, currentStreak: number): number {
  if (!lastActiveOn) return 1
  if (lastActiveOn === today) return Math.max(1, currentStreak)
  const last = new Date(`${lastActiveOn}T00:00:00Z`).getTime()
  const now = new Date(`${today}T00:00:00Z`).getTime()
  const diffDays = Math.round((now - last) / 86_400_000)
  if (diffDays === 1) return currentStreak + 1
  return 1
}

// ---------- バッジ ----------

export type BadgeCriteria =
  | { type: 'lesson_complete'; count: number }
  | { type: 'course_complete'; count: number }
  | { type: 'qa_question'; count: number }
  | { type: 'community_post'; count: number }
  | { type: 'office_hour_attend'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'category_complete'; category: string }
  | { type: 'xp_total'; xp: number }

export type BadgeStats = {
  lessonsCompleted: number
  coursesCompleted: number
  qaQuestions: number
  communityPosts: number
  officeHoursAttended: number
  streakDays: number
  totalXp: number
  /** カテゴリ slug → { total: 公開コース数, completed: 完了数 } */
  categories: Record<string, { total: number; completed: number }>
}

export function parseBadgeCriteria(raw: unknown): BadgeCriteria | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const type = c.type
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  switch (type) {
    case 'lesson_complete':
    case 'course_complete':
    case 'qa_question':
    case 'community_post':
    case 'office_hour_attend': {
      const count = n(c.count)
      return count == null ? null : { type, count }
    }
    case 'streak': {
      const days = n(c.days)
      return days == null ? null : { type, days }
    }
    case 'xp_total': {
      const xp = n(c.xp)
      return xp == null ? null : { type, xp }
    }
    case 'category_complete':
      return typeof c.category === 'string' ? { type, category: c.category } : null
    default:
      return null
  }
}

export function meetsBadgeCriteria(criteria: BadgeCriteria, stats: BadgeStats): boolean {
  switch (criteria.type) {
    case 'lesson_complete':
      return stats.lessonsCompleted >= criteria.count
    case 'course_complete':
      return stats.coursesCompleted >= criteria.count
    case 'qa_question':
      return stats.qaQuestions >= criteria.count
    case 'community_post':
      return stats.communityPosts >= criteria.count
    case 'office_hour_attend':
      return stats.officeHoursAttended >= criteria.count
    case 'streak':
      return stats.streakDays >= criteria.days
    case 'xp_total':
      return stats.totalXp >= criteria.xp
    case 'category_complete': {
      const cat = stats.categories[criteria.category]
      return !!cat && cat.total > 0 && cat.completed >= cat.total
    }
  }
}

/** 未獲得バッジのうち条件を満たしたものを返す */
export function evaluateBadges<B extends { id: string; criteria: unknown }>(
  badges: B[],
  earnedBadgeIds: Iterable<string>,
  stats: BadgeStats,
): B[] {
  const earned = new Set(earnedBadgeIds)
  return badges.filter((b) => {
    if (earned.has(b.id)) return false
    const c = parseBadgeCriteria(b.criteria)
    return c ? meetsBadgeCriteria(c, stats) : false
  })
}

// ---------- 修了証 ----------

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** 例: SN-2026-7F3K9Q */
export function generateVerifyCode(year: number, random: () => number = Math.random): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return `SN-${year}-${s}`
}

export function isValidVerifyCode(code: string): boolean {
  return /^SN-\d{4}-[A-HJ-NP-Z2-9]{6}$/.test(code)
}
