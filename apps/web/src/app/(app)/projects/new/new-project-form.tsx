'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Notice } from '@/components/ui/feedback'
import { Card, CardBody } from '@/components/ui/card'

const EXAMPLES = [
  '旅行先でも使えるコンパクトな衣類スチーマーを作りたい',
  '一人暮らし向けの折りたたみ衣類乾燥機。収納しやすさを最優先にしたい',
  'デスクに置ける小型の空気清浄機。想定価格は6,000円前後、Amazonで販売',
]

export function NewProjectForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [idea, setIdea] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setLoading(true)
    try {
      const project = await api<{ id: string }>('/api/projects', {
        method: 'POST',
        body: { name: form.get('name'), idea: idea || undefined },
      })
      router.push(`/projects/${project.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardBody>
        {error ? (
          <div className="mb-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="プロジェクト名" required hint="例: 折りたたみ衣類乾燥機">
            <Input name="name" required maxLength={120} placeholder="商品の呼び名を入力" />
          </Field>
          <Field label="作りたい商品のイメージ" hint="自然な文章でOKです。AIがここから商品概要を構造化します。">
            <Textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="例: 旅行先でも使えるコンパクトな衣類スチーマーを作りたい"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setIdea(example)}
                className="rounded-full border border-line bg-canvas px-3 py-1 text-[12px] text-ink-muted transition-colors hover:border-brand hover:text-brand"
              >
                {example.slice(0, 24)}…
              </button>
            ))}
          </div>
          <Button type="submit" loading={loading} className="w-full">
            プロジェクトを作成する
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
