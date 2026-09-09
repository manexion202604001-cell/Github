'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPost } from '@/lib/actions/community'
import { Button } from '@/components/ui/Button'
import { Select, Textarea } from '@/components/ui/Input'
import { Field } from '@/components/ui/Label'
import { FormMessage } from '@/components/ui/FormMessage'
import { toast } from '@/components/ui/Toaster'
import { ImageUploader, type UploadedImage } from '@/components/shared/ImageUploader'

type ChannelOption = { id: string; name: string }

/** COM-02: 投稿フォーム（Markdown・画像最大 4 枚）。channels を渡すとチャンネル選択を表示する */
export function PostComposer({ channels, channelId, channelName }: { channels?: ChannelOption[]; channelId?: string; channelName?: string }) {
  const router = useRouter()
  const [channel, setChannel] = useState(channelId ?? channels?.[0]?.id ?? '')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = () =>
    start(async () => {
      const r = await createPost(channel, body, images.map((i) => i.path))
      if (!r.ok) return setError(r.error)
      setError(null)
      setBody('')
      setImages([])
      toast('投稿しました。')
      router.refresh()
    })

  if (!channel) return null
  return (
    <form
      className="space-y-4 rounded border bg-paper-200 p-5 md:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {channels && channels.length > 0 ? (
          <Field label="チャンネル" htmlFor="composer-channel" className="md:w-56 md:shrink-0">
            <Select id="composer-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          channelName && <p className="caption md:pt-8">#{channelName} に投稿</p>
        )}
        <Field label="本文（Markdown 可）" htmlFor="composer-body" className="flex-1">
          <Textarea
            id="composer-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10_000}
            placeholder="受講生同士で共有したいことを書きましょう。@表示名 でメンションできます。"
            className="bg-paper-100"
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ImageUploader max={4} value={images} onChange={setImages} />
        <div className="flex items-center gap-3">
          <FormMessage message={error} />
          <Button type="submit" disabled={pending || body.trim().length === 0}>
            {pending ? '投稿中…' : '投稿する'}
          </Button>
        </div>
      </div>
    </form>
  )
}
