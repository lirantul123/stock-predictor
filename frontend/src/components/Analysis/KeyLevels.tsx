import { cn, clamp, formatPrice, formatVolume } from '@/utils/helpers'
import type { PricePoint, TechnicalIndicators } from '@/types'

interface KeyLevelsProps {
  history: PricePoint[] | undefined
  indicators: TechnicalIndicators | null
  className?: string
}

export function KeyLevels({ history, indicators, className }: KeyLevelsProps) {
  if (!history || history.length < 2) {
    return (
      <div className={cn('rounded-xl border border-slate-800/70 bg-slate-950/40 p-4', className)}>
        <div className="mb-3 h-3 w-24 animate-pulse rounded-full bg-slate-800/60" />
        <div className="h-2 w-full rounded-full bg-slate-800/60 animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const recent = history.slice(-252)
  const high52 = Math.max(...recent.map((p) => p.high))
  const low52 = Math.min(...recent.map((p) => p.low))
  const high20 = Math.max(...history.slice(-20).map((p) => p.high))
  const low20 = Math.min(...history.slice(-20).map((p) => p.low))
  const current = history[history.length - 1].close
  const range = Math.max(high52 - low52, 0.0001)
  const rangePosition = clamp(((current - low52) / range) * 100, 0, 100)
  const averageVolume = Math.round(
    history.slice(-20).reduce((sum, p) => sum + p.volume, 0) / Math.min(20, history.length)
  )
  const atrPercent = indicators?.atr ? (indicators.atr / current) * 100 : null
  const toHigh = ((high52 - current) / current) * 100
  const aboveLow = ((current - low52) / current) * 100

  return (
    <div className={cn('rounded-xl border border-slate-800/70 bg-slate-950/40 p-4', className)}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Key Levels · 52W</h3>

      <div>
        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="text-slate-500">Range Low <span className="text-slate-300 font-mono">{formatPrice(low52)}</span></span>
          <span className="text-slate-500">Range High <span className="text-slate-300 font-mono">{formatPrice(high52)}</span></span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary-600/70 to-primary-400/70"
            style={{ width: `${rangePosition}%` }}
          />
          <div
            className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow shadow-black/40"
            style={{ left: `${rangePosition}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
          <span>Last {formatPrice(current)}</span>
          <span>{rangePosition.toFixed(0)}% of range</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <Stat label="Recent Low" value={formatPrice(low20)} />
        <Stat label="Recent High" value={formatPrice(high20)} />
        <Stat label="ATR (14)" value={atrPercent ? `${atrPercent.toFixed(2)}%` : '--'} />
        <Stat label="Avg Volume" value={formatVolume(averageVolume)} />
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Stat label="To Range High" value={`${toHigh >= 0 ? '+' : ''}${toHigh.toFixed(1)}%`} />
        <Stat label="Above Range Low" value={`+${aboveLow.toFixed(1)}%`} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-900/40 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-200">{value}</p>
    </div>
  )
}