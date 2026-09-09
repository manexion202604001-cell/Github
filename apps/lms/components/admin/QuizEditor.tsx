'use client'
import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Field, Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Switch } from '@/components/ui/Switch'
import { toast } from '@/components/ui/Toaster'
import { upsertQuiz } from '@/lib/actions/admin/courses'

type Choice = { id?: string; key: string; label: string; isCorrect: boolean }
type Question = { id?: string; key: string; question: string; explanation: string; isMultiple: boolean; choices: Choice[] }

export type QuizEditorInitial = {
  passPercent: number
  questions: { id: string; question: string; explanation: string | null; isMultiple: boolean; choices: { id: string; label: string; isCorrect: boolean }[] }[]
} | null

let seq = 0
const k = () => `k${++seq}`
const newChoice = (): Choice => ({ key: k(), label: '', isCorrect: false })
const newQuestion = (): Question => ({ key: k(), question: '', explanation: '', isMultiple: false, choices: [newChoice(), newChoice()] })

/** ADM-03: 小テスト編集（問題・選択肢・正解・解説・単一/複数・合格ライン） */
export function QuizEditor({ lessonId, initial }: { lessonId: string; initial: QuizEditorInitial }) {
  const [passPercent, setPassPercent] = useState(initial?.passPercent ?? 80)
  const [questions, setQuestions] = useState<Question[]>(() =>
    initial && initial.questions.length
      ? initial.questions.map((q) => ({
          id: q.id,
          key: k(),
          question: q.question,
          explanation: q.explanation ?? '',
          isMultiple: q.isMultiple,
          choices: q.choices.map((c) => ({ id: c.id, key: k(), label: c.label, isCorrect: c.isCorrect })),
        }))
      : [newQuestion()],
  )
  const [pending, start] = useTransition()

  const patchQ = (key: string, patch: Partial<Question>) => setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  const patchC = (qKey: string, cKey: string, patch: Partial<Choice>) =>
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== qKey) return q
        return {
          ...q,
          choices: q.choices.map((c) => {
            if (c.key !== cKey) return c
            const next = { ...c, ...patch }
            return next
          }),
        }
      }),
    )
  const setCorrect = (q: Question, cKey: string, on: boolean) => {
    if (q.isMultiple) return patchC(q.key, cKey, { isCorrect: on })
    // 単一選択: 1 つだけ正解
    patchQ(q.key, { choices: q.choices.map((c) => ({ ...c, isCorrect: c.key === cKey ? on : false })) })
  }

  const save = () =>
    start(async () => {
      const res = await upsertQuiz(lessonId, {
        passPercent,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          explanation: q.explanation || null,
          isMultiple: q.isMultiple,
          choices: q.choices.map((c) => ({ id: c.id, label: c.label, isCorrect: c.isCorrect })),
        })),
      })
      toast(res.ok ? '小テストを保存しました。' : res.error)
    })

  return (
    <div className="space-y-8">
      <Field label="合格ライン（%）" htmlFor="passPercent" hint="正答率がこの値以上で合格・レッスン完了になります。">
        <Input id="passPercent" type="number" min={1} max={100} value={passPercent} onChange={(e) => setPassPercent(Number(e.target.value))} className="w-32 tnum" />
      </Field>

      <ol className="space-y-6">
        {questions.map((q, qi) => (
          <li key={q.key} className="rounded border bg-paper-200 p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="ui-label tnum">問題 {qi + 1}</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-sans text-[12px] text-stone-500">
                  <Switch checked={q.isMultiple} onCheckedChange={(on) => patchQ(q.key, { isMultiple: on, choices: on ? q.choices : q.choices.map((c, i) => ({ ...c, isCorrect: c.isCorrect && q.choices.findIndex((x) => x.isCorrect) === i })) })} />
                  複数選択
                </label>
                <Button type="button" variant="ghost" size="icon" aria-label="問題を削除" disabled={questions.length <= 1} onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}>
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="問題文" htmlFor={`q-${q.key}`}>
                <Textarea id={`q-${q.key}`} value={q.question} onChange={(e) => patchQ(q.key, { question: e.target.value })} className="min-h-[80px]" />
              </Field>
              <div>
                <Label>選択肢（チェック = 正解）</Label>
                <ul className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <li key={c.key} className="flex items-center gap-3">
                      <Checkbox checked={c.isCorrect} onCheckedChange={(v) => setCorrect(q, c.key, v === true)} aria-label={`選択肢 ${ci + 1} を正解にする`} />
                      <Input value={c.label} placeholder={`選択肢 ${ci + 1}`} onChange={(e) => patchC(q.key, c.key, { label: e.target.value })} className="h-9" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="選択肢を削除"
                        disabled={q.choices.length <= 2}
                        onClick={() => patchQ(q.key, { choices: q.choices.filter((x) => x.key !== c.key) })}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={q.choices.length >= 10} onClick={() => patchQ(q.key, { choices: [...q.choices, newChoice()] })}>
                  <Plus /> 選択肢を追加
                </Button>
              </div>
              <Field label="解説（任意）" htmlFor={`e-${q.key}`}>
                <Textarea id={`e-${q.key}`} value={q.explanation} onChange={(e) => patchQ(q.key, { explanation: e.target.value })} className="min-h-[60px]" />
              </Field>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={questions.length >= 50} onClick={() => setQuestions((qs) => [...qs, newQuestion()])}>
          <Plus /> 問題を追加
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? '保存中…' : '小テストを保存'}
        </Button>
      </div>
    </div>
  )
}
