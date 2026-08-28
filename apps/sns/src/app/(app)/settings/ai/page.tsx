import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { getCurrentOrganization, usageSummary } from '@/features/organizations/service'
import { availableProviders, aiIsLive } from '@/lib/ai/provider'
import { searchIsLive, searchProvider } from '@/lib/search'
import { organizationProviderId } from '@/server/org-provider'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InlineNotice } from '@/components/ui/error-state'
import { AiProviderForm } from '@/components/settings/ai-provider-form'
import { formatNumber } from '@/lib/format'

export const metadata: Metadata = { title: 'AI設定' }
export const dynamic = 'force-dynamic'

export default async function AiSettingsPage() {
  const organization = await getCurrentOrganization()
  const providerId = await organizationProviderId(organization.id)
  const providers = availableProviders()
  const usage = await usageSummary()
  const live = { ai: aiIsLive(providerId), search: searchIsLive() }
  const search = searchProvider()

  const totalCostYen = usage.reduce((sum, row) => sum + row.estimatedCostMicro, 0) / 1_000_000

  return (
    <div className="space-y-6">
      {!live.ai || !live.search ? (
        <InlineNotice tone="warning" title="現在サンプルデータで動作しています(Demo Mode)">
          {!live.ai ? 'AIのAPIキーが未設定です。' : ''}
          {!live.search ? '検索サービスのAPIキーが未設定です。' : ''}
          環境変数を設定すると、実際のAI生成とWeb検索に切り替わります。画面と機能はそのまま利用できます。
        </InlineNotice>
      ) : null}

      <AiProviderForm
        organizationName={organization.name}
        currentProvider={providerId ?? ''}
        providers={providers}
        role={organization.role}
      />

      <Card>
        <CardHeader icon={<Sparkles className="h-4 w-4" />} title="接続状況" description="APIキーはサーバー側にのみ保持され、ブラウザへは渡りません。" />
        <CardBody className="space-y-3">
          <StatusRow label="AI Provider" value={live.ai ? '接続済み' : 'Demo(mock)'} live={live.ai} />
          <StatusRow label="Search Provider" value={live.search ? search.id : 'Demo(mock)'} live={live.search} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="AI利用状況" description="直近1か月の機能別の呼び出し回数と概算コストです。" />
        <CardBody>
          {usage.length === 0 ? (
            <p className="text-[13px] text-ink-muted">まだAIの利用履歴がありません。</p>
          ) : (
            <>
              <div className="scroll-x">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-bold tracking-wide text-ink-subtle">
                      <th className="py-2 pr-3">機能</th>
                      <th className="py-2 pr-3 text-right">呼び出し</th>
                      <th className="py-2 pr-3 text-right">入力トークン</th>
                      <th className="py-2 pr-3 text-right">出力トークン</th>
                      <th className="py-2 text-right">概算コスト</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((row) => (
                      <tr key={row.feature} className="border-b border-line/70 text-[13px]">
                        <td className="py-2.5 pr-3 text-navy">{row.feature}</td>
                        <td className="tabular py-2.5 pr-3 text-right text-ink-muted">{formatNumber(row.calls)}</td>
                        <td className="tabular py-2.5 pr-3 text-right text-ink-muted">{formatNumber(row.inputTokens)}</td>
                        <td className="tabular py-2.5 pr-3 text-right text-ink-muted">{formatNumber(row.outputTokens)}</td>
                        <td className="tabular py-2.5 text-right text-ink-muted">
                          ¥{formatNumber(Math.round(row.estimatedCostMicro / 1_000_000))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12px] text-ink-subtle">
                概算合計 ¥{formatNumber(Math.round(totalCostYen))}。実際の請求額は各AIサービスの明細をご確認ください。
              </p>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function StatusRow({ label, value, live }: { label: string; value: string; live: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
      <span className="text-[13px] font-semibold text-navy">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[13px] text-ink-muted">{value}</span>
        <Badge tone={live ? 'positive' : 'accent'}>{live ? 'LIVE' : 'DEMO'}</Badge>
      </span>
    </div>
  )
}
