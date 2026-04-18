'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/user-context'
import { useMode } from '@/contexts/mode-context'
import type { Category } from '@/types'

type BudgetRow = { category_id: string; amount: string }

export default function SettingsPage() {
  const { setCurrentUser } = useUser()
  const { mode, toggleMode } = useMode()
  const isKawaii = mode === 'kawaii'
  const router = useRouter()

  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copying, setCopying] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦')
  const [addingCategory, setAddingCategory] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  useEffect(() => {
    supabase.from('budgets').select('*').eq('month', month)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const b of data ?? []) map[b.category_id] = String(b.amount)
        setBudgets(map)
      })
  }, [month])

  const handleCopyPrevMonth = async () => {
    setCopying(true)
    const [y, m] = month.split('-').map(Number)
    const prev = new Date(y, m - 2, 1)
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const { data } = await supabase.from('budgets').select('*').eq('month', prevMonth)
    if (data && data.length > 0) {
      for (const b of data) {
        await supabase.from('budgets')
          .upsert({ category_id: b.category_id, amount: b.amount, month }, { onConflict: 'category_id,month' })
      }
      const map: Record<string, string> = {}
      for (const b of data) map[b.category_id] = String(b.amount)
      setBudgets(map)
    }
    setCopying(false)
  }

  const handleSaveBudgets = async () => {
    setSaving(true)
    const rows: BudgetRow[] = categories
      .filter((c) => budgets[c.id] !== undefined && budgets[c.id] !== '')
      .map((c) => ({ category_id: c.id, amount: budgets[c.id] }))
    for (const row of rows) {
      await supabase.from('budgets')
        .upsert({ category_id: row.category_id, amount: parseInt(row.amount), month }, { onConflict: 'category_id,month' })
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
      .from('categories').insert({ name: newCategoryName.trim(), icon: newCategoryIcon, sort_order: maxOrder + 1 })
      .select().single()
    if (data) setCategories((prev) => [...prev, data])
    setNewCategoryName('')
    setNewCategoryIcon('📦')
    setAddingCategory(false)
  }

  const handleIconUpdate = async (catId: string, icon: string) => {
    await supabase.from('categories').update({ icon }).eq('id', catId)
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, icon } : c))
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

  const kFont = isKawaii ? { fontFamily: 'var(--font-zen-maru), sans-serif' } : {}
  const sectionStyle = isKawaii
    ? { background: 'linear-gradient(135deg, #fff9fc, #fce4ec)', border: '1.5px solid #fce4ec', borderRadius: '1rem' }
    : { background: 'white', borderRadius: '1rem' }
  const sectionClass = isKawaii ? 'p-4 mb-4' : 'bg-white rounded-2xl p-4 mb-4'

  return (
    <div className="px-4 pt-6 pb-4" style={kFont}>
      <h1 className="text-xl font-bold mb-6" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
        {isKawaii ? '✨ 設定' : '設定'}
      </h1>

      {/* 予算設定 */}
      <section className={sectionClass} style={sectionStyle}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold" style={{ color: isKawaii ? '#ad1457' : '#374151' }}>月次予算</h2>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-2 py-1 border rounded-lg text-xs focus:outline-none"
            style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb', background: 'white' }}
          />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3">
              <span className="text-sm w-16 shrink-0" style={{ color: isKawaii ? '#880e4f' : '#374151' }}>
                {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
              </span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>¥</span>
                <input
                  type="number" inputMode="numeric" step={1000} min={0}
                  placeholder="未設定"
                  value={budgets[cat.id] ?? ''}
                  onChange={(e) => setBudgets((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2 border rounded-xl text-sm focus:outline-none bg-white"
                  style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={handleCopyPrevMonth} disabled={copying}
            className="flex-1 border py-3 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
            style={{ borderColor: isKawaii ? '#f8bbd0' : '#e5e7eb', color: isKawaii ? '#ad1457' : '#4b5563', background: isKawaii ? 'white' : 'transparent' }}>
            {copying ? 'コピー中...' : '先月からコピー'}
          </button>
          <button onClick={handleSaveBudgets} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
            style={isKawaii
              ? { background: 'linear-gradient(135deg, #f06292, #e91e63)', boxShadow: '0 3px 10px rgba(233,30,99,0.3)' }
              : { background: '#2563eb' }}>
            {saved ? '✓ 保存' : saving ? '保存中...' : isKawaii ? '✨ 保存する' : '保存する'}
          </button>
        </div>
      </section>

      {/* カテゴリ管理 */}
      <section className={sectionClass} style={sectionStyle}>
        <h2 className="text-sm font-bold mb-3" style={{ color: isKawaii ? '#ad1457' : '#374151' }}>
          {isKawaii ? '🏷 カテゴリ管理' : 'カテゴリ管理'}
        </h2>
        <div className="flex flex-col gap-2 mb-3">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: isKawaii ? '#fff0f6' : '#f9fafb', border: isKawaii ? '1px solid #fce4ec' : 'none' }}>
              <input
                type="text"
                defaultValue={cat.icon ?? '📦'}
                onBlur={(e) => { if (e.target.value !== cat.icon) handleIconUpdate(cat.id, e.target.value) }}
                className="w-9 text-center text-lg bg-transparent border rounded-lg focus:outline-none shrink-0"
                style={{ borderColor: isKawaii ? '#f8bbd0' : '#e5e7eb' }}
                maxLength={2}
              />
              <span className="text-sm flex-1" style={{ color: isKawaii ? '#880e4f' : '#374151' }}>{cat.name}</span>
              <button onClick={() => setDeleteTarget(cat)}
                className="text-lg leading-none transition-colors shrink-0"
                style={{ color: isKawaii ? '#f8bbd0' : '#d1d5db' }}>
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryIcon}
            onChange={(e) => setNewCategoryIcon(e.target.value)}
            className="w-12 text-center text-lg border rounded-xl focus:outline-none bg-white shrink-0"
            style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}
            maxLength={2}
          />
          <input type="text" value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="新しいカテゴリ名"
            className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none bg-white"
            style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}
          />
          <button onClick={handleAddCategory}
            disabled={addingCategory || !newCategoryName.trim()}
            className="text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 shrink-0"
            style={isKawaii
              ? { background: 'linear-gradient(135deg, #f06292, #e91e63)' }
              : { background: '#2563eb' }}>
            追加
          </button>
        </div>
      </section>

      {/* モード切替 */}
      <section className={sectionClass} style={sectionStyle}>
        <h2 className="text-sm font-bold mb-3" style={{ color: isKawaii ? '#ad1457' : '#374151' }}>
          {isKawaii ? '🎀 モード' : 'モード'}
        </h2>
        <button onClick={toggleMode}
          className="w-full border py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          style={isKawaii
            ? { borderColor: '#f48fb1', color: '#c2185b', background: 'white' }
            : { borderColor: '#e5e7eb', color: '#4b5563' }}>
          {isKawaii ? '🔄 ふつうモードにもどる' : '✨ きゅるるんモードに切り替え'}
        </button>
      </section>

      {/* ユーザー切替 */}
      <section className={sectionClass} style={sectionStyle}>
        <h2 className="text-sm font-bold mb-3" style={{ color: isKawaii ? '#ad1457' : '#374151' }}>
          {isKawaii ? '👤 ユーザー' : 'ユーザー'}
        </h2>
        <button onClick={handleLogout}
          className="w-full border py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb', color: isKawaii ? '#ad1457' : '#4b5563' }}>
          ユーザーを切り替える
        </button>
      </section>

      {/* 削除確認ポップアップ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            style={isKawaii ? { border: '1.5px solid #fce4ec', ...kFont } : {}}>
            <h3 className="text-base font-bold mb-2" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
              カテゴリを削除
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              「{deleteTarget.name}」を削除しますか？<br />
              このカテゴリに紐づく支出データは残ります。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border py-3 rounded-xl text-sm font-medium"
                style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb', color: isKawaii ? '#ad1457' : '#4b5563' }}>
                キャンセル
              </button>
              <button onClick={handleDeleteCategory}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-semibold">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
