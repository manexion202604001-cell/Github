'use client'
import { useState, useTransition } from 'react'
import { updateNotificationSettings, type NotificationSettingsInput } from '@/lib/actions/settings'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

const ITEMS: { key: keyof NotificationSettingsInput; label: string; hint: string }[] = [
  { key: 'emailQaReply', label: 'Q&A に回答がついたとき', hint: '自分の質問に講師の公式回答がついたときにメールでお知らせします。' },
  { key: 'emailNewCourse', label: '新しいコースが公開されたとき', hint: '新コースの公開をメールでお知らせします。' },
  { key: 'emailOfficeHour', label: 'オフィスアワーのリマインド', hint: '開催 24 時間前と 1 時間前にメールでお知らせします。' },
  { key: 'emailMention', label: 'メンションされたとき', hint: 'コミュニティで @メンションされたときにメールでお知らせします。' },
  { key: 'emailWeeklySummary', label: '週間サマリー', hint: '毎週月曜の朝に、学習の振り返りをメールでお届けします（任意）。' },
]

/** §5.8: メール通知の項目別 ON/OFF */
export function NotificationSettingsForm({ initial }: { initial: NotificationSettingsInput }) {
  const [values, setValues] = useState(initial)
  const [pending, start] = useTransition()
  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await updateNotificationSettings(values)
          if (!r.ok) return toast(r.error)
          toast('保存しました。')
        })
      }}
    >
      <div>
        <p className="eyebrow mb-1">Email</p>
        <p className="text-[15px] text-stone-500">メールで受け取る通知を選べます。アプリ内の通知（ベル）は常に届きます。</p>
      </div>
      <ul className="divide-y border-y">
        {ITEMS.map((it) => (
          <li key={it.key} className="flex items-center justify-between gap-4 py-5">
            <div>
              <label htmlFor={`ns-${it.key}`} className="ui-label block text-ink-700">{it.label}</label>
              <p className="caption mt-0.5">{it.hint}</p>
            </div>
            <Switch id={`ns-${it.key}`} checked={values[it.key]} onCheckedChange={(v) => setValues((s) => ({ ...s, [it.key]: v }))} />
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? '保存中…' : '保存'}</Button>
      </div>
    </form>
  )
}
