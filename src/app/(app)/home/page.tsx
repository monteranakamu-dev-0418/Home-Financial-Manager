'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/user-context'
import { supabase } from '@/lib/supabase'
import { BudgetBar } from '@/components/budget-bar'
import type { Expense, Category, Advance } from '@/types'

type CategorySummary = {
  category: Category
  spent: number
  advance: number
  budget: number | null
}

function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1) // m は 1始まりなので new Date(y, m, 1) = 翌月1日
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function HomePage() {
  const { currentUser } = useUser()
  const [month] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [total, setTotal] = useState(0)
  const [totalAdvance, setTotalAdvance] = useState(0)
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([])
  const [unsettledAdvances, setUnsettledAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: expenses }, { data: budgets }, { data: categories }, { data: advances }] =
        await Promise.all([
          supabase.from('expenses').select('*').gte('date', `${month}-01`).lt('date', nextMonthStart(month)),
          supabase.from('budgets').select('*').eq('month', month),
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('advances').select('*, users(*)').eq('settled', false),
        ])

      const expenseList: Expense[] = expenses ?? []
      const advanceList: Advance[] = advances ?? []

      const monthTotal = expenseList.reduce((s, e) => s + e.amount, 0)
      setTotal(monthTotal)

      const monthAdvances = advanceList.filter((a) => a.date.startsWith(month))
      const monthAdvanceTotal = monthAdvances.reduce((s, a) => s + a.amount, 0)
      setTotalAdvance(monthAdvanceTotal)

      const summaries: CategorySummary[] = (categories ?? []).map((cat) => {
        const spent = expenseList.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0)
        const advance = monthAdvances.filter((a) => a.category_id === cat.id).reduce((s, a) => s + a.amount, 0)
        const budget = (budgets ?? []).find((b) => b.category_id === cat.id)?.amount ?? null
        return { category: cat, spent, advance, budget }
      })
      setCategorySummaries(summaries)
      setUnsettledAdvances(advanceList)
      setLoading(false)
    }
    load()
  }, [month])

  const monthlyContribution = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem('monthly_contribution') ?? '300000')
    : 300000
  const balance = monthlyContribution - total - totalAdvance
  const monthLabel = `${parseInt(month.split('-')[1])}月`

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-gray-500">こんにちは</p>
          <h1 className="text-xl font-bold text-gray-800">{currentUser?.name}さん</h1>
        </div>
        <span className="text-sm font-medium text-gray-500 bg-white border rounded-full px-3 py-1">{monthLabel}</span>
      </div>

      {/* 残高カード */}
      <div className="bg-blue-600 rounded-2xl p-5 text-white mb-4">
        <p className="text-sm opacity-80 mb-1">今月の残高</p>
        <p className="text-3xl font-bold mb-3">¥{balance.toLocaleString()}</p>
        <div className="flex justify-between text-sm opacity-80">
          <span>拠出合計 ¥{monthlyContribution.toLocaleString()}</span>
          <span>
            支出合計 ¥{(total + totalAdvance).toLocaleString()}
            {totalAdvance > 0 && <span className="text-xs ml-1">（立替 ¥{totalAdvance.toLocaleString()}）</span>}
          </span>
        </div>
      </div>

      {/* 立替アラート */}
      {unsettledAdvances.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <p className="text-sm font-medium text-orange-700 mb-1">⚠ 未精算の立替があります</p>
          {unsettledAdvances.map((a) => (
            <p key={a.id} className="text-xs text-orange-600">
              {(a.users as { name: string } | undefined)?.name} が ¥{a.amount.toLocaleString()} 立替中（{a.description}）
            </p>
          ))}
        </div>
      )}

      {/* カテゴリ別進捗 */}
      {!loading && (
        <div className="bg-white rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">カテゴリ別</h2>
          <div className="flex flex-col gap-3">
            {categorySummaries.map(({ category, spent, advance, budget }) => {
              const combinedTotal = spent + advance
              const over = budget !== null && combinedTotal > budget
              return (
                <div key={category.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-800">
                      {category.name} {over && <span className="text-red-500">⚠超過</span>}
                    </span>
                    <span className={over ? 'text-red-500' : 'text-gray-500'}>
                      ¥{combinedTotal.toLocaleString()}{budget !== null ? ` / ¥${budget.toLocaleString()}` : ''}
                      {advance > 0 && <span className="text-gray-400">（立替 ¥{advance.toLocaleString()}）</span>}
                    </span>
                  </div>
                  {budget !== null && (
                    <BudgetBar spent={spent} budget={budget} advance={advance} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        <Link
          href="/expenses/new"
          className="flex-1 bg-blue-600 text-white text-center py-4 rounded-2xl font-semibold text-sm active:scale-95 transition-transform"
        >
          ＋ 支出を入力
        </Link>
        <Link
          href="/advances/new"
          className="flex-1 bg-white border-2 border-gray-200 text-gray-700 text-center py-4 rounded-2xl font-semibold text-sm active:scale-95 transition-transform"
        >
          立替を入力
        </Link>
      </div>
    </div>
  )
}
