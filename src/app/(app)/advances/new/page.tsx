'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/user-context'
import { AmountInput } from '@/components/amount-input'
import type { Category, PaymentMethod, User } from '@/types'

const PAYMENT_METHODS: PaymentMethod[] = ['現金', 'PayPay', 'カード']

export default function NewAdvancePage() {
  const { currentUser } = useUser()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [payerId, setPayerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('現金')
  const [place, setPlace] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('*').order('created_at'),
      supabase.from('categories').select('*').order('sort_order'),
    ]).then(([{ data: usersData }, { data: catsData }]) => {
      if (usersData) {
        setUsers(usersData)
        setPayerId(currentUser?.id ?? usersData[0]?.id ?? '')
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
      .from('expenses')
      .select('place')
      .ilike('place', `%${value}%`)
      .not('place', 'is', null)
      .limit(5)
    const unique = [...new Set((data ?? []).map((d) => d.place as string).filter(Boolean))]
    setPlaceSuggestions(unique)
    setShowSuggestions(unique.length > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payerId || !categoryId || !amount || !description) return
    setSubmitting(true)

    await supabase.from('advances').insert({
      payer_id: payerId,
      category_id: categoryId,
      amount: parseInt(amount),
      payment_method: paymentMethod,
      place: place || null,
      date,
      description,
      settled: false,
    })

    router.push('/home')
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 text-2xl">‹</button>
        <h1 className="text-xl font-bold text-gray-800">立替を入力</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 立替した人 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">立替した人</label>
          <div className="flex gap-3">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setPayerId(u.id)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  payerId === u.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">カテゴリ</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  categoryId === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 金額 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">金額</label>
          <AmountInput value={amount} onChange={setAmount} required />
        </div>

        {/* 支払方法 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">支払方法</label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  paymentMethod === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 場所 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-2">場所（任意）</label>
          <input
            type="text"
            value={place}
            onChange={(e) => handlePlaceChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="例：イオン、コンビニ"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showSuggestions && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-md overflow-hidden">
              {placeSuggestions.map((s) => (
                <li
                  key={s}
                  onMouseDown={() => { setPlace(s); setShowSuggestions(false) }}
                  className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 日付 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 内容（メモ） */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">内容</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：スーパーでの食料品"
            required
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !amount || !categoryId || !description}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-transform mt-2"
        >
          {submitting ? '保存中...' : '保存する'}
        </button>
      </form>
    </div>
  )
}
