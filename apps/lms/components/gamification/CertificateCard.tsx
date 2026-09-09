import Link from 'next/link'
import { Download, ShieldCheck } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import type { CertificateItem } from '@/lib/db/queries/gamification'

/** GAME-04: 修了証カード */
export function CertificateCard({ cert }: { cert: CertificateItem }) {
  return (
    <Card className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">Certificate</p>
        <CardTitle className="mt-1">{cert.courseTitle}</CardTitle>
        <dl className="caption tnum mt-3 grid gap-1">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0">発行日</dt>
            <dd>{formatDate(cert.issuedAt)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0">検証コード</dt>
            <dd className="font-mono">{cert.verifyCode}</dd>
          </div>
        </dl>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/certificates/${cert.id}/pdf`}>
            <Download /> PDF をダウンロード
          </a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/verify/${cert.verifyCode}`}>
            <ShieldCheck /> 検証ページ
          </Link>
        </Button>
      </div>
    </Card>
  )
}
