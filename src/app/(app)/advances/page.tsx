'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Advance } from '@/types'

export default function AdvancesPage() {
  const router = useRouter()
  const [advances, setAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data } = await supabase
      .from('advances')
      .select('*, users(name)')
      .eq('settled', false)
      .order('date', { ascending: false })
    setAdvances((data as Advance[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSettle = async (advance: Advance) => {
    await Promise.all([
      supabase.from('expenses').insert({
        user_id: advance.payer_id,
        category_id: advance.category_id,
        amount: advance.amount,
        payment_method: advance.payment_method ?? '現金',
        place: advance.place,
        date: advance.date,
        note: `立替精算: ${advance.description}`,
      }),
      supabase
        .from('advances')
        .update({ settled: true, settled_at: new Date().toISOString() })
        .eq('id', advance.id),
    ])
    await load()
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">立替</h1>
        <Link
          href="/advances/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          ＋ 追加
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">読み込み中...</div>
      ) : advances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-6xl">🎉</span>
          <p className="text-lg font-bold text-gray-700">未精算の立替はありません！</p>
          <p className="text-sm text-gray-400">やったね、クリアです</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {advances.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {(a.users as { name: string } | undefined)?.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.date}　{a.description}</p>
                </div>
                <span className="text-lg font-bold text-orange-500">
                  ¥{a.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Link
                  href={`/advances/${a.id}`}
                  className="flex-1 text-center text-xs text-blue-500 border border-blue-200 py-2 rounded-xl font-medium"
                >
                  修正
                </Link>
                <button
                  onClick={() => handleSettle(a)}
                  className="flex-1 text-center text-xs text-white bg-orange-500 py-2 rounded-xl font-semibold active:scale-95 transition-transform"
                >
                  精算
                </button>
              </div>
            </div>
          ))}

          <div className="bg-orange-50 rounded-2xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-orange-700">合計立替額</span>
            <span className="text-lg font-bold text-orange-700">
              ¥{advances.reduce((s, a) => s + a.amount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
