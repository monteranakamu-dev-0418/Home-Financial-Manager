type Props = {
  spent: number
  budget: number
  advance?: number
  kawaii?: boolean
}

export function BudgetBar({ spent, budget, advance = 0, kawaii = false }: Props) {
  const total = spent + advance
  const spentPct = Math.min((spent / budget) * 75, 100)
  const advancePct = Math.min((total / budget) * 75, 100) - spentPct
  const over = total > budget

  if (kawaii) {
    return (
      <div className="relative h-2.5 rounded-full overflow-visible mx-1" style={{ background: '#fce4ec' }}>
        <div
          className="absolute h-full rounded-l-full transition-all"
          style={{
            width: `${spentPct}%`,
            background: over
              ? 'linear-gradient(90deg, #ef9a9a, #e53935)'
              : 'linear-gradient(90deg, #f48fb1, #e91e63)',
          }}
        />
        {advance > 0 && (
          <div
            className="absolute h-full transition-all"
            style={{ left: `${spentPct}%`, width: `${advancePct}%`, background: '#ce93d8' }}
          />
        )}
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: '75%', borderLeft: '1.5px dashed #f48fb1' }}
        />
      </div>
    )
  }

  return (
    <div className="relative h-2 bg-gray-100 rounded-full overflow-visible mx-1">
      <div
        className={`absolute h-full rounded-l-full transition-all ${over ? 'bg-red-400' : 'bg-blue-400'}`}
        style={{ width: `${spentPct}%` }}
      />
      {advance > 0 && (
        <div
          className="absolute h-full bg-gray-400 transition-all"
          style={{ left: `${spentPct}%`, width: `${advancePct}%` }}
        />
      )}
      <div
        className="absolute top-0 h-full w-px border-l border-dashed border-gray-300"
        style={{ left: '75%' }}
      />
    </div>
  )
}
