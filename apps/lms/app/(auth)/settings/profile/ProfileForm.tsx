'use client'
import { useActionState, useEffect } from 'react'
import { updateProfile } from '@/lib/actions/settings'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Field, Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { FormMessage } from '@/components/ui/FormMessage'
import { toast } from '@/components/ui/Toaster'
import { AvatarUpload } from '@/components/settings/AvatarUpload'
import { LEVEL_LABEL, ROLE_LABEL } from '@/lib/utils'

type Initial = {
  displayName: string
  bio: string | null
  level: 'beginner' | 'intermediate' | 'advanced' | null
  isPublic: boolean
  hideFromRanking: boolean
  avatarUrl: string | null
  role: 'student' | 'instructor' | 'admin'
}

/** AUTH-04: プロフィール編集フォーム（role は表示のみ） */
export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, action] = useActionState(updateProfile, null)
  useEffect(() => {
    if (state?.ok) toast('保存しました。')
  }, [state])

  return (
    <form action={action} className="space-y-8">
      <div className="space-y-1">
        <Label>アバター</Label>
        <AvatarUpload name="avatarUrl" initialUrl={initial.avatarUrl} />
      </div>
      <Field label="表示名" htmlFor="displayName" hint="40 文字以内">
        <Input id="displayName" name="displayName" defaultValue={initial.displayName} maxLength={40} required />
      </Field>
      <Field label="自己紹介" htmlFor="bio" hint="200 文字以内">
        <Textarea id="bio" name="bio" defaultValue={initial.bio ?? ''} maxLength={200} />
      </Field>
      <Field label="レベル（自己申告）" htmlFor="level">
        <Select id="level" name="level" defaultValue={initial.level ?? ''}>
          <option value="">未設定</option>
          {(Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[]).map((k) => (
            <option key={k} value={k}>{LEVEL_LABEL[k]}</option>
          ))}
        </Select>
      </Field>
      <div className="space-y-1">
        <Label>ロール</Label>
        <div><Badge>{ROLE_LABEL[initial.role]}</Badge></div>
        <p className="caption">ロールは管理者のみ変更できます。</p>
      </div>
      <div className="space-y-4 border-y py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-label text-ink-700">プロフィールを公開する</p>
            <p className="caption">OFF にすると他の会員からプロフィールページが見えなくなります。</p>
          </div>
          <Switch name="isPublic" defaultChecked={initial.isPublic} aria-label="プロフィールを公開する" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-label text-ink-700">ランキングに表示しない</p>
            <p className="caption">ON にするとランキングから除外されます。</p>
          </div>
          <Switch name="hideFromRanking" defaultChecked={initial.hideFromRanking} aria-label="ランキングに表示しない" />
        </div>
      </div>
      <FormMessage message={state && !state.ok ? state.error : null} />
      <div className="flex justify-end">
        <SubmitButton pendingText="保存中…">保存</SubmitButton>
      </div>
    </form>
  )
}
