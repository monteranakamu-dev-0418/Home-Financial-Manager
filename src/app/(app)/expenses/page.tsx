'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Expense, Category } from '@/types'

type SortKey = 'date' | 'amount' | 'category' | 'payment' | 'user'

function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date',     label: '日付' },
  { value: 'amount',   label: '金額' },
  { value: 'category', label: 'カテゴリ' },
  { value: 'payment',  label: '支払方法' },
  { value: 'user',     label: '支払者' },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('expenses')
      .select('*, users(name), categories(name, sort_order)')
      .gte('date', `${filterMonth}-01`)
      .lt('date', nextMonthStart(filterMonth))
      .or('advance_status.is.null,advance_status.eq.settled')

    if (filterCategory !== 'all') query = query.eq('category_id', filterCategory)

    query.then(({ data }) => {
      if (data) setExpenses(data as Expense[])
      setLoading(false)
    })
  }, [filterMonth, filterCategory])

  const sorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? expenses.filter((e) =>
          (e.place ?? '').toLowerCase().includes(q) ||
          (e.note ?? '').toLowerCase().includes(q)
        )
      : expenses

    return [...filtered].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortKey === 'date') { av = a.date; bv = b.date }
      else if (sortKey === 'amount') { av = a.amount; bv = b.amount }
      else if (sortKey === 'category') {
        av = (a.categories as { name: string } | undefined)?.name ?? ''
        bv = (b.categories as { name: string } | undefined)?.name ?? ''
      }
      else if (sortKey === 'payment') { av = a.payment_method; bv = b.payment_method }
      else if (sortKey === 'user') {
        av = (a.users as { name: string } | undefined)?.name ?? ''
        bv = (b.users as { name: string } | undefined)?.name ?? ''
      }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
  }, [expenses, searchQuery, sortKey, sortAsc])

  return (
    <div className="px-4 pt-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-xl font-bold text-gray-800 shrink-0">支出一覧</h1>
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Link
          href="/expenses/new"
          className="shrink-0 bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          ＋ 追加
        </Link>
      </div>

      {/* 検索 */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="場所・メモで検索"
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
      />

      {/* フィルター＆ソート */}
      <div className="flex gap-2 mb-3">
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
        <div className="flex flex-1 gap-1">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortAsc((prev) => !prev)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 active:scale-95 transition-transform"
          >
            {sortAsc ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* 合計 */}
      <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
        <span className="text-sm text-blue-700 font-medium">合計</span>
        <span className="text-lg font-bold text-blue-700">
          ¥{sorted.reduce((s, e) => s + e.amount, 0).toLocaleString()}
        </span>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div className="text-center text-gray-400 py-10">読み込み中...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-gray-400 py-10">支出がありません</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((expense) => (
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
                  {expense.advance_status === 'settled' && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      立替
                    </span>
                  )}
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
                {expense.note && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{expense.note}</p>
                )}
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
