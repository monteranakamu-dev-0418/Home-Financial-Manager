type Props = {
  spent: number
  budget: number
  advance?: number
}

export function BudgetBar({ spent, budget, advance = 0 }: Props) {
  const total = spent + advance
  const spentPct = Math.min((spent / budget) * 75, 100)
  const advancePct = Math.min((total / budget) * 75, 100) - spentPct
  const over = total > budget

  return (
    <div className="relative h-2 bg-gray-100 rounded-full overflow-visible mx-1">
      {/* 通常支出バー（青） */}
      <div
        className={`absolute h-full rounded-l-full transition-all ${over ? 'bg-red-400' : 'bg-blue-400'}`}
        style={{ width: `${spentPct}%` }}
      />
      {/* 立替分バー（灰色、青の右隣） */}
      {advance > 0 && (
        <div
          className="absolute h-full bg-gray-400 transition-all"
          style={{ left: `${spentPct}%`, width: `${advancePct}%` }}
        />
      )}
      {/* 75%ライン＝予算金額 */}
      <div
        className="absolute top-0 h-full w-px border-l border-dashed border-gray-300"
        style={{ left: '75%' }}
      />
    </div>
  )
}
