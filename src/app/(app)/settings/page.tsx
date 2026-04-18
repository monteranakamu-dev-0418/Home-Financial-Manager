'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/user-context'
import type { Category } from '@/types'

type BudgetRow = { category_id: string; amount: string }

export default function SettingsPage() {
  const { setCurrentUser } = useUser()
  const router = useRouter()

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [contribution, setContribution] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('monthly_contribution') ?? '300000'
    }
    return '300000'
  })

  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  useEffect(() => {
    supabase
      .from('budgets')
      .select('*')
      .eq('month', month)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const b of data ?? []) map[b.category_id] = String(b.amount)
        setBudgets(map)
      })
  }, [month])

  const handleSaveBudgets = async () => {
    setSaving(true)
    const rows: BudgetRow[] = categories
      .filter((c) => budgets[c.id] !== undefined && budgets[c.id] !== '')
      .map((c) => ({ category_id: c.id, amount: budgets[c.id] }))

    for (const row of rows) {
      await supabase
        .from('budgets')
        .upsert(
          { category_id: row.category_id, amount: parseInt(row.amount), month },
          { onConflict: 'category_id,month' }
        )
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0)
    const { data } = await supabase
      .from('categories')
      .insert({ name: newCategoryName.trim(), sort_order: maxOrder + 1 })
      .select()
      .single()
    if (data) setCategories((prev) => [...prev, data])
    setNewCategoryName('')
    setAddingCategory(false)
  }

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return
    await supabase.from('categories').delete().eq('id', deleteTarget.id)
    setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    router.push('/')
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-800 mb-6">設定</h1>

      {/* 月次拠出設定 */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">月次拠出合計</h2>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
            <input
              type="number"
              inputMode="numeric"
              step={1000}
              min={0}
              value={contribution}
              onChange={(e) => {
                setContribution(e.target.value)
                localStorage.setItem('monthly_contribution', e.target.value)
              }}
              className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0">2人合計</span>
        </div>
      </section>

      {/* 予算設定 */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-700">月次予算</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700 w-16 shrink-0">{cat.name}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step={1000}
                  min={0}
                  placeholder="未設定"
                  value={budgets[cat.id] ?? ''}
                  onChange={(e) =>
                    setBudgets((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveBudgets}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saved ? '✓ 保存しました' : saving ? '保存中...' : '予算を保存'}
        </button>
      </section>

      {/* カテゴリ管理 */}
      <section className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">カテゴリ管理</h2>
        <div className="flex flex-col gap-2 mb-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-700">{cat.name}</span>
              <button
                onClick={() => setDeleteTarget(cat)}
                className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新しいカテゴリ名"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddCategory}
            disabled={addingCategory || !newCategoryName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </section>

      {/* ユーザー切替 */}
      <section className="bg-white rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ユーザー</h2>
        <button
          onClick={handleLogout}
          className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
        >
          ユーザーを切り替える
        </button>
      </section>

      {/* 削除確認ポップアップ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-800 mb-2">カテゴリを削除</h3>
            <p className="text-sm text-gray-500 mb-6">
              「{deleteTarget.name}」を削除しますか？<br />
              このカテゴリに紐づく支出データは残ります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteCategory}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-semibold"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
