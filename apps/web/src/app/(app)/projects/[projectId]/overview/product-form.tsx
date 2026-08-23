'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/hooks/api'
import { useJob } from '@/hooks/use-job'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Notice, Progress } from '@/components/ui/feedback'
import { formatPercent } from '@/lib/format'
import { ComparePanel, type CompareResult } from './compare-panel'

type Question = { field: string; question: string; why: string; examples: string[] }

type ProductInitial = {
  name: string
  category: string | null
  description: string | null
  purpose: string | null
  problem: string | null
  target: string | null
  price: number | null
  country: string | null
  channel: string | null
  size: string | null
  weight: string | null
  material: string | null
  color: string | null
  designNote: string | null
  features: string[]
  usp: string[]
  notes: string | null
  rawInput: string | null
  completeness: number
  openQuestions: Question[]
}

export function ProductOverviewForm({ projectId, initial }: { projectId: string; initial: ProductInitial }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  /**
   * ヒアリング完了後にDBの最新値をフォームへ反映する。
   * router.refresh() はサーバーコンポーネントを再描画するだけで
   * マウント済みのuseStateには届かないため、明示的に取得して流し込む。
   * ユーザーが未保存で入力済みの値は上書きしない(サーバー側のマージと同じ方針)。
   */
  const applyInterviewResult = async () => {
    try {
      const fresh = await api<ProductInitial>(`/api/products/${projectId}`)
      setForm((previous) => ({
        ...previous,
        name: previous.name || fresh.name,
        category: previous.category || fresh.category,
        description: previous.description || fresh.description,
        purpose: previous.purpose || fresh.purpose,
        problem: previous.problem || fresh.problem,
        target: previous.target || fresh.target,
        price: previous.price ?? fresh.price,
        country: previous.country || fresh.country,
        channel: previous.channel || fresh.channel,
        size: previous.size || fresh.size,
        weight: previous.weight || fresh.weight,
        material: previous.material || fresh.material,
        color: previous.color || fresh.color,
        designNote: previous.designNote || fresh.designNote,
        features: previous.features.length > 0 ? previous.features : fresh.features,
        usp: previous.usp.length > 0 ? previous.usp : fresh.usp,
        completeness: fresh.completeness,
        openQuestions: fresh.openQuestions,
      }))
      setMessage({ tone: 'success', text: 'AIヒアリングが完了しました。空欄だった項目にAIの提案を反映しました。下のフォームで内容を確認・修正できます。' })
    } catch {
      setMessage({ tone: 'success', text: 'AIヒアリングが完了しました。ページを再読み込みすると内容が表示されます。' })
    }
    router.refresh()
  }

  const interview = useJob((job) => {
    if (job.status === 'COMPLETED') {
      void applyInterviewResult()
    } else if (job.status === 'FAILED') {
      setMessage({ tone: 'error', text: job.error ?? 'AIヒアリングに失敗しました' })
    }
  })

  // AI比較評価: 右パネルに「あなたの入力 vs AI独自案」を表示する
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const compare = useJob((job) => {
    if (job.status === 'COMPLETED') {
      setCompareResult(job.result as CompareResult)
    } else if (job.status === 'FAILED') {
      setCompareError(job.error ?? '比較評価に失敗しました')
    }
  })

  const startCompare = async () => {
    setCompareOpen(true)
    setCompareResult(null)
    setCompareError(null)
    try {
      const result = await api<{ jobId: string }>(`/api/products/${projectId}/compare`, { method: 'POST' })
      compare.track(result.jobId)
    } catch (error) {
      setCompareError(error instanceof Error ? error.message : '比較評価を開始できませんでした')
    }
  }

  /** パネルの「AIの案を採用」→ フォームの該当項目へ反映する(保存はユーザー操作)。 */
  const adoptProposal = (key: string, proposal: string) => {
    if (key === 'price') {
      const digits = proposal.replace(/[^0-9]/g, '')
      set('price', digits === '' ? null : Number(digits))
    } else if (key === 'features' || key === 'usp') {
      set(
        key,
        proposal
          .split(/[・\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
      )
    } else if (
      key === 'name' ||
      key === 'category' ||
      key === 'description' ||
      key === 'purpose' ||
      key === 'problem' ||
      key === 'target' ||
      key === 'channel'
    ) {
      set(key, proposal)
    }
  }

  const set = <K extends keyof ProductInitial>(key: K, value: ProductInitial[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api(`/api/products/${projectId}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          category: form.category ?? '',
          description: form.description ?? '',
          purpose: form.purpose ?? '',
          problem: form.problem ?? '',
          target: form.target ?? '',
          price: form.price,
          country: form.country ?? '',
          channel: form.channel ?? '',
          size: form.size ?? '',
          weight: form.weight ?? '',
          material: form.material ?? '',
          color: form.color ?? '',
          designNote: form.designNote ?? '',
          features: form.features,
          usp: form.usp,
          notes: form.notes ?? '',
        },
      })
      setMessage({ tone: 'success', text: '保存しました。' })
      router.refresh()
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : '保存に失敗しました' })
    } finally {
      setSaving(false)
    }
  }

  const startInterview = async () => {
    setMessage(null)
    const payload = Object.entries(answers)
      .filter(([, answer]) => answer.trim() !== '')
      .map(([question, answer]) => ({ question, answer }))
    try {
      const result = await api<{ jobId: string }>(`/api/products/${projectId}/interview`, {
        method: 'POST',
        body: { answers: payload, rawInput: form.rawInput ?? undefined },
      })
      setAnswers({})
      interview.track(result.jobId)
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'AIヒアリングを開始できませんでした' })
    }
  }

  return (
    <div className="space-y-5">
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <Card>
        <CardHeader
          title="AIヒアリング"
          description="自然な文章のアイデアから商品概要を構造化し、不足している情報をAIが質問します。"
          action={
            <Button onClick={() => void startInterview()} loading={interview.running} variant="secondary">
              AIに整理してもらう
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <Field label="商品アイデア(自由入力)">
            <Textarea
              value={form.rawInput ?? ''}
              onChange={(event) => set('rawInput', event.target.value)}
              rows={3}
              placeholder="旅行先でも使えるコンパクトな衣類スチーマーを作りたい"
            />
          </Field>

          {interview.running && interview.job ? <Progress value={interview.job.progress} showValue /> : null}

          {form.openQuestions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[13px] font-bold text-ink">AIからの質問({form.openQuestions.length}件)</p>
              {form.openQuestions.map((question) => (
                <div key={question.question} className=" border border-line bg-canvas p-4">
                  <p className="text-[13px] font-semibold">{question.question}</p>
                  <p className="mt-1 text-[12px] text-ink-subtle">{question.why}</p>
                  <Input
                    className="mt-2.5"
                    value={answers[question.question] ?? ''}
                    onChange={(event) =>
                      setAnswers((previous) => ({ ...previous, [question.question]: event.target.value }))
                    }
                    placeholder={question.examples[0] ? `例: ${question.examples[0]}` : '回答を入力'}
                  />
                </div>
              ))}
              <p className="text-[12px] text-ink-subtle">
                回答を入力して「AIに整理してもらう」を押すと、回答が商品情報へ反映されます。
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="商品概要"
          description={`入力充足度 ${formatPercent(form.completeness, 0)} — market調査に進む前に主要項目を埋めましょう。`}
          action={
            <Button variant="secondary" onClick={() => void startCompare()} loading={compare.running}>
              AIの案と比較評価
            </Button>
          }
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="商品名" required className="sm:col-span-2">
            <Input value={form.name} onChange={(event) => set('name', event.target.value)} maxLength={120} />
          </Field>
          <Field label="商品カテゴリ">
            <Input value={form.category ?? ''} onChange={(event) => set('category', event.target.value)} placeholder="衣類スチーマー" />
          </Field>
          <Field label="想定価格(円)">
            <Input
              type="number"
              min={0}
              value={form.price ?? ''}
              onChange={(event) => set('price', event.target.value === '' ? null : Number(event.target.value))}
              placeholder="5980"
            />
          </Field>
          <Field label="商品概要" className="sm:col-span-2">
            <Textarea value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} rows={3} />
          </Field>
          <Field label="商品の目的">
            <Textarea value={form.purpose ?? ''} onChange={(event) => set('purpose', event.target.value)} rows={2} />
          </Field>
          <Field label="解決する課題">
            <Textarea value={form.problem ?? ''} onChange={(event) => set('problem', event.target.value)} rows={2} />
          </Field>
          <Field label="想定ユーザー">
            <Input value={form.target ?? ''} onChange={(event) => set('target', event.target.value)} placeholder="20〜40代の一人暮らし" />
          </Field>
          <Field label="販売チャネル">
            <Input value={form.channel ?? ''} onChange={(event) => set('channel', event.target.value)} placeholder="Amazon.co.jp" />
          </Field>
          <Field label="想定販売国">
            <Input value={form.country ?? ''} onChange={(event) => set('country', event.target.value)} placeholder="日本" />
          </Field>
          <Field label="カラー">
            <Input value={form.color ?? ''} onChange={(event) => set('color', event.target.value)} placeholder="オフホワイト / グレー" />
          </Field>
          <Field label="サイズ">
            <Input value={form.size ?? ''} onChange={(event) => set('size', event.target.value)} placeholder="W180 × D120 × H240 mm" />
          </Field>
          <Field label="重量">
            <Input value={form.weight ?? ''} onChange={(event) => set('weight', event.target.value)} placeholder="約1.2kg" />
          </Field>
          <Field label="素材">
            <Input value={form.material ?? ''} onChange={(event) => set('material', event.target.value)} placeholder="ABS樹脂" />
          </Field>
          <Field label="デザインの要望">
            <Input value={form.designNote ?? ''} onChange={(event) => set('designNote', event.target.value)} />
          </Field>
          <Field label="主要機能" hint="改行区切りで入力" className="sm:col-span-2">
            <Textarea
              value={form.features.join('\n')}
              onChange={(event) => set('features', event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
              rows={3}
              placeholder={'折りたたみ収納\n静音モード'}
            />
          </Field>
          <Field label="差別化案" hint="改行区切りで入力" className="sm:col-span-2">
            <Textarea
              value={form.usp.join('\n')}
              onChange={(event) => set('usp', event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
              rows={2}
            />
          </Field>
          <Field label="その他要望" className="sm:col-span-2">
            <Textarea value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} rows={2} />
          </Field>
        </CardBody>
        <CardFooter className="flex justify-end">
          <Button onClick={() => void save()} loading={saving}>
            保存する
          </Button>
        </CardFooter>
      </Card>

      <ComparePanel
        open={compareOpen}
        running={compare.running}
        progress={compare.job?.progress ?? 0}
        error={compareError}
        result={compareResult}
        onClose={() => setCompareOpen(false)}
        onAdopt={adoptProposal}
      />
    </div>
  )
}
