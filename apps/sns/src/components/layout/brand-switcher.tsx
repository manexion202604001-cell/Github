'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Building2, ChevronDown, Loader2 } from 'lucide-react'

export type BrandOption = { id: string; name: string; industry: string | null }

/**
 * ブランド選択(要件76)。
 * 選択は URL クエリ(brandId)で持ち、リロード・共有でも状態が保たれる。
 */
export function BrandSwitcher({ brands, activeBrandId }: { brands: BrandOption[]; activeBrandId: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  if (brands.length === 0) {
    return (
      <Link
        href="/brands/new"
        className="flex items-center gap-2.5 rounded-[12px] border border-dashed border-line-strong px-3 py-2.5 text-[13px] font-semibold text-ink-muted transition-colors hover:border-brand/50 hover:text-brand"
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
        ブランドを登録
      </Link>
    )
  }

  function onChange(brandId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('brandId', brandId)
    startTransition(() => router.push(`?${params.toString()}`))
  }

  return (
    <div className="relative">
      <label htmlFor="brand-switcher" className="sr-only">
        ブランドを選択
      </label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand">
        <Building2 className="h-4 w-4" aria-hidden="true" />
      </span>
      <select
        id="brand-switcher"
        value={activeBrandId ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
        className="w-full appearance-none rounded-[12px] border border-line bg-surface py-2.5 pl-9 pr-9 text-[13px] font-semibold text-navy transition-colors hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
      >
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </span>
    </div>
  )
}
