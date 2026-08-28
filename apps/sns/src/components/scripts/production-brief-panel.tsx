'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { generateBriefAction } from '@/features/scripts/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PrintButton } from '@/components/ui/print-button'
import { useToast } from '@/components/ui/toast'

type ShotListItem = { sceneNumber: number; shot: string; shotSize: string; movement: string; note: string }

export type BriefData = {
  cast: string[]
  locations: string[]
  equipment: string[]
  assets: string[]
  shotList: unknown
  shootOrder: string[]
  cautions: string[]
  captions: string[]
  brollIdeas: string[]
} | null

/** 撮影指示書(要件34)。印刷して現場で使える形にする。 */
export function ProductionBriefPanel({ scriptId, brief }: { scriptId: string; brief: BriefData }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()

  function generate() {
    startTransition(async () => {
      const result = await generateBriefAction(scriptId)
      if (result.ok) {
        toast.ai('撮影指示書を作成しました。')
        router.refresh()
      } else {
        toast.error(result.message, result.hint ?? undefined)
      }
    })
  }

  const shotList = Array.isArray(brief?.shotList) ? (brief.shotList as ShotListItem[]) : []

  return (
    <Card>
      <CardHeader
        icon={<ClipboardList className="h-4 w-4" />}
        title="撮影指示書"
        description="台本から、撮影当日にそのまま使える指示へ変換します。"
        action={
          <div className="flex gap-2">
            {brief ? <PrintButton label="印刷" /> : null}
            <Button variant="secondary" size="sm" onClick={generate} loading={pending}>
              {brief ? '作り直す' : '指示書を作る'}
            </Button>
          </div>
        }
      />
      <CardBody>
        {!brief ? (
          <p className="text-[13px] text-ink-muted">
            まだ撮影指示書がありません。必要な出演者・場所・機材・素材・撮影順・注意点を自動でまとめます。
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BriefList label="必要出演者" values={brief.cast} />
              <BriefList label="撮影場所" values={brief.locations} />
              <BriefList label="必要機材" values={brief.equipment} />
              <BriefList label="必要素材" values={brief.assets} />
            </div>

            {shotList.length > 0 ? (
              <div>
                <p className="text-[12px] font-bold tracking-wide text-ink-subtle">撮影カット一覧</p>
                <div className="scroll-x mt-2">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line text-[11px] font-bold tracking-wide text-ink-subtle">
                        <th className="py-2 pr-3">SCENE</th>
                        <th className="py-2 pr-3">カット</th>
                        <th className="py-2 pr-3">サイズ</th>
                        <th className="py-2 pr-3">動き</th>
                        <th className="py-2">メモ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shotList.map((shot, index) => (
                        <tr key={`${shot.sceneNumber}-${index}`} className="border-b border-line/70 align-top text-[13px]">
                          <td className="tabular py-2.5 pr-3 text-ink-muted">{shot.sceneNumber}</td>
                          <td className="py-2.5 pr-3 text-navy">{shot.shot}</td>
                          <td className="py-2.5 pr-3 text-ink-muted">{shot.shotSize || '—'}</td>
                          <td className="py-2.5 pr-3 text-ink-muted">{shot.movement || '—'}</td>
                          <td className="py-2.5 text-ink-muted">{shot.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <BriefList label="撮影順" values={brief.shootOrder} ordered />
              <BriefList label="注意点" values={brief.cautions} tone="warning" />
              <BriefList label="テロップ" values={brief.captions} />
              <BriefList label="B-roll候補" values={brief.brollIdeas} />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function BriefList({
  label,
  values,
  ordered = false,
  tone = 'default',
}: {
  label: string
  values: string[]
  ordered?: boolean
  tone?: 'default' | 'warning'
}) {
  if (values.length === 0) return null
  const ListTag = ordered ? 'ol' : 'ul'
  return (
    <div className="print-block">
      <p className="text-[12px] font-bold tracking-wide text-ink-subtle">{label}</p>
      <ListTag className={ordered ? 'mt-2 list-inside list-decimal space-y-1' : 'mt-2 space-y-1'}>
        {values.map((value, index) => (
          <li
            key={`${value}-${index}`}
            className={
              tone === 'warning'
                ? 'rounded-[8px] bg-warning-wash px-2.5 py-1.5 text-[13px] leading-relaxed text-[#9a6511]'
                : 'text-[13px] leading-relaxed text-navy'
            }
          >
            {ordered ? value : `・${value}`}
          </li>
        ))}
      </ListTag>
    </div>
  )
}
