import { Download } from 'lucide-react'

function fmtSize(n: number | null) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** LEARN-10: 添付資料（署名付き URL は /api/attachments/[id] で都度発行） */
export function AttachmentList({ attachments }: { attachments: { id: string; fileName: string; sizeBytes: number | null }[] }) {
  if (attachments.length === 0) return <p className="text-[15px] text-stone-500">このレッスンに資料はありません。</p>
  return (
    <ul className="divide-y border-y">
      {attachments.map((a) => (
        <li key={a.id}>
          <a href={`/api/attachments/${a.id}`} className="flex items-center gap-3 py-3 no-underline hover:text-bronze-500">
            <Download className="size-4 stroke-[1.5] text-stone-500" />
            <span className="flex-1 font-sans text-[14px] tracking-[0.04em]">{a.fileName}</span>
            <span className="caption tnum">{fmtSize(a.sizeBytes)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
