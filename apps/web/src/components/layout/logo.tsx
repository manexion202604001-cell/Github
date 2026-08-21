import { cn } from '@/lib/cn'

/**
 * UCCHAU ブランドロゴ。
 * アイコン(スピードライン付きの箱 + 上昇矢印)はSVGで描画し、
 * ワードマークはテキストで組む。
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 112" className={cn('h-8 w-auto', className)} aria-hidden="true">
      <defs>
        <linearGradient id="ucchau-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E7CF6" />
          <stop offset="100%" stopColor="#1B2FA8" />
        </linearGradient>
        <linearGradient id="ucchau-deep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1D2E9E" />
          <stop offset="100%" stopColor="#101C4E" />
        </linearGradient>
        <linearGradient id="ucchau-swoosh" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2417B8" />
          <stop offset="100%" stopColor="#2E7CF6" />
        </linearGradient>
      </defs>

      {/* スピードライン */}
      <g fill="url(#ucchau-swoosh)">
        <rect x="2" y="50" width="26" height="7" rx="3.5" />
        <rect x="14" y="62" width="30" height="7" rx="3.5" />
        <rect x="6" y="74" width="22" height="7" rx="3.5" />
        <rect x="20" y="86" width="16" height="7" rx="3.5" />
      </g>

      {/* きらめき */}
      <path
        d="M46 14 L49 22 L57 25 L49 28 L46 36 L43 28 L35 25 L43 22 Z"
        fill="#2E7CF6"
      />

      {/* アンテナ(ノード付き) */}
      <g stroke="#1D4FE0" strokeWidth="4.5" strokeLinecap="round">
        <line x1="82" y1="30" x2="104" y2="12" />
      </g>
      <circle cx="93" cy="21" r="4.5" fill="#1D4FE0" />
      <circle cx="107" cy="10" r="6.5" fill="#2E7CF6" />

      {/* 箱(アイソメトリック) */}
      <g strokeLinejoin="round">
        <polygon points="44,42 76,30 104,40 72,52" fill="url(#ucchau-box)" />
        <polygon points="44,42 72,52 72,90 44,78" fill="url(#ucchau-deep)" />
        <polygon points="72,52 104,40 104,76 72,90" fill="#141F63" />
        {/* テープライン */}
        <polygon points="60,36.5 66,34 94,43.8 88,46.2" fill="#F4F7FF" opacity="0.9" />
      </g>

      {/* スウッシュ + 矢印 */}
      <path
        d="M18 96 C 46 112, 88 108, 112 78 L106 76 C 86 100, 52 104, 24 92 Z"
        fill="url(#ucchau-swoosh)"
      />
      <polygon points="103,64 127,55 115,85" fill="#2E7CF6" />
    </svg>
  )
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="h-8" />
      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-black tracking-tight text-[#101C4E]">UCCHAU</span>
        {compact ? null : (
          <span className="mt-1 text-[9px] font-semibold tracking-[0.18em] text-ink-subtle">
            AI PRODUCT DEVELOPMENT OS
          </span>
        )}
      </span>
    </span>
  )
}
