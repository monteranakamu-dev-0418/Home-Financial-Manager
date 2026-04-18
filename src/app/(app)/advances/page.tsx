'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Advance } from '@/types'

type Tab = 'unsettled' | 'settled'

export default function AdvancesPage() {
  const [tab, setTab] = useState<Tab>('unsettled')
  const [unsettled, setUnsettled] = useState<Advance[]>([])
  const [settled, setSettled] = useState<Advance[]>([])
  const [loadingUnsettled, setLoadingUnsettled] = useState(true)
  const [loadingSettled, setLoadingSettled] = useState(false)
  const [settleTarget, setSettleTarget] = useState<Advance | null>(null)

  const loadUnsettled = async () => {
    setLoadingUnsettled(true)
    const { data } = await supabase
      .from('advances')
      .select('*, users(name)')
      .eq('settled', false)
      .order('date', { ascending: false })
    setUnsettled((data as Advance[]) ?? [])
    setLoadingUnsettled(false)
  }

  const loadSettled = async () => {
    setLoadingSettled(true)
    const { data } = await supabase
      .from('advances')
      .select('*, users(name)')
      .eq('settled', true)
      .order('settled_at', { ascending: false })
      .limit(50)
    setSettled((data as Advance[]) ?? [])
    setLoadingSettled(false)
  }

  useEffect(() => { loadUnsettled() }, [])

  const handleTabChange = (next: Tab) => {
    setTab(next)
    if (next === 'settled' && settled.length === 0) loadSettled()
  }

  const handleSettle = async () => {
    if (!settleTarget) return
    await Promise.all([
      supabase.from('expenses').insert({
        user_id: settleTarget.payer_id,
        category_id: settleTarget.category_id,
        amount: settleTarget.amount,
        payment_method: settleTarget.payment_method ?? '現金',
        place: settleTarget.place,
        date: settleTarget.date,
        note: `立替精算: ${settleTarget.description}`,
      }),
      supabase
        .from('advances')
        .update({ settled: true, settled_at: new Date().toISOString() })
        .eq('id', settleTarget.id),
    ])
    setSettleTarget(null)
    await loadUnsettled()
  }

  const advances = tab === 'unsettled' ? unsettled : settled
  const loading = tab === 'unsettled' ? loadingUnsettled : loadingSettled

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">立替</h1>
        <Link
          href="/advances/new"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-medium"
        >
          ＋ 追加
        </Link>
      </div>

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => handleTabChange('unsettled')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'unsettled' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
          }`}
        >
          未精算
          {unsettled.length > 0 && (
            <span className="ml-1.5 bg-orange-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {unsettled.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('settled')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'settled' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'
          }`}
        >
          精算済
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">読み込み中...</div>
      ) : advances.length === 0 ? (
        tab === 'unsettled' ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-6xl">🎉</span>
            <p className="text-lg font-bold text-gray-700">未精算の立替はありません！</p>
            <p className="text-sm text-gray-400">やったね、クリアです</p>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-20">精算済みの記録がありません</div>
        )
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
                  {tab === 'settled' && a.settled_at && (
                    <p className="text-xs text-green-500 mt-0.5">
                      精算日: {a.settled_at.slice(0, 10)}
                    </p>
                  )}
                </div>
                <span className={`text-lg font-bold ${tab === 'settled' ? 'text-gray-400' : 'text-orange-500'}`}>
                  ¥{a.amount.toLocaleString()}
                </span>
              </div>
              {tab === 'unsettled' && (
                <div className="flex gap-2 mt-3">
                  <Link
                    href={`/advances/${a.id}`}
                    className="flex-1 text-center text-xs text-blue-500 border border-blue-200 py-2 rounded-xl font-medium"
                  >
                    修正
                  </Link>
                  <button
                    onClick={() => setSettleTarget(a)}
                    className="flex-1 text-center text-xs text-white bg-orange-500 py-2 rounded-xl font-semibold active:scale-95 transition-transform"
                  >
                    精算
                  </button>
                </div>
              )}
            </div>
          ))}

          {tab === 'unsettled' && (
            <div className="bg-orange-50 rounded-2xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-medium text-orange-700">合計立替額</span>
              <span className="text-lg font-bold text-orange-700">
                ¥{advances.reduce((s, a) => s + a.amount, 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 精算確認ダイアログ */}
      {settleTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-gray-800 mb-2">精算しますか？</h3>
            <p className="text-sm text-gray-500 mb-1">
              {(settleTarget.users as { name: string } | undefined)?.name}　{settleTarget.date}
            </p>
            <p className="text-sm text-gray-700 mb-1 font-medium">{settleTarget.description}</p>
            <p className="text-xl font-bold text-orange-500 mb-4">
              ¥{settleTarget.amount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              精算すると支出として記録されます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSettleTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleSettle}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl text-sm font-semibold"
              >
                精算する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
