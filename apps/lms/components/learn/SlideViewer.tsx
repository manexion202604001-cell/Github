'use client'
import dynamic from 'next/dynamic'

const PdfViewer = dynamic(() => import('./PdfViewer').then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <div className="flex aspect-video items-center justify-center text-paper-100/70">読み込み中…</div>,
})

export function SlideViewer(props: { lessonId: string; url: string; completed: boolean }) {
  return <PdfViewer {...props} />
}
