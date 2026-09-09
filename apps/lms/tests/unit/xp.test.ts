import { describe, expect, it } from 'vitest'
import {
  DEFAULT_XP_RULES,
  calcCourseProgress,
  calcXpAward,
  evaluateBadges,
  generateVerifyCode,
  gradeQuiz,
  isCourseComplete,
  isLessonUnlocked,
  isValidVerifyCode,
  isVideoWatched,
  meetsBadgeCriteria,
  nextStreak,
  parseBadgeCriteria,
  xpToLevel,
  type BadgeStats,
} from '@/lib/xp'

describe('calcXpAward', () => {
  it('ルール通りの XP を返す', () => {
    expect(calcXpAward(DEFAULT_XP_RULES, 'lesson_complete')).toBe(10)
    expect(calcXpAward(DEFAULT_XP_RULES, 'course_complete')).toBe(100)
    expect(calcXpAward(DEFAULT_XP_RULES, 'quiz_pass')).toBe(20)
  })
  it('未知の行動は 0', () => {
    expect(calcXpAward(DEFAULT_XP_RULES, 'unknown')).toBe(0)
  })
  it('日次上限を尊重する（リアクション 1 日 20）', () => {
    expect(calcXpAward(DEFAULT_XP_RULES, 'reaction_received', 0)).toBe(1)
    expect(calcXpAward(DEFAULT_XP_RULES, 'reaction_received', 19)).toBe(1)
    expect(calcXpAward(DEFAULT_XP_RULES, 'reaction_received', 20)).toBe(0)
    expect(calcXpAward(DEFAULT_XP_RULES, 'reaction_received', 25)).toBe(0)
  })
  it('上限までの残りに丸める', () => {
    expect(calcXpAward([{ action: 'a', xp: 10, dailyCap: 15 }], 'a', 10)).toBe(5)
  })
})

describe('xpToLevel', () => {
  it('しきい値通りにレベルが上がる', () => {
    expect(xpToLevel(0).level).toBe(1)
    expect(xpToLevel(99).level).toBe(1)
    expect(xpToLevel(100).level).toBe(2)
    expect(xpToLevel(299).level).toBe(2)
    expect(xpToLevel(300).level).toBe(3)
    expect(xpToLevel(600).level).toBe(4)
  })
  it('進捗率を返す', () => {
    const r = xpToLevel(200)
    expect(r.level).toBe(2)
    expect(r.progress).toBeCloseTo(0.5)
  })
})

describe('進捗判定', () => {
  it('コース進捗率', () => {
    expect(calcCourseProgress(10, 4)).toBe(40)
    expect(calcCourseProgress(0, 0)).toBe(0)
    expect(calcCourseProgress(3, 5)).toBe(100)
  })
  it('コース完了', () => {
    expect(isCourseComplete(3, 3)).toBe(true)
    expect(isCourseComplete(3, 2)).toBe(false)
    expect(isCourseComplete(0, 0)).toBe(false)
  })
  it('動画 90% 視聴', () => {
    expect(isVideoWatched(90, 100)).toBe(true)
    expect(isVideoWatched(89, 100)).toBe(false)
    expect(isVideoWatched(10, 0)).toBe(false)
  })
  it('順番受講の解放判定', () => {
    const ids = ['a', 'b', 'c']
    expect(isLessonUnlocked(false, ids, 'c', [])).toBe(true)
    expect(isLessonUnlocked(true, ids, 'a', [])).toBe(true)
    expect(isLessonUnlocked(true, ids, 'b', [])).toBe(false)
    expect(isLessonUnlocked(true, ids, 'c', ['a', 'b'])).toBe(true)
    expect(isLessonUnlocked(true, ids, 'c', new Set(['a']))).toBe(false)
    expect(isLessonUnlocked(true, ids, 'zzz', ['a', 'b', 'c'])).toBe(false)
  })
})

describe('gradeQuiz', () => {
  const qs = [
    { id: 'q1', isMultiple: false, correctChoiceIds: ['c1'] },
    { id: 'q2', isMultiple: true, correctChoiceIds: ['c3', 'c4'] },
    { id: 'q3', isMultiple: false, correctChoiceIds: ['c6'] },
    { id: 'q4', isMultiple: false, correctChoiceIds: ['c8'] },
    { id: 'q5', isMultiple: false, correctChoiceIds: ['c9'] },
  ]
  it('全問正解で合格', () => {
    const r = gradeQuiz(qs, { q1: ['c1'], q2: ['c4', 'c3'], q3: ['c6'], q4: ['c8'], q5: ['c9'] })
    expect(r.scorePercent).toBe(100)
    expect(r.passed).toBe(true)
  })
  it('80% で合格、60% は不合格', () => {
    expect(gradeQuiz(qs, { q1: ['c1'], q2: ['c4', 'c3'], q3: ['c6'], q4: ['c8'] }).passed).toBe(true)
    expect(gradeQuiz(qs, { q1: ['c1'], q2: ['c4', 'c3'], q3: ['c6'] }).passed).toBe(false)
  })
  it('複数選択は部分正解を認めない', () => {
    const r = gradeQuiz(qs, { q2: ['c3'] })
    expect(r.perQuestion.q2).toBe(false)
  })
  it('問題がない場合は不合格', () => {
    expect(gradeQuiz([], {}).passed).toBe(false)
  })
})

describe('nextStreak', () => {
  it('初回は 1', () => expect(nextStreak(null, '2026-09-09', 0)).toBe(1))
  it('同日は維持', () => expect(nextStreak('2026-09-09', '2026-09-09', 4)).toBe(4))
  it('連続日は +1', () => expect(nextStreak('2026-09-08', '2026-09-09', 4)).toBe(5))
  it('途切れたら 1', () => expect(nextStreak('2026-09-01', '2026-09-09', 4)).toBe(1))
})

describe('バッジ判定', () => {
  const base: BadgeStats = {
    lessonsCompleted: 0,
    coursesCompleted: 0,
    qaQuestions: 0,
    communityPosts: 0,
    officeHoursAttended: 0,
    streakDays: 0,
    totalXp: 0,
    categories: {},
  }
  it('criteria のパース', () => {
    expect(parseBadgeCriteria({ type: 'course_complete', count: 3 })).toEqual({ type: 'course_complete', count: 3 })
    expect(parseBadgeCriteria({ type: 'streak', days: 7 })).toEqual({ type: 'streak', days: 7 })
    expect(parseBadgeCriteria({ type: 'category_complete', category: 'n8n' })).toEqual({
      type: 'category_complete',
      category: 'n8n',
    })
    expect(parseBadgeCriteria({ type: 'nope' })).toBeNull()
    expect(parseBadgeCriteria(null)).toBeNull()
  })
  it('§5.6 の初期バッジ条件', () => {
    expect(meetsBadgeCriteria({ type: 'lesson_complete', count: 1 }, { ...base, lessonsCompleted: 1 })).toBe(true)
    expect(meetsBadgeCriteria({ type: 'course_complete', count: 1 }, { ...base, coursesCompleted: 1 })).toBe(true)
    expect(meetsBadgeCriteria({ type: 'course_complete', count: 3 }, { ...base, coursesCompleted: 2 })).toBe(false)
    expect(meetsBadgeCriteria({ type: 'qa_question', count: 5 }, { ...base, qaQuestions: 5 })).toBe(true)
    expect(meetsBadgeCriteria({ type: 'community_post', count: 10 }, { ...base, communityPosts: 9 })).toBe(false)
    expect(meetsBadgeCriteria({ type: 'office_hour_attend', count: 3 }, { ...base, officeHoursAttended: 3 })).toBe(true)
    expect(meetsBadgeCriteria({ type: 'streak', days: 7 }, { ...base, streakDays: 7 })).toBe(true)
  })
  it('カテゴリ認定は全コース完了が必要', () => {
    const c = { type: 'category_complete' as const, category: 'n8n' }
    expect(meetsBadgeCriteria(c, { ...base, categories: { n8n: { total: 2, completed: 2 } } })).toBe(true)
    expect(meetsBadgeCriteria(c, { ...base, categories: { n8n: { total: 2, completed: 1 } } })).toBe(false)
    expect(meetsBadgeCriteria(c, { ...base, categories: { n8n: { total: 0, completed: 0 } } })).toBe(false)
    expect(meetsBadgeCriteria(c, base)).toBe(false)
  })
  it('evaluateBadges は未獲得かつ条件達成のみ返す', () => {
    const badges = [
      { id: 'b1', criteria: { type: 'lesson_complete', count: 1 } },
      { id: 'b2', criteria: { type: 'course_complete', count: 1 } },
      { id: 'b3', criteria: { type: 'broken' } },
    ]
    const r = evaluateBadges(badges, ['b1'], { ...base, lessonsCompleted: 3, coursesCompleted: 1 })
    expect(r.map((b) => b.id)).toEqual(['b2'])
  })
})

describe('verify code', () => {
  it('形式 SN-YYYY-XXXXXX', () => {
    const code = generateVerifyCode(2026, () => 0.5)
    expect(code).toMatch(/^SN-2026-[A-HJ-NP-Z2-9]{6}$/)
    expect(isValidVerifyCode(code)).toBe(true)
    expect(isValidVerifyCode('SN-2026-7F3K9Q')).toBe(true)
    expect(isValidVerifyCode('sn-2026-7f3k9q')).toBe(false)
    expect(isValidVerifyCode('SN-2026-0O1I')).toBe(false)
  })
})
