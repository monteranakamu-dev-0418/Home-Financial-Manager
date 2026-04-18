'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, ArrowLeftRight, Wallet, TrendingUp, Settings, Sparkles, PiggyBank } from 'lucide-react'
import { useMode } from '@/contexts/mode-context'

const NAV_ITEMS = [
  { href: '/home',     label: 'ホーム', Icon: Home,             KawaiiIcon: Home },
  { href: '/expenses', label: '一覧',   Icon: List,             KawaiiIcon: List },
  { href: '/advances', label: '立替',   Icon: ArrowLeftRight,   KawaiiIcon: ArrowLeftRight },
  { href: '/summary',  label: '集計',   Icon: Wallet,           KawaiiIcon: PiggyBank },
  { href: '/graph',    label: 'グラフ', Icon: TrendingUp,       KawaiiIcon: TrendingUp },
  { href: '/settings', label: '設定',   Icon: Settings,         KawaiiIcon: Sparkles },
]

export function BottomNav() {
  const pathname = usePathname()
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={isKawaii ? {
        background: 'linear-gradient(180deg, #fff0f6 0%, #fce4ec 100%)',
        borderTop: '2px solid #f8bbd0',
      } : {
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
      }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          const activeColor = isKawaii ? '#c2185b' : '#2563eb'
          const inactiveColor = isKawaii ? '#f48fb1' : '#9ca3af'
          const IconComponent = isKawaii ? item.KawaiiIcon : item.Icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 relative transition-all"
              style={{ color: active ? activeColor : inactiveColor }}
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all"
                style={active && isKawaii
                  ? { background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)', transform: 'scale(1.15)' }
                  : active
                  ? { background: '#eff6ff' }
                  : {}}
              >
                <IconComponent size={isKawaii ? 18 : 20} strokeWidth={active ? 2.5 : 1.8} />
              </span>
              <span
                className="text-[10px] leading-none"
                style={{
                  fontWeight: active ? 700 : 400,
                  fontFamily: isKawaii ? 'var(--font-zen-maru), sans-serif' : undefined,
                }}
              >
                {item.label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0.5 w-4 h-0.5 rounded-full"
                  style={{ background: isKawaii ? '#f06292' : '#2563eb' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
