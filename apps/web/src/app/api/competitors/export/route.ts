import { NextResponse, type NextRequest } from 'next/server'
import { apiHandler } from '@/server/api'
import { AppError } from '@/lib/errors'
import { listCompetitors } from '@/features/market-research/service'

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** 競合一覧のCSVエクスポート。Excel互換のためBOM付きUTF-8で返す。 */
export const GET = apiHandler(async (request: NextRequest) => {
  const projectId = new URL(request.url).searchParams.get('projectId')
  if (!projectId) throw AppError.validation('projectId が必要です')

  const competitors = await listCompetitors(projectId)
  const header = ['順位', '商品名', 'ブランド', '価格', '評価', 'レビュー数', 'ASIN/商品コード', 'URL', 'USP']
  const rows = competitors.map((item) =>
    [item.rank, item.title, item.brand, item.price, item.rating, item.reviewCount, item.asin, item.url, item.usp]
      .map(csvCell)
      .join(','),
  )
  const csv = `﻿${header.join(',')}\n${rows.join('\n')}\n`

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="competitors-${projectId.slice(0, 8)}.csv"`,
    },
  })
})
