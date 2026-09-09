'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { submitQuiz } from '@/lib/actions/learn'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { cn } from '@/lib/utils'

type Quiz = { id: string; passPercent: number; questions: { id: string; question: string; isMultiple: boolean; choices: { id: string; label: string }[] }[] }
type Result = { scorePercent: number; passed: boolean; perQuestion: Record<string, boolean>; explanations: Record<string, string | null> }

/** LEARN-06: 小テスト（単一／複数選択、何度でも再挑戦） */
export function QuizPlayer({ quiz, completed, nextHref }: { quiz: Quiz; completed: boolean; nextHref: string }) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  const toggle = (qid: string, cid: string, multiple: boolean) =>
    setAnswers((prev) => {
      const cur = prev[qid] ?? []
      if (!multiple) return { ...prev, [qid]: [cid] }
      return { ...prev, [qid]: cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid] }
    })

  const submit = () =>
    start(async () => {
      const r = await submitQuiz(quiz.id, answers)
      if (!r.ok) return toast(r.error)
      setResult(r.data)
      if (r.data.passed) {
        toast('合格です。レッスンを完了しました。')
        router.refresh()
      }
    })

  const answeredAll = quiz.questions.every((q) => (answers[q.id] ?? []).length > 0)

  return (
    <div className="space-y-10">
      <p className="caption tnum">合格ライン {quiz.passPercent}% ・ {quiz.questions.length} 問{completed ? ' ・ 合格済み（再挑戦できます）' : ''}</p>
      {quiz.questions.map((q, i) => {
        const chosen = answers[q.id] ?? []
        const verdict = result?.perQuestion[q.id]
        return (
          <fieldset key={q.id} className="space-y-3">
            <legend className="font-serif text-[17px] leading-[1.7]">
              <span className="caption tnum mr-2">Q{i + 1}</span>
              {q.question}
              {q.isMultiple && <span className="caption ml-2">（複数選択）</span>}
            </legend>
            <ul className="space-y-2">
              {q.choices.map((c) => {
                const on = chosen.includes(c.id)
                return (
                  <li key={c.id}>
                    <label className={cn('flex cursor-pointer items-start gap-3 rounded border bg-paper-100 px-4 py-3 transition-colors hover:border-bronze-500', on && 'border-ink-900')}>
                      <input
                        type={q.isMultiple ? 'checkbox' : 'radio'}
                        name={q.id}
                        checked={on}
                        onChange={() => toggle(q.id, c.id, q.isMultiple)}
                        className="mt-1.5 accent-ink-900"
                        disabled={pending}
                      />
                      <span className="font-serif text-[15px] leading-[1.8]">{c.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            {result && (
              <p className={cn('caption', verdict ? 'text-state-success' : 'text-state-danger')}>
                {verdict ? '正解' : '不正解'}
                {result.explanations[q.id] && <span className="ml-2 text-stone-500">{result.explanations[q.id]}</span>}
              </p>
            )}
          </fieldset>
        )
      })}
      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <Button onClick={submit} disabled={pending || !answeredAll}>
          {result ? 'もう一度挑戦' : '回答する'}
        </Button>
        {result && (
          <p className={cn('font-serif tnum', result.passed ? 'text-state-success' : 'text-ink-700')}>
            {result.scorePercent}% — {result.passed ? '合格' : '不合格'}
          </p>
        )}
        {result?.passed && (
          <Button variant="outline" asChild>
            <Link href={nextHref}>次へ進む</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
