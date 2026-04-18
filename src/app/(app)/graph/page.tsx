'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import type { Category, Expense } from '@/types'

type MonthlyData = {
  month: string
  label: string
  total: number
  [key: string]: number | string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

type Tab = 'trend' | 'pie'

type PieEntry = { name: string; value: number }

function DonutChart({ data, title }: { data: PieEntry[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{title}</p>
      {data.length === 0 ? (
        <div className="text-center text-gray-300 py-6 text-sm">データがありません</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `¥${Number(value).toLocaleString()}`,
                  String(name),
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {data.map((d, i) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
              return (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-700">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{pct}%</span>
                    <span className="font-medium text-gray-800 w-20 text-right">¥{d.value.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function GraphPage() {
  const [tab, setTab] = useState<Tab>('trend')
  const [categories, setCategories] = useState<Category[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: expenses }, { data: cats }] = await Promise.all([
        supabase.from('expenses').select('*').order('date'),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      const catList: Category[] = cats ?? []
      const expList: Expense[] = expenses ?? []
      setCategories(catList)
      setAllExpenses(expList)

      const allMonths = [...new Set(expList.map((e) => e.date.slice(0, 7)))].sort()
      const monthly: MonthlyData[] = allMonths.map((m) => {
        const monthExp = expList.filter((e) => e.date.startsWith(m))
        const row: MonthlyData = {
          month: m,
          label: `${m.split('-')[0].slice(2)}/${parseInt(m.split('-')[1])}`,
          total: monthExp.reduce((s, e) => s + e.amount, 0),
        }
        for (const cat of catList) {
          row[cat.id] = monthExp.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0)
        }
        return row
      })
      setMonthlyData(monthly)
      setLoading(false)
    }
    load()
  }, [])

  // 月別円グラフデータ
  const monthPieData = useMemo<PieEntry[]>(() => {
    const row = monthlyData.find((d) => d.month === selectedMonth)
    if (!row) return []
    return categories
      .map((cat) => ({ name: cat.name, value: (row[cat.id] as number) ?? 0 }))
      .filter((d) => d.value > 0)
  }, [selectedMonth, monthlyData, categories])

  // 年別円グラフデータ
  const yearPieData = useMemo<PieEntry[]>(() => {
    const yearExp = allExpenses.filter((e) => e.date.startsWith(selectedYear))
    return categories
      .map((cat) => ({
        name: cat.name,
        value: yearExp.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0),
      }))
      .filter((d) => d.value > 0)
  }, [selectedYear, allExpenses, categories])

  // 利用可能な年リスト
  const availableYears = useMemo(() => {
    return [...new Set(allExpenses.map((e) => e.date.slice(0, 4)))].sort().reverse()
  }, [allExpenses])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'trend', label: '推移' },
    { key: 'pie', label: '内訳' },
  ]

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">グラフ</h1>

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">読み込み中...</div>
      ) : monthlyData.length === 0 ? (
        <div className="text-center text-gray-400 py-16">データがありません</div>
      ) : (
        <>
          {/* 推移タブ：カテゴリ別 + 月次推移 */}
          {tab === 'trend' && (
            <div className="flex flex-col gap-4">
              {/* カテゴリ別推移 */}
              <div className="bg-white rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-gray-600 mb-3">カテゴリ別推移</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                      width={34}
                    />
                    <Tooltip
                      formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, String(name)]}
                      labelStyle={{ fontSize: 12 }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    {categories.map((cat, i) => (
                      <Line
                        key={cat.id}
                        type="monotone"
                        dataKey={cat.id}
                        name={cat.name}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {categories.map((cat, i) => (
                    <div key={cat.id} className="flex items-center gap-1 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* 月次推移（全体） */}
              <div className="bg-white rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-gray-600 mb-3">月次推移（全体）</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                      width={34}
                    />
                    <Tooltip
                      formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      labelStyle={{ fontSize: 12 }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 内訳タブ：月別 + 年別ドーナツ */}
          {tab === 'pie' && (
            <div className="flex flex-col gap-4">
              {/* 月別内訳 */}
              <div className="bg-white rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold text-gray-600">月別内訳</h2>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
                <DonutChart
                  data={monthPieData}
                  title={`${parseInt(selectedMonth.split('-')[1])}月のカテゴリ内訳`}
                />
              </div>

              {/* 年別内訳 */}
              <div className="bg-white rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold text-gray-600">年別内訳</h2>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                </div>
                <DonutChart
                  data={yearPieData}
                  title={`${selectedYear}年のカテゴリ内訳`}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
