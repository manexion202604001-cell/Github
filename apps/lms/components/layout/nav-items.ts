import { LayoutDashboard, BookOpen, MessageCircleQuestion, Users, Video, Trophy, MoreHorizontal, type LucideIcon } from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

export const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/courses', label: 'コース', icon: BookOpen },
  { href: '/qa', label: 'Q&A', icon: MessageCircleQuestion },
  { href: '/community', label: 'コミュニティ', icon: Users },
  { href: '/office-hours', label: 'オフィスアワー', icon: Video },
  { href: '/ranking', label: 'ランキング', icon: Trophy },
]

export const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
  { href: '/courses', label: 'コース', icon: BookOpen },
  { href: '/qa', label: 'Q&A', icon: MessageCircleQuestion },
  { href: '/community', label: 'コミュニティ', icon: Users },
  { href: '/more', label: 'その他', icon: MoreHorizontal },
]
