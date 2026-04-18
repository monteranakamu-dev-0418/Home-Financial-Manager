'use client'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function AmountInput({ value, onChange, placeholder = '0', required }: Props) {
  const handleStep = (delta: number) => {
    const current = parseInt(value) || 0
    const next = Math.max(0, current + delta)
    onChange(String(next))
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleStep(-1000)}
        className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 text-lg font-bold flex items-center justify-center active:scale-95 transition-transform shrink-0"
      >
        −
      </button>
      <div className="relative flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <button
        type="button"
        onClick={() => handleStep(1000)}
        className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 text-lg font-bold flex items-center justify-center active:scale-95 transition-transform shrink-0"
      >
        ＋
      </button>
    </div>
  )
}
