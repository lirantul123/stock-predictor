import { useMemo } from 'react'
import { cn } from '@/utils/helpers'

interface MLControlsProps {
  horizon: number
  onHorizonChange: (days: number) => void
  className?: string
}

const PRESETS = [1, 5, 10, 30] as const
const MIN_HORIZON = 1
const MAX_HORIZON = 30

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Business days (Mon–Fri) between today and the target date, clamped to the model range. */
function businessDaysUntil(isoDate: string): number | null {
  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (target <= today) return null

  let days = 0
  const cursor = new Date(today)
  while (cursor < target && days < 400) {
    cursor.setDate(cursor.getDate() + 1)
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) days += 1
  }
  return days
}

export function MLControls({ horizon, onHorizonChange, className }: MLControlsProps) {
  const today = useMemo(() => toISODate(new Date()), [])
  const maxDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return toISODate(d)
  }, [])

  const handleDate = (isoDate: string) => {
    const days = businessDaysUntil(isoDate)
    if (days == null) return
    onHorizonChange(Math.min(Math.max(days, MIN_HORIZON), MAX_HORIZON))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Horizon</span>
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-700/70 bg-slate-950/60 p-0.5">
          {PRESETS.map((d) => (
            <button
              key={d}
              onClick={() => onHorizonChange(d)}
              aria-pressed={horizon === d}
              className={cn(
                'min-h-8 rounded-md px-2 py-1.5 font-mono text-[11px] font-medium transition-colors',
                horizon === d
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="ml-target-date"
          className="text-[10px] font-medium uppercase tracking-wider text-slate-500"
        >
          Target date
        </label>
        <input
          id="ml-target-date"
          type="date"
          min={today}
          max={maxDate}
          onChange={(e) => handleDate(e.target.value)}
          className="min-h-8 rounded-lg border border-slate-700/70 bg-slate-950/60 px-2 py-1.5 font-mono text-[11px] text-slate-300 outline-none transition-colors [color-scheme:dark] focus:border-primary-500/60"
        />
      </div>

      <span className="font-mono text-[10px] text-slate-600">max {MAX_HORIZON}d</span>
    </div>
  )
}

export { MAX_HORIZON, MIN_HORIZON }