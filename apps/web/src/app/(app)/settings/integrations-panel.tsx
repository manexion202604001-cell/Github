'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { Notice } from '@/components/ui/feedback'
import { INTEGRATION_OPTIONS } from '@/features/integrations/schema'

type Row = {
  id: string
  kind: string
  provider: string
  enabled: boolean
  hasSecret: boolean
  model: string | null
  updatedAt: string
}

export function IntegrationsPanel({ initial, canManage }: { initial: Row[]; canManage: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [savingKind, setSavingKind] = useState<string | null>(null)

  const save = async (kind: string, provider: string, secret: string, model: string) => {
    if (!secret.trim()) {
      setError('APIキーを入力してください')
      return
    }
    setError(null)
    setSavingKind(kind)
    try {
      await api('/api/integrations', {
        method: 'POST',
        body: { kind, provider, secret: secret.trim(), model: model.trim() || undefined },
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSavingKind(null)
    }
  }

  const remove = async (id: string) => {
    setError(null)
    try {
      await api(`/api/integrations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <Card>
      <CardHeader
        title="AI・データ連携(APIキー)"
        description="キーは暗号化して保存され、サーバー側でのみ使用されます。未設定の項目はサンプルデータで動作します。"
      />
      <CardBody className="space-y-6">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {!canManage ? (
          <Notice tone="info">APIキーの変更には Admin 以上の権限が必要です。</Notice>
        ) : null}
        {INTEGRATION_OPTIONS.map((option) => {
          const active = initial.find((row) => row.kind === option.kind && row.enabled)
          return (
            <IntegrationForm
              key={option.kind}
              option={option}
              active={active ?? null}
              disabled={!canManage}
              saving={savingKind === option.kind}
              onSave={save}
              onRemove={remove}
            />
          )
        })}
      </CardBody>
    </Card>
  )
}

function IntegrationForm({
  option,
  active,
  disabled,
  saving,
  onSave,
  onRemove,
}: {
  option: (typeof INTEGRATION_OPTIONS)[number]
  active: Row | null
  disabled: boolean
  saving: boolean
  onSave: (kind: string, provider: string, secret: string, model: string) => void
  onRemove: (id: string) => void
}) {
  const [provider, setProvider] = useState(active?.provider ?? option.providers[0]?.id ?? '')
  const [secret, setSecret] = useState('')
  const [model, setModel] = useState(active?.model ?? '')
  const selected = option.providers.find((entry) => entry.id === provider)

  return (
    <div className="border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-bold">
            {option.label}
            {active ? (
              <Badge tone="positive" className="ml-2">
                設定済み: {option.providers.find((entry) => entry.id === active.provider)?.label ?? active.provider}
              </Badge>
            ) : (
              <Badge tone="caution" className="ml-2">
                未設定(サンプル動作)
              </Badge>
            )}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">{option.description}</p>
        </div>
        {active && !disabled ? (
          <Button variant="ghost" size="sm" onClick={() => onRemove(active.id)}>
            設定を削除
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
        <Field label="Provider">
          <Select value={provider} onChange={(event) => setProvider(event.target.value)} disabled={disabled}>
            {option.providers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={selected?.secretLabel ?? 'APIキー'}>
          <Input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder={active ? '(変更する場合のみ入力)' : ''}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        <div className="flex items-end">
          <Button onClick={() => onSave(option.kind, provider, secret, model)} loading={saving} disabled={disabled}>
            保存
          </Button>
        </div>
      </div>
      {option.hasModel ? (
        <div className="mt-3 max-w-xs">
          <Field label="モデル(任意)" hint="空欄なら推奨モデルを使用">
            <Input value={model} onChange={(event) => setModel(event.target.value)} disabled={disabled} />
          </Field>
        </div>
      ) : null}
    </div>
  )
}
