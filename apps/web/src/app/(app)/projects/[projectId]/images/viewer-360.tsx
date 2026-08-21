'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 360度商品ビュー(要件18)。
 * 8方向画像を連続表示し、PCはドラッグ・スマホはスワイプで回転する。
 */
export function Viewer360({ images }: { images: { url: string; angle: string | null }[] }) {
  const [index, setIndex] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const dragging = useRef<{ startX: number; startIndex: number } | null>(null)
  const count = images.length

  useEffect(() => {
    if (!autoRotate || count === 0) return
    const timer = setInterval(() => setIndex((value) => (value + 1) % count), 600)
    return () => clearInterval(timer)
  }, [autoRotate, count])

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      setAutoRotate(false)
      dragging.current = { startX: event.clientX, startIndex: index }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [index],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging.current || count === 0) return
      // 40pxのドラッグで1コマ回転。左ドラッグで時計回り。
      const delta = Math.round((event.clientX - dragging.current.startX) / 40)
      setIndex((((dragging.current.startIndex - delta) % count) + count) % count)
    },
    [count],
  )

  const onPointerUp = useCallback(() => {
    dragging.current = null
  }, [])

  if (count === 0) return null

  return (
    <div className="select-none">
      <div
        className="relative aspect-square w-full cursor-grab touch-pan-y overflow-hidden border border-line bg-white active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {images.map((image, imageIndex) => (
          // 全画像を重ねて表示切替することで、読み込み済み画像の回転をなめらかにする。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image.url}
            src={image.url}
            alt={image.angle ?? `angle-${imageIndex}`}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ opacity: imageIndex === index ? 1 : 0 }}
          />
        ))}
        <span className="absolute right-3 bottom-3 bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white">
          {index + 1} / {count}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[12px] text-ink-subtle">ドラッグ / スワイプで回転できます</p>
        <button
          type="button"
          onClick={() => setAutoRotate((value) => !value)}
          className=" border border-line px-3 py-1 text-[12px] font-semibold text-ink-muted hover:border-brand hover:text-brand"
        >
          {autoRotate ? '自動回転を停止' : '自動回転'}
        </button>
      </div>
    </div>
  )
}
