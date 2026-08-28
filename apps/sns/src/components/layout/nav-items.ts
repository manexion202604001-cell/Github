import {
  Calendar,
  FlaskConical,
  LayoutDashboard,
  Library,
  Lightbulb,
  Settings,
  Swords,
  Video,
} from 'lucide-react'

/** サイドバーの構成(要件76)。 */
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', jaLabel: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/research', label: 'Market Research', jaLabel: '市場調査', icon: FlaskConical },
  { href: '/ideas', label: 'Ideas', jaLabel: '企画', icon: Lightbulb },
  { href: '/scripts', label: 'Scripts', jaLabel: '台本', icon: Video },
  { href: '/calendar', label: 'Calendar', jaLabel: 'カレンダー', icon: Calendar },
  { href: '/library', label: 'Library', jaLabel: 'ライブラリ', icon: Library },
  { href: '/competitors', label: 'Competitors', jaLabel: '競合', icon: Swords },
  { href: '/settings/profile', label: 'Settings', jaLabel: '設定', icon: Settings },
] as const
