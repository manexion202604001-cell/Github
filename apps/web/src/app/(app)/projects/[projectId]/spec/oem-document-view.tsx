'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'

type DocumentView = {
  id: string
  title: string
  kind: string
  version: number
  content: unknown
  createdAt: string
}

type DocumentContent = {
  productOverview?: string
  targetCostNote?: string
  moq?: number | null
  desiredLeadTime?: string | null
  sections?: { heading: string; items: { label: string; value: string }[] }[]
  improvementPoints?: string[]
  questionsForSupplier?: string[]
}

/** OEM仕様書の閲覧。window.print で印刷/PDF保存できる(要件45)。 */
export function OEMDocumentView({ documents }: { documents: DocumentView[] }) {
  const [activeId, setActiveId] = useState(documents[0]?.id)
  const active = documents.find((document) => document.id === activeId)
  if (!active) return null
  const content = (active.content ?? {}) as DocumentContent

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {documents.map((document) => (
          <button
            key={document.id}
            type="button"
            onClick={() => setActiveId(document.id)}
            className={
              document.id === activeId
                ? ' bg-brand px-3.5 py-1 text-[12px] font-bold text-white'
                : ' border border-line px-3.5 py-1 text-[12px] font-semibold text-ink-muted hover:border-brand hover:text-brand'
            }
          >
            {document.kind === 'REVISION_REQUEST' ? '修正依頼' : '仕様書'} v{document.version}
          </button>
        ))}
        <span className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          印刷 / PDF保存
        </Button>
      </div>

      <article className="print-target border border-line bg-surface p-8">
        <header className="border-b border-line pb-4">
          <h2 className="text-lg font-bold">{active.title}</h2>
          <p className="mt-1 text-[12px] text-ink-subtle">作成日: {formatDate(active.createdAt)}</p>
        </header>

        {content.productOverview ? <p className="mt-4 text-[13px] leading-7">{content.productOverview}</p> : null}
        {content.targetCostNote ? (
          <p className="mt-3 bg-canvas px-4 py-2.5 text-[13px] font-semibold">{content.targetCostNote}</p>
        ) : null}
        <div className="mt-3 flex gap-6 text-[13px]">
          {content.moq ? <p>MOQ: <strong>{content.moq.toLocaleString('ja-JP')}個</strong></p> : null}
          {content.desiredLeadTime ? <p>希望納期: <strong>{content.desiredLeadTime}</strong></p> : null}
        </div>

        {(content.sections ?? []).map((section) => (
          <section key={section.heading} className="mt-6">
            <h3 className="border-l-4 border-brand pl-3 text-[14px] font-bold">{section.heading}</h3>
            <table className="mt-2 w-full border-collapse text-[13px]">
              <tbody>
                {section.items.map((item) => (
                  <tr key={item.label} className="border-b border-line/70">
                    <th className="w-40 py-2 pr-4 text-left align-top font-semibold text-ink-muted">{item.label}</th>
                    <td className="py-2 leading-relaxed">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {content.improvementPoints?.length ? (
          <section className="mt-6">
            <h3 className="border-l-4 border-brand pl-3 text-[14px] font-bold">改善ポイント</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-[13px]">
              {content.improvementPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.questionsForSupplier?.length ? (
          <section className="mt-6">
            <h3 className="border-l-4 border-brand pl-3 text-[14px] font-bold">貴社への確認事項</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-6 text-[13px]">
              {content.questionsForSupplier.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </div>
  )
}
