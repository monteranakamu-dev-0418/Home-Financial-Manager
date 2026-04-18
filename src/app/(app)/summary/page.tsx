'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useMode } from '@/contexts/mode-context'
import { BudgetBar } from '@/components/budget-bar'
import type { Category, Expense } from '@/types'

type CategorySummary = {
  category: Category
  spent: number
  advance: number
  budget: number | null
}

function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function SummaryPage() {
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [total, setTotal] = useState(0)
  const [totalAdvance, setTotalAdvance] = useState(0)
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([])
  const [unsettledCount, setUnsettledCount] = useState(0)
  const [unsettledTotal, setUnsettledTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const monthStart = `${month}-01`
    const monthEnd = nextMonthStart(month)

    const [{ data: monthExpenses }, { data: budgets }, { data: categories }, { data: allUnsettled }] =
      await Promise.all([
        supabase.from('expenses').select('*')
          .gte('date', monthStart).lt('date', monthEnd)
          .or('advance_status.is.null,advance_status.eq.settled'),
        supabase.from('budgets').select('*').eq('month', month),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('expenses').select('amount, date, category_id')
          .eq('advance_status', 'unsettled'),
      ])

    const expenseList: Expense[] = monthExpenses ?? []
    const unsettledList = allUnsettled ?? []

    setTotal(expenseList.reduce((s, e) => s + e.amount, 0))

    const monthUnsettled = unsettledList.filter((a) => a.date.startsWith(month))
    setTotalAdvance(monthUnsettled.reduce((s, a) => s + a.amount, 0))

    setCategorySummaries((categories ?? []).map((cat) => ({
      category: cat,
      spent: expenseList.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0),
      advance: monthUnsettled.filter((a) => a.category_id === cat.id).reduce((s, a) => s + a.amount, 0),
      budget: (budgets ?? []).find((b) => b.category_id === cat.id)?.amount ?? null,
    })))

    setUnsettledCount(unsettledList.length)
    setUnsettledTotal(unsettledList.reduce((s, a) => s + a.amount, 0))
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const monthlyBudget = categorySummaries.reduce((s, c) => s + (c.budget ?? 0), 0)
  const balance = monthlyBudget - total - totalAdvance
  const kFont = isKawaii ? { fontFamily: 'var(--font-zen-maru), sans-serif' } : {}

  const balanceCardStyle = balance < 0
    ? { background: 'linear-gradient(135deg, #ef9a9a 0%, #e53935 100%)' }
    : { background: 'linear-gradient(135deg, #f48fb1 0%, #e91e63 60%, #c2185b 100%)' }

  return (
    <div className="px-4 pt-6 pb-4" style={kFont}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
          {isKawaii ? '💰 集計' : '集計'}
        </h1>
        <input
          type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 bg-white border rounded-xl text-sm focus:outline-none"
          style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}
        />
      </div>

      {/* 残高サマリー */}
      {isKawaii ? (
        <div className="rounded-3xl p-5 text-white mb-4"
          style={{ ...balanceCardStyle, boxShadow: '0 8px 24px rgba(233,30,99,0.25)' }}>
          <p className="text-xs opacity-85 mb-1 font-medium">✨ 今月の残高</p>
          <p className="text-4xl font-bold mb-3">¥{balance.toLocaleString()}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="opacity-75 text-xs">今月の支出</p>
              <p className="font-bold">
                ¥{(total + totalAdvance).toLocaleString()}
                {totalAdvance > 0 && (
                  <span className="text-xs opacity-75 ml-1">（立替 ¥{totalAdvance.toLocaleString()}）</span>
                )}
              </p>
            </div>
            <div>
              <p className="opacity-75 text-xs">予算合計</p>
              <p className="font-bold">¥{monthlyBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${balance < 0 ? 'bg-red-500' : 'bg-blue-600'} rounded-2xl p-5 text-white mb-4`}>
          <p className="text-sm opacity-80 mb-1">今月の残高</p>
          <p className="text-3xl font-bold mb-3">¥{balance.toLocaleString()}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="opacity-70">今月の支出</p>
              <p className="font-semibold">
                ¥{(total + totalAdvance).toLocaleString()}
                {totalAdvance > 0 && (
                  <span className="text-xs opacity-70 ml-1">（立替分 ¥{totalAdvance.toLocaleString()}）</span>
                )}
              </p>
            </div>
            <div>
              <p className="opacity-70">予算合計</p>
              <p className="font-semibold">¥{monthlyBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* 未精算の立替サマリー */}
      {unsettledCount > 0 && (
        <Link href="/advances"
          className="block rounded-xl px-4 py-3 mb-4"
          style={isKawaii
            ? { background: 'linear-gradient(135deg, #fff8e1, #ffecb3)', border: '1.5px solid #ffcc02' }
            : { background: '#fff7ed', border: '1px solid #fed7aa' }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold" style={{ color: isKawaii ? '#f57f17' : '#c2410c' }}>
                {isKawaii ? '💸 未精算の立替' : '⚠ 未精算の立替'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: isKawaii ? '#f57f17' : '#ea580c' }}>
                {unsettledCount}件
              </p>
            </div>
            <p className="text-lg font-bold" style={{ color: isKawaii ? '#e65100' : '#c2410c' }}>
              ¥{unsettledTotal.toLocaleString()}
            </p>
          </div>
        </Link>
      )}

      {/* カテゴリ別内訳 */}
      {!loading && (
        <div className="rounded-2xl p-4"
          style={isKawaii
            ? { background: 'linear-gradient(135deg, #fff0f6, #fce4ec)', border: '1.5px solid #f8bbd0' }
            : { background: 'white' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: isKawaii ? '#880e4f' : '#4b5563' }}>
            {isKawaii ? '🌸 カテゴリ別内訳' : 'カテゴリ別内訳'}
          </h2>

          <div className="grid grid-cols-3 text-xs mb-2 px-1" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
            <span className="col-span-1">カテゴリ</span>
            <span className="text-right">今月</span>
            <span className="text-right">予算</span>
          </div>

          <div className="flex flex-col gap-3">
            {categorySummaries.map(({ category, spent, advance, budget }) => {
              const combinedTotal = spent + advance
              const over = budget !== null && combinedTotal > budget
              return (
                <div key={category.id}>
                  <div className="grid grid-cols-3 text-sm items-center mb-1 px-1">
                    <span className="font-medium col-span-1" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
                      {category.icon && <span className="mr-1">{category.icon}</span>}{category.name}
                    </span>
                    <div className="text-right">
                      <span className="font-semibold" style={{ color: over ? '#b71c1c' : (isKawaii ? '#c2185b' : '#1f2937') }}>
                        ¥{combinedTotal.toLocaleString()}
                      </span>
                      {advance > 0 && (
                        <p className="text-xs" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
                          立替 ¥{advance.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className="text-right text-xs" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
                      {budget !== null ? `¥${budget.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  {budget !== null && (
                    <BudgetBar spent={spent} budget={budget} advance={advance} kawaii={isKawaii} />
                  )}
                </div>
              )
            })}

            {/* 合計行 */}
            <div className="pt-3 grid grid-cols-3 text-sm font-bold px-1"
              style={{ borderTop: `1px solid ${isKawaii ? '#fce4ec' : '#f3f4f6'}` }}>
              <span className="col-span-1" style={{ color: isKawaii ? '#880e4f' : '#374151' }}>合計</span>
              <div className="text-right">
                <span style={{ color: isKawaii ? '#c2185b' : '#1f2937' }}>¥{(total + totalAdvance).toLocaleString()}</span>
                {totalAdvance > 0 && (
                  <p className="text-xs font-normal" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
                    立替 ¥{totalAdvance.toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-right text-xs font-normal" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
                {categorySummaries.some((s) => s.budget !== null)
                  ? `¥${categorySummaries.reduce((s, c) => s + (c.budget ?? 0), 0).toLocaleString()}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
