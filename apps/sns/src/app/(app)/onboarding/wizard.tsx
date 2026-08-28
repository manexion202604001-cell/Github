'use client'

import { useActionState, useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, Check, Package, Target, Megaphone } from 'lucide-react'
import { completeOnboardingAction } from '@/features/brands/actions'
import { Card, CardBody } from '@/components/ui/card'
import { CheckChip, Field, Input, Textarea } from '@/components/ui/field'
import { TagInput } from '@/components/ui/tag-input'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { ACTIVE_CHANNELS } from '@/lib/config/channels'
import { SNS_GOALS } from '@/lib/config/taxonomy'
import type { ActionResult } from '@/lib/errors'
import { cn } from '@/lib/cn'

const STEPS = [
  { key: 'company', label: '企業情報', icon: Building2 },
  { key: 'product', label: '商品・サービス', icon: Package },
  { key: 'target', label: 'ターゲット', icon: Target },
  { key: 'goals', label: 'SNS運用目的', icon: Megaphone },
] as const

/**
 * 4ステップのオンボーディング(要件10)。
 * 途中のステップを切り替えても入力は失われないよう、全ステップを1つのフォームに保持し
 * 表示だけを切り替える。
 */
export function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [state, action] = useActionState<ActionResult | null, FormData>(completeOnboardingAction, null)
  const isLast = step === STEPS.length - 1

  return (
    <div>
      <div className="mb-8">
        <p className="text-[12px] font-bold tracking-[0.16em] text-brand">GETTING STARTED</p>
        <h1 className="display mt-2 text-[28px] text-navy sm:text-[32px]">まず、あなたの会社を教えてください。</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          ここで登録した情報は「ブランドカルテ」として保存され、以降すべてのAI処理へ自動的に渡されます。毎回同じ説明を入力する必要はありません。
        </p>
      </div>

      <ol className="mb-6 flex items-center gap-2" aria-label="設定ステップ">
        {STEPS.map((item, index) => {
          const Icon = item.icon
          const done = index < step
          const active = index === step
          return (
            <li key={item.key} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold transition-colors',
                  active && 'border-brand bg-brand text-white',
                  done && 'border-positive bg-positive-wash text-positive',
                  !active && !done && 'border-line bg-surface text-ink-subtle',
                )}
                aria-current={active ? 'step' : undefined}
                aria-label={`STEP ${index + 1} ${item.label}`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </button>
              <span className={cn('hidden truncate text-[12px] font-semibold sm:block', active ? 'text-navy' : 'text-ink-subtle')}>
                {item.label}
              </span>
              {index < STEPS.length - 1 ? <span className="h-px min-w-3 flex-1 bg-line" aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>

      {state && !state.ok ? <ErrorState className="mb-5" title={state.message} hint={state.hint} /> : null}

      <Card tone="raised">
        <CardBody className="sm:px-7 sm:py-7">
          <form action={action}>
            <div className={step === 0 ? 'space-y-4' : 'hidden'}>
              <StepHeading step={1} title="企業情報" description="会社そのものについて教えてください。" />
              <Field label="企業名" htmlFor="companyName" required>
                <Input id="companyName" name="companyName" required placeholder="株式会社サンプルクリーン" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Webサイト" htmlFor="companyWebsite">
                  <Input id="companyWebsite" name="companyWebsite" type="url" placeholder="https://example.co.jp" />
                </Field>
                <Field label="業種" htmlFor="companyIndustry">
                  <Input id="companyIndustry" name="companyIndustry" placeholder="エアコンクリーニング" />
                </Field>
              </div>
              <Field label="所在地域" htmlFor="companyRegion" hint="主な商圏。市場調査の対象地域の初期値になります。">
                <Input id="companyRegion" name="companyRegion" placeholder="東京都内" />
              </Field>
              <Field label="企業概要" htmlFor="companyDescription">
                <Textarea id="companyDescription" name="companyDescription" placeholder="どんな会社で、誰にどんな価値を提供しているか。" />
              </Field>
            </div>

            <div className={step === 1 ? 'space-y-4' : 'hidden'}>
              <StepHeading step={2} title="商品・サービス" description="SNSで伝えたい商品やサービスについて。" />
              <Field label="商品・サービス名" htmlFor="productName">
                <Input id="productName" name="productName" placeholder="エアコン内部クリーニング" />
              </Field>
              <Field label="商品概要" htmlFor="productDescription">
                <Textarea id="productDescription" name="productDescription" rows={3} />
              </Field>
              <Field label="価格帯" htmlFor="productPriceRange">
                <Input id="productPriceRange" name="productPriceRange" placeholder="12,000円〜20,000円" />
              </Field>
              <Field label="強み・特徴" hint="Enterで1つずつ追加できます。">
                <TagInput name="productStrengths" placeholder="例: 分解洗浄に対応" />
              </Field>
              <Field label="差別化ポイント" htmlFor="productDifferentiation">
                <Textarea id="productDifferentiation" name="productDifferentiation" rows={3} />
              </Field>
              <Field label="購入理由">
                <TagInput name="productPurchaseReasons" placeholder="例: 作業内容が明確だった" />
              </Field>
            </div>

            <div className={step === 2 ? 'space-y-4' : 'hidden'}>
              <StepHeading step={3} title="ターゲット" description="誰に届けたいか。自由入力でも構いません。" />
              <Field label="ターゲット概要" htmlFor="targetSummary">
                <Textarea id="targetSummary" name="targetSummary" rows={3} placeholder="東京都内在住の30〜50代ファミリー層。" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="年齢" htmlFor="targetAgeRange">
                  <Input id="targetAgeRange" name="targetAgeRange" placeholder="30〜50代" />
                </Field>
                <Field label="性別" htmlFor="targetGender">
                  <Input id="targetGender" name="targetGender" placeholder="指定なし" />
                </Field>
                <Field label="地域" htmlFor="targetRegion">
                  <Input id="targetRegion" name="targetRegion" placeholder="東京都" />
                </Field>
                <Field label="法人 / 個人" htmlFor="targetSegment">
                  <Input id="targetSegment" name="targetSegment" placeholder="個人" />
                </Field>
              </div>
              <Field label="職業" htmlFor="targetOccupation">
                <Input id="targetOccupation" name="targetOccupation" placeholder="会社員・共働き世帯" />
              </Field>
              <Field label="悩み">
                <TagInput name="targetProblems" placeholder="例: 掃除の効果が分からない" />
              </Field>
              <Field label="ニーズ">
                <TagInput name="targetNeeds" placeholder="例: 安心して任せたい" />
              </Field>
            </div>

            <div className={step === 3 ? 'space-y-5' : 'hidden'}>
              <StepHeading step={4} title="SNS運用目的" description="何のために発信するか。複数選択できます。" />
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-navy">運用目的</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SNS_GOALS.map((goal) => (
                    <CheckChip key={goal.key} name="goals" value={goal.key} label={goal.label} {...(goal.description ? { description: goal.description } : {})} />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-navy">運用するSNS</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACTIVE_CHANNELS.map((channel) => (
                    <CheckChip
                      key={channel.key}
                      name="channels"
                      value={channel.key}
                      label={channel.label}
                      description={`${channel.aspectRatio} / ${channel.durations[0]}〜${channel.durations[channel.durations.length - 1]}秒`}
                      defaultChecked={channel.key === 'instagram_reels'}
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button type="button" variant="secondary" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                戻る
              </Button>
              {isLast ? (
                <SubmitButton variant="gradient" size="lg">
                  設定を完了して市場調査へ
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </SubmitButton>
              ) : (
                <Button type="button" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}>
                  次へ
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

function StepHeading({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="mb-1">
      <p className="text-[11px] font-bold tracking-[0.14em] text-brand">STEP {step}</p>
      <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-navy">{title}</h2>
      <p className="mt-1 text-[13px] text-ink-muted">{description}</p>
    </div>
  )
}
