'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { createResearchAction, type CacheHit } from '@/features/research/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, RadioChip, Select, Textarea } from '@/components/ui/field'
import { TagInput } from '@/components/ui/tag-input'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { ErrorState, InlineNotice } from '@/components/ui/error-state'
import { ACTIVE_CHANNELS, DEFAULT_CHANNEL } from '@/lib/config/channels'
import { RESEARCH_DEPTHS, RESEARCH_OBJECTIVES } from '@/lib/config/taxonomy'
import { formatDate } from '@/lib/format'
import type { ActionResult } from '@/lib/errors'

/**
 * 市場調査の入力(要件14)。
 * 実行前に「直近7日以内の同条件の調査」を確認し、無駄な再調査を防ぐ(要件69)。
 */
export function ResearchForm({
  brands,
  defaultBrandId,
  defaultRegion,
  defaultKeywords,
  defaultChannel,
  defaultTitle,
}: {
  brands: { id: string; name: string }[]
  defaultBrandId: string
  defaultRegion: string
  defaultKeywords: string[]
  defaultChannel: string | null
  defaultTitle: string
}) {
  const [state, submit] = useActionState<ActionResult<{ cacheHit: CacheHit } | null> | null, FormData>(
    createResearchAction,
    null,
  )
  // 同条件の調査が見つかったときだけ、再調査の意思確認を挟む(要件69)。
  // 再調査は submitter の name/value で force=1 を送るため、追加の状態を持たない。
  const cacheHit = state?.ok ? (state.data?.cacheHit ?? null) : null

  return (
    <form action={submit} className="mt-8 space-y-6">
      {state && !state.ok ? <ErrorState title={state.message} hint={state.hint} /> : null}

      {cacheHit ? (
        <InlineNotice tone="warning" title={`${formatDate(cacheHit.createdAt)}に同様の調査があります。`}>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/research/${cacheHit.id}`}
              className="inline-flex h-9 items-center rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold text-navy hover:bg-canvas-alt"
            >
              過去結果を見る
            </Link>
            <Button type="submit" name="force" value="1" size="sm" className="h-9">
              最新情報で再調査する
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      <Card>
        <CardHeader title="調査の対象" description="どのブランドの、どのSNSに向けた調査かを決めます。" />
        <CardBody className="space-y-4">
          <Field label="調査タイトル" htmlFor="title" required>
            <Input id="title" name="title" required defaultValue={defaultTitle} placeholder="例: 美容業界SNSトレンド調査" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ブランド" htmlFor="brandId" required>
              <Select id="brandId" name="brandId" defaultValue={defaultBrandId} required>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="SNS" htmlFor="channel" required>
              <Select id="channel" name="channel" defaultValue={defaultChannel ?? DEFAULT_CHANNEL} required>
                {ACTIVE_CHANNELS.map((channel) => (
                  <option key={channel.key} value={channel.key}>
                    {channel.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="調査対象地域" htmlFor="region" required hint="例: 日本 / 東京 / 関東 / 全国">
            <Input id="region" name="region" required defaultValue={defaultRegion} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="調査の目的" description="目的によって、集める情報と分析の観点が変わります。" />
        <CardBody>
          <fieldset>
            <legend className="sr-only">調査目的</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {RESEARCH_OBJECTIVES.map((objective, index) => (
                <RadioChip
                  key={objective.key}
                  name="objective"
                  value={objective.key}
                  label={objective.label}
                  {...(objective.description ? { description: objective.description } : {})}
                  defaultChecked={index === 1}
                />
              ))}
            </div>
          </fieldset>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="調べたいこと" description="キーワードや競合URLがあれば精度が上がります。未入力でも実行できます。" />
        <CardBody className="space-y-4">
          <Field label="キーワード" hint="Enterで1つずつ追加できます。">
            <TagInput name="keywords" defaultValue={defaultKeywords} placeholder="例: エアコンクリーニング" />
          </Field>
          <Field label="競合URL" hint="http/httpsの公開URLのみ。最大10件。">
            <TagInput name="competitorUrls" placeholder="https://example.co.jp" max={10} />
          </Field>
          <Field label="自由入力" htmlFor="freeText" hint="ふだんの言葉で構いません。プロンプトを書く必要はありません。">
            <Textarea
              id="freeText"
              name="freeText"
              rows={3}
              placeholder="例: 20〜30代女性向け美容サロンについて調査したい"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="調査深度" description="深いほど検索クエリとインサイトが増え、時間がかかります。" />
        <CardBody>
          <fieldset>
            <legend className="sr-only">調査深度</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {RESEARCH_DEPTHS.map((depth) => (
                <RadioChip
                  key={depth.key}
                  name="depth"
                  value={depth.key}
                  label={depth.label}
                  description={`${depth.description}(検索 約${depth.queries}件)`}
                  defaultChecked={depth.key === 'STANDARD'}
                />
              ))}
            </div>
          </fieldset>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-muted">実行すると、AIが検索計画を立ててWeb検索を行います。</p>
        <SubmitButton variant="gradient" size="lg">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          調査を開始する
        </SubmitButton>
      </div>
    </form>
  )
}
