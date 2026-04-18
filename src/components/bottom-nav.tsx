'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/home', label: 'ホーム', icon: '🏠' },
  { href: '/expenses', label: '一覧', icon: '📋' },
  { href: '/summary', label: '集計', icon: '💰' },
  { href: '/graph', label: 'グラフ', icon: '📊' },
  { href: '/settings', label: '設定', icon: '⚙️' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-xs transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={active ? 'font-semibold' : ''}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
