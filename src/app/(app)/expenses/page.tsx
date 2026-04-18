'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Expense, Category } from '@/types'

function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  useEffect(() => {
    let query = supabase
      .from('expenses')
      .select('*, users(name), categories(name, sort_order)')
      .gte('date', `${filterMonth}-01`)
      .lt('date', nextMonthStart(filterMonth))
      .order('date', { ascending: false })

    if (filterCategory !== 'all') query = query.eq('category_id', filterCategory)
    if (filterPayment !== 'all') query = query.eq('payment_method', filterPayment)

    query.then(({ data }) => {
      if (data) setExpenses(data as Expense[])
      setLoading(false)
    })
  }, [filterMonth, filterCategory, filterPayment])

  return (
    <div className="px-4 pt-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">支出一覧</h1>
        <Link
          href="/expenses/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          ＋ 追加
        </Link>
      </div>

      {/* フィルター */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
          >
            <option value="all">全カテゴリ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
          >
            <option value="all">全支払方法</option>
            <option value="現金">現金</option>
            <option value="PayPay">PayPay</option>
            <option value="カード">カード</option>
          </select>
        </div>
      </div>

      {/* 合計 */}
      <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-sm text-blue-700 font-medium">合計</span>
        <span className="text-lg font-bold text-blue-700">
          ¥{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
        </span>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="text-center text-gray-400 py-10">読み込み中...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center text-gray-400 py-10">支出がありません</div>
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {(expense.categories as { name: string } | undefined)?.name}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {expense.payment_method}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{expense.date}</span>
                  {expense.place && (
                    <span className="text-xs text-gray-500 truncate">{expense.place}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {(expense.users as { name: string } | undefined)?.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-2">
                <span className="font-semibold text-gray-800">¥{expense.amount.toLocaleString()}</span>
                <Link
                  href={`/expenses/${expense.id}`}
                  className="text-xs text-blue-500 border border-blue-200 px-2 py-1 rounded-lg"
                >
                  修正
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
