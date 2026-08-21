'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Notice } from '@/components/ui/feedback'

type Idea = { type: string; name: string; reason: string }

/**
 * 次の商品提案(要件76)。ワンクリックで新しい商品プロジェクトを開始し、
 * 「販売データ → 次の商品開発」のループ(要件127)を回す。
 */
export function NextProductIdeas({ ideas }: { ideas: Idea[] }) {
  const router = useRouter()
  const [busyName, setBusyName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (ideas.length === 0) return null

  const createProject = async (idea: Idea) => {
    setBusyName(idea.name)
    setError(null)
    try {
      const project = await api<{ id: string }>('/api/projects', {
        method: 'POST',
        body: {
          name: idea.name,
          description: `${idea.type}として提案: ${idea.reason}`,
          idea: `${idea.name}(${idea.type})を作りたい。背景: ${idea.reason}`,
        },
      })
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プロジェクトの作成に失敗しました')
      setBusyName(null)
    }
  }

  return (
    <Card>
      <CardHeader
        title="次の商品提案"
        description="このプロジェクトのデータから、次に開発すべき商品をAIが提案しています。ボタン1つで新しいプロジェクトとして開始できます。"
      />
      <CardBody className="space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {ideas.map((idea) => (
          <div
            key={idea.name}
            className="flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-bold">
                {idea.name}
                <Badge tone="brand" className="ml-2">
                  {idea.type}
                </Badge>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{idea.reason}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={busyName === idea.name}
              onClick={() => void createProject(idea)}
            >
              この案でプロジェクト作成
            </Button>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}
