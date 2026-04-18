'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import { useMode } from '@/contexts/mode-context'
import type { Expense } from '@/types'

type Tab = 'unsettled' | 'settled'

export default function AdvancesPage() {
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'

  const [tab, setTab] = useState<Tab>('unsettled')
  const [unsettled, setUnsettled] = useState<Expense[]>([])
  const [settled, setSettled] = useState<Expense[]>([])
  const [loadingUnsettled, setLoadingUnsettled] = useState(true)
  const [loadingSettled, setLoadingSettled] = useState(false)
  const [settleTarget, setSettleTarget] = useState<Expense | null>(null)

  const loadUnsettled = async () => {
    setLoadingUnsettled(true)
    const { data } = await supabase
      .from('expenses').select('*, users(name)')
      .eq('advance_status', 'unsettled')
      .order('date', { ascending: false })
    setUnsettled((data as Expense[]) ?? [])
    setLoadingUnsettled(false)
  }

  const loadSettled = async () => {
    setLoadingSettled(true)
    const { data } = await supabase
      .from('expenses').select('*, users(name)')
      .eq('advance_status', 'settled')
      .order('settled_at', { ascending: false }).limit(50)
    setSettled((data as Expense[]) ?? [])
    setLoadingSettled(false)
  }

  useEffect(() => { loadUnsettled() }, [])

  const handleTabChange = (next: Tab) => {
    setTab(next)
    if (next === 'settled' && settled.length === 0) loadSettled()
  }

  const handleSettle = async () => {
    if (!settleTarget) return
    await supabase.from('expenses')
      .update({ advance_status: 'settled', settled_at: new Date().toISOString() })
      .eq('id', settleTarget.id)
    if (isKawaii) {
      const canvas = document.createElement('canvas')
      Object.assign(canvas.style, {
        position: 'fixed', inset: '0', width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '99999',
      })
      document.body.appendChild(canvas)
      const fire = confetti.create(canvas, { resize: true, useWorker: false })
      fire({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#f48fb1', '#ce93d8', '#80cbc4', '#fff176', '#f06292'],
      })
      await new Promise((r) => setTimeout(r, 1200))
      canvas.remove()
    }
    setSettleTarget(null)
    await loadUnsettled()
  }

  const advances = tab === 'unsettled' ? unsettled : settled
  const loading = tab === 'unsettled' ? loadingUnsettled : loadingSettled
  const kFont = isKawaii ? { fontFamily: 'var(--font-zen-maru), sans-serif' } : {}

  return (
    <div className="px-4 pt-6 pb-4" style={kFont}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
          {isKawaii ? '💸 立替' : '立替'}
        </h1>
        <Link href="/advances/new"
          className="text-white text-sm px-4 py-2 rounded-full font-medium"
          style={isKawaii
            ? { background: 'linear-gradient(135deg, #f06292, #e91e63)', boxShadow: '0 3px 10px rgba(233,30,99,0.3)' }
            : { background: '#2563eb' }}>
          ＋ 追加
        </Link>
      </div>

      {/* タブ */}
      <div className="flex rounded-xl p-1 mb-4"
        style={{ background: isKawaii ? '#fce4ec' : '#f3f4f6' }}>
        <button
          onClick={() => handleTabChange('unsettled')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={tab === 'unsettled'
            ? { background: 'white', color: isKawaii ? '#880e4f' : '#1f2937', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
          未精算
          {unsettled.length > 0 && (
            <span className="ml-1.5 text-white text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: isKawaii ? '#e91e63' : '#f97316' }}>
              {unsettled.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('settled')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={tab === 'settled'
            ? { background: 'white', color: isKawaii ? '#880e4f' : '#1f2937', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
          精算済
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
          {isKawaii ? 'よみこみちゅう…💭' : '読み込み中...'}
        </div>
      ) : advances.length === 0 ? (
        tab === 'unsettled' ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-6xl">🎉</span>
            <p className="text-lg font-bold" style={{ color: isKawaii ? '#880e4f' : '#374151' }}>
              {isKawaii ? '立替ゼロ！えらい！🌸' : '未精算の立替はありません！'}
            </p>
            <p className="text-sm" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
              {isKawaii ? 'やったね、クリアだよ✨' : 'やったね、クリアです'}
            </p>
          </div>
        ) : (
          <div className="text-center py-20" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
            精算済みの記録がありません
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {advances.map((a) => (
            <div key={a.id} className="rounded-2xl p-4"
              style={isKawaii
                ? { background: 'linear-gradient(135deg, #fff9fc, #fce4ec)', border: '1.5px solid #f8bbd0', boxShadow: '0 3px 10px rgba(233,30,99,0.08)' }
                : { background: 'white' }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
                    {(a.users as { name: string } | undefined)?.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
                    {a.date}　{a.note}
                  </p>
                  {tab === 'settled' && a.settled_at && (
                    <p className="text-xs mt-0.5" style={{ color: isKawaii ? '#ce93d8' : '#22c55e' }}>
                      精算日: {a.settled_at.slice(0, 10)}
                    </p>
                  )}
                </div>
                <span className="text-lg font-bold"
                  style={{ color: tab === 'settled' ? (isKawaii ? '#f48fb1' : '#9ca3af') : (isKawaii ? '#e91e63' : '#f97316') }}>
                  ¥{a.amount.toLocaleString()}
                </span>
              </div>
              {tab === 'unsettled' && (
                <div className="flex gap-2 mt-3">
                  <Link href={`/advances/${a.id}`}
                    className="flex-1 text-center text-xs border py-2 rounded-xl font-medium"
                    style={isKawaii
                      ? { color: '#c2185b', borderColor: '#f48fb1' }
                      : { color: '#3b82f6', borderColor: '#bfdbfe' }}>
                    修正
                  </Link>
                  <button onClick={() => setSettleTarget(a)}
                    className="flex-1 text-center text-xs text-white py-2 rounded-xl font-semibold active:scale-95 transition-transform"
                    style={isKawaii
                      ? { background: 'linear-gradient(135deg, #f06292, #e91e63)', boxShadow: '0 2px 8px rgba(233,30,99,0.25)' }
                      : { background: '#f97316' }}>
                    {isKawaii ? '✅ 精算' : '精算'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {tab === 'unsettled' && (
            <div className="rounded-2xl px-4 py-3 flex justify-between items-center"
              style={isKawaii
                ? { background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)', border: '1.5px solid #f48fb1' }
                : { background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <span className="text-sm font-bold" style={{ color: isKawaii ? '#880e4f' : '#c2410c' }}>
                {isKawaii ? '💰 合計立替額' : '合計立替額'}
              </span>
              <span className="text-lg font-bold" style={{ color: isKawaii ? '#880e4f' : '#c2410c' }}>
                ¥{advances.reduce((s, a) => s + a.amount, 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 精算確認ダイアログ */}
      {settleTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            style={isKawaii ? { border: '1.5px solid #fce4ec', ...kFont } : {}}>
            <h3 className="text-base font-bold mb-2" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
              {isKawaii ? '✅ 精算しますか？' : '精算しますか？'}
            </h3>
            <p className="text-sm mb-1" style={{ color: isKawaii ? '#ad1457' : '#6b7280' }}>
              {(settleTarget.users as { name: string } | undefined)?.name}　{settleTarget.date}
            </p>
            <p className="text-sm mb-1 font-medium" style={{ color: isKawaii ? '#880e4f' : '#374151' }}>
              {settleTarget.note}
            </p>
            <p className="text-xl font-bold mb-4" style={{ color: isKawaii ? '#e91e63' : '#f97316' }}>
              ¥{settleTarget.amount.toLocaleString()}
            </p>
            <p className="text-xs mb-6" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
              精算済みに移動します。支出の二重登録は起きません。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSettleTarget(null)}
                className="flex-1 border py-3 rounded-xl text-sm font-medium"
                style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb', color: isKawaii ? '#ad1457' : '#4b5563' }}>
                キャンセル
              </button>
              <button onClick={handleSettle}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={isKawaii
                  ? { background: 'linear-gradient(135deg, #f06292, #e91e63)' }
                  : { background: '#f97316' }}>
                精算する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
