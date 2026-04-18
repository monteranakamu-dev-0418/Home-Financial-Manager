'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useMode } from '@/contexts/mode-context'
import { AmountInput } from '@/components/amount-input'
import type { Category, PaymentMethod, User } from '@/types'

const PAYMENT_METHODS: PaymentMethod[] = ['現金', 'PayPay', 'カード']

export default function EditAdvancePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'

  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [userId, setUserId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('現金')
  const [place, setPlace] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('*').order('created_at'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('expenses').select('*').eq('id', id).single(),
    ]).then(([{ data: usersData }, { data: cats }, { data: expense }]) => {
      if (usersData) setUsers(usersData)
      if (cats) setCategories(cats)
      if (expense) {
        setUserId(expense.user_id)
        setCategoryId(expense.category_id)
        setAmount(String(expense.amount))
        setPaymentMethod((expense.payment_method ?? '現金') as PaymentMethod)
        setPlace(expense.place ?? '')
        setDate(expense.date)
        setNote(expense.note ?? '')
      }
      setLoading(false)
    })
  }, [id])

  const handlePlaceChange = async (value: string) => {
    setPlace(value)
    if (value.length < 1) { setShowSuggestions(false); return }
    const { data } = await supabase
      .from('expenses').select('place')
      .ilike('place', `%${value}%`)
      .not('place', 'is', null).limit(5)
    const unique = [...new Set((data ?? []).map((d) => d.place as string).filter(Boolean))]
    setPlaceSuggestions(unique)
    setShowSuggestions(unique.length > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !categoryId || !amount || !note) return
    setSubmitting(true)
    await supabase.from('expenses').update({
      user_id: userId, category_id: categoryId,
      amount: parseInt(amount), payment_method: paymentMethod,
      place: place || null, date, note,
    }).eq('id', id)
    router.push('/advances')
  }

  const handleDelete = async () => {
    await supabase.from('expenses').delete().eq('id', id)
    router.push('/advances')
  }

  const K = {
    font: isKawaii ? { fontFamily: 'var(--font-zen-maru), sans-serif' } : {},
    title: isKawaii ? '#880e4f' : '#1f2937',
    labelColor: isKawaii ? '#ad1457' : '#4b5563',
    inputBorder: isKawaii ? '#fce4ec' : '#e5e7eb',
    selBtn: (active: boolean): React.CSSProperties => active
      ? isKawaii
        ? { background: 'linear-gradient(135deg, #f06292, #e91e63)', color: 'white', border: 'none', boxShadow: '0 3px 10px rgba(233,30,99,0.3)', borderRadius: '0.75rem' }
        : {}
      : isKawaii
        ? { background: 'white', border: '1.5px solid #fce4ec', color: '#880e4f', borderRadius: '0.75rem' }
        : {},
    selBtnClass: (active: boolean) => active
      ? (isKawaii ? 'py-3 text-sm font-bold transition-all active:scale-95' : 'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors bg-blue-600 text-white')
      : (isKawaii ? 'py-3 text-sm font-semibold transition-all active:scale-95' : 'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors bg-white border border-gray-200 text-gray-700'),
    saveBtn: isKawaii
      ? { background: 'linear-gradient(135deg, #f06292, #e91e63)', boxShadow: '0 5px 15px rgba(233,30,99,0.35)', color: 'white', borderRadius: '1rem' }
      : {},
    saveBtnClass: isKawaii
      ? 'w-full py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all mt-2'
      : 'w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform mt-2',
  }

  if (loading) return (
    <div className="text-center py-20" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af', ...K.font }}>
      {isKawaii ? 'よみこみちゅう…💭' : '読み込み中...'}
    </div>
  )

  return (
    <div className="px-4 pt-6" style={K.font}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-2xl" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>‹</button>
        <h1 className="text-xl font-bold" style={{ color: K.title }}>
          {isKawaii ? '✏️ 立替を修正' : '立替を修正'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>立替した人</label>
          <div className="flex gap-3">
            {users.map((u) => (
              <button key={u.id} type="button" onClick={() => setUserId(u.id)}
                className={`flex-1 ${K.selBtnClass(userId === u.id)}`}
                style={K.selBtn(userId === u.id)}>
                {u.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>カテゴリ</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                className={K.selBtnClass(categoryId === cat.id)}
                style={{ ...K.selBtn(categoryId === cat.id), width: '100%' }}>
                {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>金額</label>
          <AmountInput value={amount} onChange={setAmount} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>支払方法</label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 ${K.selBtnClass(paymentMethod === m)}`}
                style={K.selBtn(paymentMethod === m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>場所（任意）</label>
          <input type="text" value={place}
            onChange={(e) => handlePlaceChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="例：イオン、コンビニ"
            className="w-full px-4 py-3 bg-white border rounded-xl focus:outline-none"
            style={{ borderColor: K.inputBorder }}
          />
          {showSuggestions && (
            <ul className="absolute z-10 w-full bg-white border rounded-xl mt-1 shadow-md overflow-hidden"
              style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}>
              {placeSuggestions.map((s) => (
                <li key={s} onMouseDown={() => { setPlace(s); setShowSuggestions(false) }}
                  className="px-4 py-3 text-sm cursor-pointer" style={{ color: isKawaii ? '#880e4f' : '#374151' }}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full px-4 py-3 bg-white border rounded-xl focus:outline-none"
            style={{ borderColor: K.inputBorder }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: K.labelColor }}>内容</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="例：スーパーでの食料品" required
            className="w-full px-4 py-3 bg-white border rounded-xl focus:outline-none"
            style={{ borderColor: K.inputBorder }}
          />
        </div>

        <button type="submit" disabled={submitting || !amount || !categoryId || !note}
          className={K.saveBtnClass} style={K.saveBtn}>
          {submitting ? '保存中...' : isKawaii ? '✨ 保存する' : '保存する'}
        </button>
      </form>

      <button onClick={() => setShowDeleteModal(true)}
        className="w-full mt-3 mb-8 border py-4 rounded-2xl font-semibold text-base active:scale-95 transition-transform"
        style={isKawaii
          ? { borderColor: '#f48fb1', color: '#c2185b', background: '#fff0f6' }
          : { borderColor: '#fca5a5', color: '#ef4444' }}>
        {isKawaii ? '🗑 削除する' : '削除する'}
      </button>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            style={isKawaii ? { border: '1.5px solid #fce4ec', ...K.font } : {}}>
            <h2 className="text-base font-bold mb-2" style={{ color: K.title }}>立替を削除しますか？</h2>
            <p className="text-sm text-gray-500 mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl border text-sm font-medium"
                style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb', color: isKawaii ? '#ad1457' : '#4b5563' }}>
                キャンセル
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
