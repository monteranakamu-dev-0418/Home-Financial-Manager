'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/user-context'
import { useMode } from '@/contexts/mode-context'
import { supabase } from '@/lib/supabase'
import { BudgetBar } from '@/components/budget-bar'
import type { Expense, Category } from '@/types'

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

export default function HomePage() {
  const { currentUser } = useUser()
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'

  const [month] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [total, setTotal] = useState(0)
  const [totalAdvance, setTotalAdvance] = useState(0)
  const [monthlyBudget, setMonthlyBudget] = useState(0)
  const [carryOver, setCarryOver] = useState(0)
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([])
  const [unsettledAdvances, setUnsettledAdvances] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const currentMonthStart = `${month}-01`
      const monthEnd = nextMonthStart(month)

      const [
        { data: monthExpenses },
        { data: budgets },
        { data: categories },
        { data: allUnsettled },
        { data: pastBudgets },
        { data: pastExpenses },
      ] = await Promise.all([
        supabase.from('expenses').select('*')
          .gte('date', currentMonthStart)
          .lt('date', monthEnd)
          .or('advance_status.is.null,advance_status.eq.settled'),
        supabase.from('budgets').select('*').eq('month', month),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('expenses').select('*, users(*)')
          .eq('advance_status', 'unsettled'),
        supabase.from('budgets').select('*').lt('month', month),
        supabase.from('expenses').select('amount').lt('date', currentMonthStart),
      ])

      const expenseList: Expense[] = monthExpenses ?? []
      const unsettledList: Expense[] = allUnsettled ?? []

      const monthTotal = expenseList.reduce((s, e) => s + e.amount, 0)
      setTotal(monthTotal)

      const monthUnsettled = unsettledList.filter((a) => a.date.startsWith(month))
      const monthAdvanceTotal = monthUnsettled.reduce((s, a) => s + a.amount, 0)
      setTotalAdvance(monthAdvanceTotal)

      const thisMonthBudget = (budgets ?? []).reduce((s, b) => s + b.amount, 0)
      setMonthlyBudget(thisMonthBudget)

      const pastBudgetTotal = (pastBudgets ?? []).reduce((s, b) => s + b.amount, 0)
      const pastExpenseTotal = (pastExpenses ?? []).reduce((s, e) => s + e.amount, 0)
      setCarryOver(pastBudgetTotal - pastExpenseTotal)

      const summaries: CategorySummary[] = (categories ?? []).map((cat) => {
        const spent = expenseList.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0)
        const advance = monthUnsettled.filter((a) => a.category_id === cat.id).reduce((s, a) => s + a.amount, 0)
        const budget = (budgets ?? []).find((b) => b.category_id === cat.id)?.amount ?? null
        return { category: cat, spent, advance, budget }
      })
      setCategorySummaries(summaries)
      setUnsettledAdvances(unsettledList)
      setLoading(false)
    }
    load()
  }, [month])

  const balance = monthlyBudget - total - totalAdvance
  const monthLabel = `${parseInt(month.split('-')[1])}月`

  if (!isKawaii) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-gray-500">こんにちは</p>
            <h1 className="text-xl font-bold text-gray-800">{currentUser?.name}さん</h1>
          </div>
          <span className="text-sm font-medium text-gray-500 bg-white border rounded-full px-3 py-1">{monthLabel}</span>
        </div>

        <div className={`${balance < 0 ? 'bg-red-500' : 'bg-blue-600'} rounded-2xl p-5 text-white mb-4`}>
          <p className="text-sm opacity-80 mb-1">今月の残高</p>
          <p className="text-3xl font-bold mb-3">¥{balance.toLocaleString()}</p>
          <div className="flex justify-between text-sm opacity-80">
            <span>予算合計 ¥{monthlyBudget.toLocaleString()}</span>
            <span className="text-right">
              支出合計 ¥{(total + totalAdvance).toLocaleString()}
              {totalAdvance > 0 && (
                <span className="block text-xs">（立替 ¥{totalAdvance.toLocaleString()}）</span>
              )}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl px-5 py-4 mb-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">先月までの資産合計</p>
            <p className={`text-xl font-bold ${carryOver >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
              ¥{carryOver.toLocaleString()}
            </p>
          </div>
          <span className="text-2xl">🏦</span>
        </div>

        {unsettledAdvances.length > 0 && (
          <Link href="/advances" className="block bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
            <p className="text-sm font-medium text-orange-700">⚠ 未精算の立替があります</p>
          </Link>
        )}

        <div className="flex gap-3 mb-4">
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

        {!loading && (
          <div className="bg-white rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">カテゴリ別</h2>
            <div className="flex flex-col gap-3">
              {categorySummaries.map(({ category, spent, advance, budget }) => {
                const combinedTotal = spent + advance
                const over = budget !== null && combinedTotal > budget
                return (
                  <div key={category.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-800">
                        {category.icon && <span className="mr-1">{category.icon}</span>}{category.name} {over && <span className="text-red-500">⚠超過</span>}
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
      </div>
    )
  }

  // ===== きゅるるんモード =====
  const balanceCardStyle = balance < 0
    ? { background: 'linear-gradient(135deg, #ef9a9a 0%, #e57373 50%, #ef5350 100%)' }
    : { background: 'linear-gradient(135deg, #f48fb1 0%, #e91e63 60%, #c2185b 100%)' }

  return (
    <div className="px-4 pt-6 pb-4" style={{ fontFamily: 'var(--font-zen-maru), sans-serif' }}>

      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <p className="text-xs" style={{ color: '#f06292' }}>こんにちは 🌸</p>
          <h1 className="text-xl font-bold" style={{ color: '#880e4f' }}>
            {currentUser?.name}さん
          </h1>
        </div>
        <span
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{ background: '#fce4ec', color: '#c2185b', border: '1.5px solid #f48fb1' }}
        >
          {monthLabel} 🗓
        </span>
      </div>

      {/* 残高カード */}
      <div
        className="rounded-3xl p-5 text-white mb-4"
        style={{ ...balanceCardStyle, boxShadow: '0 8px 24px rgba(233,30,99,0.25)' }}
      >
        <p className="text-xs opacity-85 mb-1 font-medium">✨ 今月の残高</p>
        <p className="text-4xl font-bold mb-3" style={{ letterSpacing: '-0.5px' }}>
          ¥{balance.toLocaleString()}
        </p>
        <div className="flex justify-between text-xs opacity-85">
          <span>予算 ¥{monthlyBudget.toLocaleString()}</span>
          <span className="text-right">
            支出 ¥{(total + totalAdvance).toLocaleString()}
            {totalAdvance > 0 && (
              <span className="block opacity-80">（立替 ¥{totalAdvance.toLocaleString()}）</span>
            )}
          </span>
        </div>
      </div>

      {/* 先月までの資産合計 */}
      <div
        className="rounded-2xl px-5 py-4 mb-4 flex justify-between items-center"
        style={{
          background: 'linear-gradient(135deg, #fff9c4 0%, #fff3e0 100%)',
          border: '1.5px solid #ffe082',
          boxShadow: '0 3px 12px rgba(255,193,7,0.15)',
        }}
      >
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: '#f57f17' }}>貯まった資産 🐷</p>
          <p className="text-xl font-bold" style={{ color: carryOver >= 0 ? '#e65100' : '#b71c1c' }}>
            ¥{carryOver.toLocaleString()}
          </p>
        </div>
        <span className="text-3xl">🏦</span>
      </div>

      {/* 立替アラート */}
      {unsettledAdvances.length > 0 && (
        <Link
          href="/advances"
          className="block rounded-2xl p-3 mb-4"
          style={{
            background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
            border: '1.5px solid #ffcc02',
          }}
        >
          <p className="text-sm font-bold" style={{ color: '#f57f17' }}>
            💸 未精算の立替があるよ！
          </p>
        </Link>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 mb-5">
        <Link
          href="/expenses/new"
          className="flex-1 text-center py-4 rounded-2xl font-bold text-sm text-white active:scale-95 transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #f06292 0%, #e91e63 100%)',
            boxShadow: '0 5px 15px rgba(233,30,99,0.30)',
          }}
        >
          ＋ 支出を入力 💳
        </Link>
        <Link
          href="/advances/new"
          className="flex-1 text-center py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
            border: '1.5px solid #ce93d8',
            color: '#6a1b9a',
          }}
        >
          立替を入力 🔄
        </Link>
      </div>

      {/* カテゴリ別進捗 */}
      {!loading && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: 'linear-gradient(135deg, #fff0f6 0%, #fce4ec 100%)',
            border: '1.5px solid #f8bbd0',
            boxShadow: '0 3px 12px rgba(233,30,99,0.08)',
          }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: '#880e4f' }}>
            🌸 カテゴリ別
          </h2>
          <div className="flex flex-col gap-3">
            {categorySummaries.map(({ category, spent, advance, budget }) => {
              const combinedTotal = spent + advance
              const over = budget !== null && combinedTotal > budget
              return (
                <div key={category.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold" style={{ color: over ? '#b71c1c' : '#880e4f' }}>
                      {category.icon && <span className="mr-1">{category.icon}</span>}{category.name} {over && <span>🚨超過！</span>}
                    </span>
                    <span style={{ color: over ? '#c62828' : '#ad1457' }}>
                      ¥{combinedTotal.toLocaleString()}{budget !== null ? ` / ¥${budget.toLocaleString()}` : ''}
                      {advance > 0 && <span style={{ color: '#f48fb1' }}>（立替 ¥{advance.toLocaleString()}）</span>}
                    </span>
                  </div>
                  {budget !== null && (
                    <BudgetBar spent={spent} budget={budget} advance={advance} kawaii />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
