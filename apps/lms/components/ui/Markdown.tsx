import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'

/** Markdown レンダリング（GFM + シンタックスハイライト）。HTML は無効化（XSS 対策） */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-n', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        skipHtml
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
