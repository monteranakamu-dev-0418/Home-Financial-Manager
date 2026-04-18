'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/user-context'
import { useMode } from '@/contexts/mode-context'
import { AmountInput } from '@/components/amount-input'
import type { Category, PaymentMethod, User } from '@/types'

const PAYMENT_METHODS: PaymentMethod[] = ['現金', 'PayPay', 'カード']

export default function NewExpensePage() {
  const { currentUser } = useUser()
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [userId, setUserId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('現金')
  const [place, setPlace] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('*').order('created_at'),
      supabase.from('categories').select('*').order('sort_order'),
    ]).then(([{ data: usersData }, { data: catsData }]) => {
      if (usersData) {
        setUsers(usersData)
        setUserId(currentUser?.id ?? usersData[0]?.id ?? '')
      }
      if (catsData) {
        setCategories(catsData)
        setCategoryId(catsData[0]?.id ?? '')
      }
    })
  }, [currentUser])

  const handlePlaceChange = async (value: string) => {
    setPlace(value)
    if (value.length < 1) { setShowSuggestions(false); return }
    const { data } = await supabase
      .from('expenses').select('place')
      .ilike('place', `%${value}%`)
      .not('place', 'is', null)
      .limit(5)
    const unique = [...new Set((data ?? []).map((d) => d.place as string).filter(Boolean))]
    setPlaceSuggestions(unique)
    setShowSuggestions(unique.length > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !categoryId || !amount) return
    setSubmitting(true)
    await supabase.from('expenses').insert({
      user_id: userId, category_id: categoryId,
      amount: parseInt(amount), payment_method: paymentMethod,
      place: place || null, date, note: note || null,
    })
    router.push('/home')
  }

  // kawaii スタイルヘルパー
  const K = {
    font: isKawaii ? { fontFamily: 'var(--font-zen-maru), sans-serif' } : {},
    title: isKawaii ? '#880e4f' : '#1f2937',
    label: isKawaii ? 'text-sm font-bold mb-2' : 'block text-sm font-medium text-gray-600 mb-2',
    labelColor: isKawaii ? '#ad1457' : undefined,
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

  return (
    <div className="px-4 pt-6" style={K.font}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-2xl" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>‹</button>
        <h1 className="text-xl font-bold" style={{ color: K.title }}>
          {isKawaii ? '💳 支出を入力' : '支出を入力'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 支払った人 */}
        <div>
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>支払った人</label>
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

        {/* カテゴリ */}
        <div>
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>カテゴリ</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                className={K.selBtnClass(categoryId === cat.id)}
                style={{ ...K.selBtn(categoryId === cat.id), width: '100%' }}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 金額 */}
        <div>
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>金額</label>
          <AmountInput value={amount} onChange={setAmount} required />
        </div>

        {/* 支払方法 */}
        <div>
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>支払方法</label>
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

        {/* 場所 */}
        <div className="relative">
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>場所（任意）</label>
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
                  className="px-4 py-3 text-sm cursor-pointer"
                  style={{ color: isKawaii ? '#880e4f' : '#374151' }}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 日付 */}
        <div>
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full px-4 py-3 bg-white border rounded-xl focus:outline-none"
            style={{ borderColor: K.inputBorder }}
          />
        </div>

        {/* メモ */}
        <div>
          <label className={K.label} style={{ color: K.labelColor, display: 'block' }}>メモ（任意）</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="メモを入力"
            className="w-full px-4 py-3 bg-white border rounded-xl focus:outline-none"
            style={{ borderColor: K.inputBorder }}
          />
        </div>

        <button type="submit" disabled={submitting || !amount || !categoryId}
          className={K.saveBtnClass} style={K.saveBtn}>
          {submitting ? '保存中...' : isKawaii ? '✨ 保存する' : '保存する'}
        </button>
      </form>
    </div>
  )
}
