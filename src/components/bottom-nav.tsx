'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMode } from '@/contexts/mode-context'

const NAV_ITEMS = [
  { href: '/home', label: 'ホーム', icon: '🏠', kawaiiIcon: '🏠' },
  { href: '/expenses', label: '一覧', icon: '📋', kawaiiIcon: '📋' },
  { href: '/advances', label: '立替', icon: '🔄', kawaiiIcon: '💸' },
  { href: '/summary', label: '集計', icon: '💰', kawaiiIcon: '💰' },
  { href: '/graph', label: 'グラフ', icon: '📊', kawaiiIcon: '📊' },
  { href: '/settings', label: '設定', icon: '⚙️', kawaiiIcon: '✨' },
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

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors"
              style={{ color: active ? activeColor : inactiveColor }}
            >
              <span className={`text-lg ${active && isKawaii ? 'drop-shadow-sm' : ''}`}>
                {isKawaii ? item.kawaiiIcon : item.icon}
              </span>
              <span
                className="text-[10px]"
                style={{
                  fontWeight: active ? 700 : 400,
                  fontFamily: isKawaii ? 'var(--font-zen-maru), sans-serif' : undefined,
                }}
              >
                {item.label}
              </span>
              {/* アクティブインジケーター */}
              {active && isKawaii && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ background: '#f06292' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
