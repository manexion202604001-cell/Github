import { Markdown } from '@/components/ui/Markdown'
import { applyMentionLinks } from '@/lib/mentions'
import type { MentionMap } from '@/lib/db/queries/community'

/** COM-05: 本文中の `@表示名` を `/members/[userId]` リンクにして Markdown 表示する */
export function MentionText({ text, mentions, className }: { text: string; mentions: MentionMap; className?: string }) {
  return <Markdown className={className}>{applyMentionLinks(text, mentions)}</Markdown>
}
