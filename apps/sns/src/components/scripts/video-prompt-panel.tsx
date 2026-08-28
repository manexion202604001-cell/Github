'use client'

import { useActionState, useEffect, useState } from 'react'
import { Film, Sparkles } from 'lucide-react'
import { generateVideoPromptsAction, updateVideoPromptAction } from '@/features/scripts/actions'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import { Field, Select, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorState, InlineNotice } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { PROMPT_LANGUAGES, VIDEO_PRESETS } from '@/lib/config/video-presets'
import type { ActionResult } from '@/lib/errors'

export type PromptData = {
  id: string
  sceneNumber: number
  preset: string
  language: string
  prompt: string
  negativePrompt: string | null
  explanationJa: string | null
}

/**
 * 動画生成AI用プロンプト(要件35〜39, 85)。
 * 動画は生成せず、外部の生成サービスへも接続しない。プロンプトを作るところまで。
 */
export function VideoPromptPanel({
  scriptId,
  prompts,
  sceneCount,
}: {
  scriptId: string
  prompts: PromptData[]
  sceneCount: number
}) {
  const toast = useToast()
  const [state, action, pending] = useActionState<ActionResult<{ count: number }> | null, FormData>(
    generateVideoPromptsAction,
    null,
  )
  const [preset, setPreset] = useState('generic')
  const [language, setLanguage] = useState<'en' | 'ja'>('en')

  useEffect(() => {
    if (state?.ok) toast.ai(`プロンプトを${state.data.count}件作成しました。`)
  }, [state, toast])

  const visible = prompts
    .filter((prompt) => prompt.preset === preset && prompt.language === language)
    .sort((a, b) => a.sceneNumber - b.sceneNumber)

  const allText = visible.map((prompt) => `# Scene ${prompt.sceneNumber}\n${prompt.prompt}`).join('\n\n')

  return (
    <Card id="prompts">
      <CardHeader
        icon={<Film className="h-4 w-4" />}
        title="動画生成AI用プロンプト"
        description="各シーンを、動画生成サービスへそのまま貼り付けられる形にします。"
        action={visible.length > 0 ? <CopyButton value={allText} label="全文コピー" /> : null}
      />
      <CardBody className="space-y-5">
        <InlineNotice tone="info" title="このサービスは動画を生成しません。">
          外部の動画生成APIとは通信せず、各サービス向けの「書き方」に合わせたプロンプトを作成するところまでを行います。
        </InlineNotice>

        {state && !state.ok ? <ErrorState title={state.message} hint={state.hint} /> : null}

        <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="scriptId" value={scriptId} />

          <Field label="プリセット" htmlFor="preset" hint={VIDEO_PRESETS.find((item) => item.key === preset)?.description}>
            <Select id="preset" name="preset" value={preset} onChange={(event) => setPreset(event.target.value)}>
              {VIDEO_PRESETS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="言語" htmlFor="language" hint="生成AIへの入力は英語を推奨します。">
            <Select
              id="language"
              name="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as 'en' | 'ja')}
            >
              {PROMPT_LANGUAGES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          <SubmitButton variant="gradient">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {visible.length > 0 ? '再生成' : 'プロンプトを作る'}
          </SubmitButton>
        </form>

        {pending ? <p className="text-[13px] font-semibold text-brand">シーンごとのプロンプトを作成しています…</p> : null}

        {visible.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-muted">
            このプリセット・言語のプロンプトはまだありません。
            <br />
            {sceneCount}シーン分をまとめて作成できます。
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((prompt) => (
              <PromptCard key={prompt.id} scriptId={scriptId} prompt={prompt} />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

function PromptCard({ scriptId, prompt }: { scriptId: string; prompt: PromptData }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [state, action] = useActionState<ActionResult | null, FormData>(updateVideoPromptAction, null)

  useEffect(() => {
    if (state?.ok) {
      toast.success('プロンプトを保存しました。')
      setEditing(false)
    }
  }, [state, toast])

  return (
    <li className="rounded-[16px] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Badge tone="navy">Scene {prompt.sceneNumber}</Badge>
          <Badge tone="neutral">{prompt.preset.toUpperCase()}</Badge>
          <Badge tone="cyan">{prompt.language === 'en' ? 'English' : '日本語'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={prompt.prompt} />
          <Button variant="ghost" size="sm" onClick={() => setEditing((value) => !value)}>
            {editing ? '閉じる' : '編集'}
          </Button>
        </div>
      </div>

      {editing ? (
        <form action={action} className="space-y-3 px-4 py-3">
          <input type="hidden" name="scriptId" value={scriptId} />
          <input type="hidden" name="promptId" value={prompt.id} />
          <Field label="プロンプト" htmlFor={`prompt-${prompt.id}`}>
            <Textarea id={`prompt-${prompt.id}`} name="prompt" defaultValue={prompt.prompt} rows={10} className="font-mono text-[12px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
              キャンセル
            </Button>
            <SubmitButton size="sm">保存する</SubmitButton>
          </div>
        </form>
      ) : (
        <div className="px-4 py-3">
          <pre className="scroll-x whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-navy">
            {prompt.prompt}
          </pre>
          {prompt.negativePrompt ? (
            <p className="mt-3 rounded-[10px] bg-canvas-alt px-3 py-2 font-mono text-[11px] text-ink-muted">
              Negative: {prompt.negativePrompt}
            </p>
          ) : null}
          {prompt.explanationJa ? <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{prompt.explanationJa}</p> : null}
        </div>
      )}
    </li>
  )
}
