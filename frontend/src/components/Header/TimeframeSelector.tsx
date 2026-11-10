import { cn } from '../../utils/helpers'
import { useUIStore } from '../../stores'
import type { Timeframe } from '../../types'

interface TimeframeSelectorProps {
  className?: string
}

export function TimeframeSelector({ className }: TimeframeSelectorProps) {
  const selectedTimeframe = useUIStore((s) => s.selectedTimeframe)
  const setSelectedTimeframe = useUIStore((s) => s.setSelectedTimeframe)

  const timeframes: Timeframe[] = [
    { value: '1D', label: '1D', interval: '5m' },
    { value: '1W', label: '1W', interval: '30m' },
    { value: '1M', label: '1M', interval: '60m' },
    { value: '3M', label: '3M', interval: 'daily' },
    { value: '1Y', label: '1Y', interval: 'daily' },
    { value: 'ALL', label: 'ALL', interval: 'daily' },
  ]

  return (
    <div className={cn('flex items-center gap-1 bg-slate-900/50 border border-slate-700 rounded-lg p-1', className)}>
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => setSelectedTimeframe(tf.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
            selectedTimeframe === tf.value
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}