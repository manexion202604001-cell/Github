import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Table, Td, Th } from '@/components/ui/Table'
import { cn } from '@/lib/utils'
import type { RankingRow } from '@/lib/db/queries/gamification'

function Row({ row, isMe }: { row: RankingRow; isMe: boolean }) {
  return (
    <tr className={cn(isMe && 'bg-paper-200')}>
      <Td className="tnum w-16 text-stone-500">{row.rank}</Td>
      <Td>
        <Link href={`/members/${row.userId}`} className="inline-flex items-center gap-3 no-underline hover:text-bronze-500">
          <Avatar name={row.displayName} src={row.avatarUrl} size={28} />
          <span className="font-serif text-[15px]">{row.displayName}</span>
          {isMe && <span className="caption">あなた</span>}
        </Link>
      </Td>
      <Td className="tnum w-28 text-right">{row.xp.toLocaleString('ja-JP')} XP</Td>
    </tr>
  )
}

/** GAME-03: 上位 20 名 + 自分の順位（下部固定） */
export function RankingTable({ rows, me, viewerId }: { rows: RankingRow[]; me: RankingRow | null; viewerId: string }) {
  return (
    <div>
      <Table>
        <thead>
          <tr>
            <Th>順位</Th>
            <Th>会員</Th>
            <Th className="text-right">XP</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.userId} row={r} isMe={r.userId === viewerId} />
          ))}
        </tbody>
      </Table>
      <div className="sticky bottom-14 mt-6 border-t bg-paper-100 py-3 lg:bottom-0">
        {me ? (
          <Table className="border-0">
            <tbody>
              <Row row={me} isMe />
            </tbody>
          </Table>
        ) : (
          <p className="caption px-3">あなたの順位: 圏外</p>
        )}
      </div>
    </div>
  )
}
