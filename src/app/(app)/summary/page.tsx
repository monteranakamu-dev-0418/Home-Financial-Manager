'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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

    const [{ data: expenses }, { data: budgets }, { data: categories }, { data: advances }] =
      await Promise.all([
        supabase.from('expenses').select('*').gte('date', monthStart).lt('date', monthEnd),
        supabase.from('budgets').select('*').eq('month', month),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('advances').select('amount, date, category_id').eq('settled', false),
      ])

    const expenseList: Expense[] = expenses ?? []
    const advanceList = advances ?? []

    const monthTotal = expenseList.reduce((s, e) => s + e.amount, 0)
    setTotal(monthTotal)

    const monthAdvances = advanceList.filter((a) => a.date.startsWith(month))
    const monthAdvanceTotal = monthAdvances.reduce((s, a) => s + a.amount, 0)
    setTotalAdvance(monthAdvanceTotal)

    const summaries: CategorySummary[] = (categories ?? []).map((cat) => {
      const catSpent = expenseList
        .filter((e) => e.category_id === cat.id)
        .reduce((s, e) => s + e.amount, 0)

      const catAdvance = monthAdvances
        .filter((a) => a.category_id === cat.id)
        .reduce((s, a) => s + a.amount, 0)

      const budget = (budgets ?? []).find((b) => b.category_id === cat.id)?.amount ?? null

      return { category: cat, spent: catSpent, advance: catAdvance, budget }
    })
    setCategorySummaries(summaries)
    setUnsettledCount(advanceList.length)
    setUnsettledTotal(advanceList.reduce((s, a) => s + a.amount, 0))
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const monthlyBudget = categorySummaries.reduce((s, c) => s + (c.budget ?? 0), 0)
  const balance = monthlyBudget - total - totalAdvance

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">集計</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 残高サマリー */}
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

      {/* 未精算の立替サマリー */}
      {unsettledCount > 0 && (
        <Link href="/advances" className="block bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-orange-700">⚠ 未精算の立替</p>
              <p className="text-xs text-orange-500 mt-0.5">{unsettledCount}件</p>
            </div>
            <p className="text-lg font-bold text-orange-700">¥{unsettledTotal.toLocaleString()}</p>
          </div>
        </Link>
      )}

      {/* カテゴリ別内訳 */}
      {!loading && (
        <div className="bg-white rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">カテゴリ別内訳</h2>

          {/* ヘッダー */}
          <div className="grid grid-cols-3 text-xs text-gray-400 mb-2 px-1">
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
                    <span className="font-medium col-span-1 text-gray-800">
                      {category.name}
                    </span>
                    <div className="text-right">
                      <span className={`font-semibold ${over ? 'text-red-500' : 'text-gray-800'}`}>
                        ¥{combinedTotal.toLocaleString()}
                      </span>
                      {advance > 0 && (
                        <p className="text-xs text-gray-400">立替 ¥{advance.toLocaleString()}</p>
                      )}
                    </div>
                    <span className="text-right text-gray-400 text-xs">
                      {budget !== null ? `¥${budget.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  {budget !== null && (
                    <BudgetBar spent={spent} budget={budget} advance={advance} />
                  )}
                </div>
              )
            })}

            {/* 合計行 */}
            <div className="border-t border-gray-100 pt-3 grid grid-cols-3 text-sm font-bold px-1">
              <span className="col-span-1 text-gray-700">合計</span>
              <div className="text-right">
                <span className="text-gray-800">¥{(total + totalAdvance).toLocaleString()}</span>
                {totalAdvance > 0 && (
                  <p className="text-xs text-gray-400 font-normal">立替 ¥{totalAdvance.toLocaleString()}</p>
                )}
              </div>
              <span className="text-right text-gray-400 text-xs">
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
