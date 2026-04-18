'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useMode } from '@/contexts/mode-context'
import type { Category, Expense } from '@/types'

type MonthlyData = {
  month: string
  label: string
  total: number
  [key: string]: number | string
}

const NORMAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const KAWAII_COLORS = ['#f06292', '#ce93d8', '#80cbc4', '#ffb74d', '#a5d6a7', '#81d4fa', '#f48fb1', '#b39ddb']

type Tab = 'trend' | 'pie'
type PieEntry = { name: string; value: number }

function DonutChart({
  data, title, colors, isKawaii,
}: {
  data: PieEntry[]
  title: string
  colors: string[]
  isKawaii: boolean
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: isKawaii ? '#ad1457' : '#6b7280' }}>{title}</p>
      {data.length === 0 ? (
        <div className="text-center py-6 text-sm" style={{ color: isKawaii ? '#f8bbd0' : '#d1d5db' }}>
          {isKawaii ? 'データがないよ 🌸' : 'データがありません'}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={2} dataKey="value"
                startAngle={90} endAngle={-270}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, String(name)]}
                contentStyle={{
                  fontSize: 12, borderRadius: 8,
                  borderColor: isKawaii ? '#fce4ec' : '#e5e7eb',
                  fontFamily: isKawaii ? 'var(--font-zen-maru), sans-serif' : undefined,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {data.map((d, i) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
              return (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: colors[i % colors.length] }} />
                    <span style={{ color: isKawaii ? '#880e4f' : '#374151' }}>{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span style={{ color: isKawaii ? '#f48fb1' : '#6b7280' }}>{pct}%</span>
                    <span className="font-medium w-20 text-right"
                      style={{ color: isKawaii ? '#c2185b' : '#1f2937' }}>
                      ¥{d.value.toLocaleString()}
                    </span>
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
  const { mode } = useMode()
  const isKawaii = mode === 'kawaii'
  const COLORS = isKawaii ? KAWAII_COLORS : NORMAL_COLORS

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
      setMonthlyData(allMonths.map((m) => {
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
      }))
      setLoading(false)
    }
    load()
  }, [])

  const monthPieData = useMemo<PieEntry[]>(() => {
    const row = monthlyData.find((d) => d.month === selectedMonth)
    if (!row) return []
    return categories
      .map((cat) => ({ name: cat.name, value: (row[cat.id] as number) ?? 0 }))
      .filter((d) => d.value > 0)
  }, [selectedMonth, monthlyData, categories])

  const yearPieData = useMemo<PieEntry[]>(() => {
    const yearExp = allExpenses.filter((e) => e.date.startsWith(selectedYear))
    return categories
      .map((cat) => ({
        name: cat.name,
        value: yearExp.filter((e) => e.category_id === cat.id).reduce((s, e) => s + e.amount, 0),
      }))
      .filter((d) => d.value > 0)
  }, [selectedYear, allExpenses, categories])

  const availableYears = useMemo(() =>
    [...new Set(allExpenses.map((e) => e.date.slice(0, 4)))].sort().reverse(),
    [allExpenses]
  )

  const kFont = isKawaii ? { fontFamily: 'var(--font-zen-maru), sans-serif' } : {}
  const cardStyle = isKawaii
    ? { background: 'linear-gradient(135deg, #fff9fc, #fce4ec)', border: '1.5px solid #f8bbd0', borderRadius: '1rem' }
    : { background: 'white', borderRadius: '1rem' }
  const gridColor = isKawaii ? '#fce4ec' : '#f0f0f0'
  const tooltipStyle = {
    fontSize: 12, borderRadius: 8,
    borderColor: isKawaii ? '#fce4ec' : '#e5e7eb',
    fontFamily: isKawaii ? 'var(--font-zen-maru), sans-serif' : undefined,
  }

  return (
    <div className="px-4 pt-6 pb-4" style={kFont}>
      <h1 className="text-xl font-bold mb-4" style={{ color: isKawaii ? '#880e4f' : '#1f2937' }}>
        {isKawaii ? '📊 グラフ' : 'グラフ'}
      </h1>

      {/* タブ */}
      <div className="flex rounded-xl p-1 mb-5"
        style={{ background: isKawaii ? '#fce4ec' : '#f3f4f6' }}>
        {([{ key: 'trend', label: '推移' }, { key: 'pie', label: '内訳' }] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={tab === t.key
              ? { background: 'white', color: isKawaii ? '#880e4f' : '#2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: isKawaii ? '#f48fb1' : '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
          {isKawaii ? 'よみこみちゅう…💭' : '読み込み中...'}
        </div>
      ) : monthlyData.length === 0 ? (
        <div className="text-center py-16" style={{ color: isKawaii ? '#f48fb1' : '#9ca3af' }}>
          {isKawaii ? 'データがないよ 🌸' : 'データがありません'}
        </div>
      ) : (
        <>
          {/* 推移タブ */}
          {tab === 'trend' && (
            <div className="flex flex-col gap-4">
              {/* カテゴリ別推移 */}
              <div className="p-4" style={cardStyle}>
                <h2 className="text-sm font-bold mb-3" style={{ color: isKawaii ? '#ad1457' : '#4b5563' }}>
                  {isKawaii ? '🌈 カテゴリ別推移' : 'カテゴリ別推移'}
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: isKawaii ? '#f48fb1' : '#6b7280' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: isKawaii ? '#f48fb1' : '#6b7280' }}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                      width={34}
                    />
                    <Tooltip
                      formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, String(name)]}
                      labelStyle={{ fontSize: 12 }}
                      contentStyle={tooltipStyle}
                    />
                    {categories.map((cat, i) => (
                      <Line
                        key={cat.id}
                        type="monotone"
                        dataKey={cat.id}
                        name={cat.name}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={isKawaii ? 2.5 : 2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {categories.map((cat, i) => (
                    <div key={cat.id} className="flex items-center gap-1 text-xs"
                      style={{ color: isKawaii ? '#880e4f' : '#4b5563' }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* 月次推移（全体） */}
              <div className="p-4" style={cardStyle}>
                <h2 className="text-sm font-bold mb-3" style={{ color: isKawaii ? '#ad1457' : '#4b5563' }}>
                  {isKawaii ? '📈 月次推移（全体）' : '月次推移（全体）'}
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: isKawaii ? '#f48fb1' : '#6b7280' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: isKawaii ? '#f48fb1' : '#6b7280' }}
                      tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                      width={34}
                    />
                    <Tooltip
                      formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支出']}
                      labelStyle={{ fontSize: 12 }}
                      contentStyle={tooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={isKawaii ? '#e91e63' : '#3b82f6'}
                      strokeWidth={isKawaii ? 3 : 2}
                      dot={{ r: 3, fill: isKawaii ? '#e91e63' : '#3b82f6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 内訳タブ */}
          {tab === 'pie' && (
            <div className="flex flex-col gap-4">
              {/* 月別内訳 */}
              <div className="p-4" style={cardStyle}>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold" style={{ color: isKawaii ? '#ad1457' : '#4b5563' }}>
                    {isKawaii ? '🌸 月別内訳' : '月別内訳'}
                  </h2>
                  <input type="month" value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 border rounded-lg text-xs focus:outline-none"
                    style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}
                  />
                </div>
                <DonutChart
                  data={monthPieData}
                  title={`${parseInt(selectedMonth.split('-')[1])}月のカテゴリ内訳`}
                  colors={COLORS}
                  isKawaii={isKawaii}
                />
              </div>

              {/* 年別内訳 */}
              <div className="p-4" style={cardStyle}>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold" style={{ color: isKawaii ? '#ad1457' : '#4b5563' }}>
                    {isKawaii ? '🌟 年別内訳' : '年別内訳'}
                  </h2>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-2 py-1 border rounded-lg text-xs focus:outline-none"
                    style={{ borderColor: isKawaii ? '#fce4ec' : '#e5e7eb' }}>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                </div>
                <DonutChart
                  data={yearPieData}
                  title={`${selectedYear}年のカテゴリ内訳`}
                  colors={COLORS}
                  isKawaii={isKawaii}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
