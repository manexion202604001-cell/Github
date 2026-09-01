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
  applicationId: string | null
  updatedAt: string
}

export function IntegrationsPanel({ initial, canManage }: { initial: Row[]; canManage: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [savingKind, setSavingKind] = useState<string | null>(null)

  const save = async (kind: string, provider: string, secret: string, model: string, applicationId: string) => {
    setError(null)
    setSavingKind(kind)
    try {
      await api('/api/integrations', {
        method: 'POST',
        body: {
          kind,
          provider,
          secret: secret.trim() || undefined,
          model: model.trim() || undefined,
          applicationId: applicationId.trim() || undefined,
        },
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
          const actives = initial.filter((row) => row.kind === option.kind && row.enabled)
          return (
            <IntegrationForm
              key={option.kind}
              option={option}
              actives={actives}
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
  actives,
  disabled,
  saving,
  onSave,
  onRemove,
}: {
  option: (typeof INTEGRATION_OPTIONS)[number]
  actives: Row[]
  disabled: boolean
  saving: boolean
  onSave: (kind: string, provider: string, secret: string, model: string, applicationId: string) => void
  onRemove: (id: string) => void
}) {
  const [provider, setProvider] = useState(actives[0]?.provider ?? option.providers[0]?.id ?? '')
  const [secret, setSecret] = useState('')
  const [model, setModel] = useState(actives[0]?.model ?? '')
  const selected = option.providers.find((entry) => entry.id === provider)
  const selectedActive = actives.find((row) => row.provider === provider)
  const extraField = selected && 'extraField' in selected ? selected.extraField : undefined
  const [applicationId, setApplicationId] = useState(actives.find((row) => row.applicationId)?.applicationId ?? '')

  return (
    <div className="border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-bold">
            {option.label}
            {actives.length > 0 ? (
              actives.map((row) => (
                <Badge key={row.id} tone="positive" className="ml-2">
                  設定済み: {option.providers.find((entry) => entry.id === row.provider)?.label ?? row.provider}
                </Badge>
              ))
            ) : (
              <Badge tone="caution" className="ml-2">
                未設定(サンプル動作)
              </Badge>
            )}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">{option.description}</p>
        </div>
        {selectedActive && !disabled ? (
          <Button variant="ghost" size="sm" onClick={() => onRemove(selectedActive.id)}>
            {option.providers.find((entry) => entry.id === provider)?.label ?? provider} を削除
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
            placeholder={selectedActive?.hasSecret ? '(変更する場合のみ入力)' : ''}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        <div className="flex items-end">
          <Button
            onClick={() => onSave(option.kind, provider, secret, model, applicationId)}
            loading={saving}
            disabled={disabled}
          >
            保存
          </Button>
        </div>
      </div>
      {extraField ? (
        <div className="mt-3 max-w-lg">
          <Field label={extraField.label} hint="Rakuten Developersの「Your Applications」画面からコピーしてください">
            <Input
              value={applicationId}
              onChange={(event) => setApplicationId(event.target.value)}
              placeholder={extraField.placeholder}
              disabled={disabled}
              autoComplete="off"
            />
          </Field>
        </div>
      ) : null}
      {option.hasModel ? (
        <ModelPicker
          models={selected?.models ?? []}
          value={model}
          onChange={setModel}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}


const CUSTOM = '__custom__'

/**
 * モデル選択。定義済みモデルはプルダウンで切替、
 * 「カスタム入力」を選ぶと任意のモデルIDを直接入力できる(新モデル対応)。
 */
function ModelPicker({
  models,
  value,
  onChange,
  disabled,
}: {
  models: readonly { id: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const isPreset = models.some((entry) => entry.id === value)
  const [customMode, setCustomMode] = useState(!isPreset && value !== '')

  return (
    <div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2">
      <Field label="モデル" hint="いつでも切り替えできます(キーの再入力は不要)">
        <Select
          value={customMode ? CUSTOM : value}
          onChange={(event) => {
            if (event.target.value === CUSTOM) {
              setCustomMode(true)
            } else {
              setCustomMode(false)
              onChange(event.target.value)
            }
          }}
          disabled={disabled}
        >
          {models.map((entry) => (
            <option key={entry.id || 'default'} value={entry.id}>
              {entry.label}
            </option>
          ))}
          <option value={CUSTOM}>カスタム入力…</option>
        </Select>
      </Field>
      {customMode ? (
        <Field label="モデルID" hint="Provider公式のモデルIDを入力">
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例: claude-opus-5"
            disabled={disabled}
          />
        </Field>
      ) : null}
    </div>
  )
}
