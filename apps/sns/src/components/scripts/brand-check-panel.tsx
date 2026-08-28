'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { brandCheckAction } from '@/features/scripts/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/format'

type Finding = { severity: string; excerpt: string; issue: string; suggestion: string }

export type BrandCheckData = {
  verdict: string
  findings: { summary?: string; items?: Finding[] }
  createdAt: string
} | null

const VERDICT = {
  SAFE: { tone: 'positive' as const, label: 'SAFE', description: 'ブランドルールに抵触する表現は見つかりませんでした。' },
  WARNING: { tone: 'warning' as const, label: 'WARNING', description: '修正を推奨する表現があります。' },
  REVIEW: { tone: 'danger' as const, label: 'REVIEW', description: '法務・専門部門での確認をおすすめします。' },
}

/**
 * Brand Guard によるチェック結果(要件46)。
 * 法的な可否は断定せず、「確認してください」という表現に留める。
 */
export function BrandCheckPanel({ scriptId, check }: { scriptId: string; check: BrandCheckData }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      const result = await brandCheckAction(scriptId)
      if (result.ok) {
        toast.success(`ブランドチェックが完了しました(${result.data.verdict})。`)
        router.refresh()
      } else {
        toast.error(result.message, result.hint ?? undefined)
      }
    })
  }

  const verdict = check ? (VERDICT[check.verdict as keyof typeof VERDICT] ?? VERDICT.WARNING) : null
  const items = check?.findings.items ?? []

  return (
    <Card>
      <CardHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="ブランドチェック"
        description="禁止ワード・誇大表現・ブランドルールとの整合を確認します。"
        action={
          <Button variant="secondary" size="sm" onClick={run} loading={pending}>
            {check ? '再チェック' : 'チェックする'}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {!check ? (
          <p className="text-[13px] text-ink-muted">
            公開前に、表現面の確認を行えます。設定 › ブランドで登録したルールが判定の基準になります。
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {verdict ? <Badge tone={verdict.tone}>{verdict.label}</Badge> : null}
              <p className="text-[13px] text-ink-muted">{check.findings.summary ?? verdict?.description}</p>
              <span className="ml-auto text-[11px] text-ink-subtle">{formatDateTime(check.createdAt)}</span>
            </div>

            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((finding, index) => (
                  <li
                    key={`${finding.issue}-${index}`}
                    className="rounded-[14px] border border-warning/30 bg-warning-wash px-4 py-3"
                  >
                    {finding.excerpt ? (
                      <p className="text-[12px] font-bold text-[#9a6511]">該当箇所: 「{finding.excerpt}」</p>
                    ) : null}
                    <p className="mt-1 text-[13px] leading-relaxed text-navy">{finding.issue}</p>
                    {finding.suggestion ? (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">代替案: {finding.suggestion}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-[11px] leading-relaxed text-ink-subtle">
              この判定はAIによる確認の補助です。法的な適合性の最終判断は、必ず貴社の担当部門で行ってください。
            </p>
          </>
        )}
      </CardBody>
    </Card>
  )
}
