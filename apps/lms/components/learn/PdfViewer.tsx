'use client'
import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { updateLessonProgress } from '@/lib/actions/learn'
import { toast } from '@/components/ui/Toaster'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

/** LEARN-04: PDF.js によるスライド表示。最終ページ到達で完了 */
export function PdfViewer({ lessonId, url, completed }: { lessonId: string; url: string; completed: boolean }) {
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(800)
  const [done, setDone] = useState(completed)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 800)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!numPages || done || page < numPages) return
    updateLessonProgress(lessonId, { positionSec: page, complete: true }).then((r) => {
      if (r.ok && r.data.completed) {
        setDone(true)
        toast(r.data.courseCompleted ? 'コースを修了しました。' : 'レッスンを完了しました。')
      }
    })
  }, [page, numPages, done, lessonId])

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-ink-900">
        <Document file={url} onLoadSuccess={({ numPages: n }) => setNumPages(n)} loading={<span className="text-paper-100/70">読み込み中…</span>} error={<span className="text-paper-100/70">PDF を表示できません。</span>}>
          <Page pageNumber={page} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
      <div className="flex items-center justify-between border-t border-dark bg-ink-800 px-3 py-2 font-sans text-[12px] tracking-wide text-paper-100">
        <button type="button" className="inline-flex items-center gap-1 disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="前のページ">
          <ChevronLeft className="size-4 stroke-[1.5]" />
        </button>
        <span className="tnum">{numPages ? `${page} / ${numPages}` : '–'}</span>
        <div className="flex items-center gap-3">
          <a href={url} download className="inline-flex items-center gap-1 text-paper-100 no-underline hover:text-bronze-400" aria-label="PDF をダウンロード">
            <Download className="size-4 stroke-[1.5]" />
          </a>
          <button type="button" className="inline-flex items-center gap-1 disabled:opacity-40" onClick={() => setPage((p) => Math.min(numPages || 1, p + 1))} disabled={!numPages || page >= numPages} aria-label="次のページ">
            <ChevronRight className="size-4 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}
