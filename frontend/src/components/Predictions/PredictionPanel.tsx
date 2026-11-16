import { cn } from '@/utils/helpers'
import type { PredictionResult } from '@/types'
import { currencyOf, formatPrice } from '@/utils/helpers'
import { toneText } from '../../utils/signal'

interface PredictionPanelProps {
  prediction: PredictionResult | null
  unavailable?: boolean
  currency?: string | null
  className?: string
}

export function PredictionPanel({ prediction, unavailable = false, currency, className }: PredictionPanelProps) {
  const money = currencyOf(currency)

  if (!prediction) {
    if (unavailable) {
      return (
        <div className={cn('rounded-xl border border-slate-800/70 bg-slate-950/40 p-4 text-center', className)}>
          <p className="text-xs font-medium text-slate-300">No trained model for this symbol</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Train a model to unlock the LSTM forecast. Technical analysis is still available.
          </p>
        </div>
      )
    }

    return (
      <div className={cn('flex flex-col items-center justify-center py-8', className)}>
        <div className="mb-2 flex h-8 w-8 items-center justify-center">
          <svg className="h-4 w-4 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500">Generating forecast...</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Day-by-Day Forecast
        </h3>
        <span className="font-mono text-[10px] text-slate-600">
          {prediction.predictions.length} days
        </span>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-2 px-2.5 pb-1 text-[9px] font-medium uppercase tracking-wider text-slate-600">
        <span className="w-6 shrink-0">#</span>
        <span className="w-14 shrink-0">Date</span>
        <span className="flex-1 text-right">Range</span>
        <span className="w-16 shrink-0 text-right">Close</span>
        <span className="w-10 shrink-0 text-right">Conf</span>
        <span className="w-5 shrink-0" />
      </div>

      <div className="space-y-1">
        {prediction.predictions.map((p, i) => {
          const dirTone = p.direction === 'up' ? 'positive' : p.direction === 'down' ? 'negative' : 'neutral'
          const arrow = p.direction === 'up' ? '▲' : p.direction === 'down' ? '▼' : '●'
          const isLast = i === prediction.predictions.length - 1
          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                isLast
                  ? 'border-primary-500/40 bg-primary-500/[0.07]'
                  : 'border-slate-800/60 bg-slate-950/40 hover:border-slate-700/70 hover:bg-slate-900/50',
              )}
            >
              <span className="w-6 shrink-0 font-mono text-[10px] font-bold text-slate-500">
                D{i + 1}
              </span>
              <span className="w-14 shrink-0 text-[11px] font-medium text-slate-400">
                {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="flex-1 truncate text-right font-mono text-[10px] text-slate-500">
                {formatPrice(p.lowerBound, money)} – {formatPrice(p.upperBound, money)}
              </span>
              <span className="w-16 shrink-0 text-right font-mono text-xs font-bold text-slate-100">
                {formatPrice(p.predictedClose, money)}
              </span>
              <span className={cn('w-10 shrink-0 text-right font-mono text-[10px]', toneText(dirTone))}>
                {Math.round(p.confidence * 100)}%
              </span>
              <span
                aria-label={p.direction}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px]',
                  dirTone === 'positive' && 'bg-green-500/15 text-green-400',
                  dirTone === 'negative' && 'bg-red-500/15 text-red-400',
                  dirTone === 'neutral' && 'bg-slate-800 text-slate-500',
                )}
              >
                {arrow}
              </span>
            </div>
          )
        })}
      </div>

      <p className="pt-1 text-[10px] leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-500">Disclaimer:</span> Forecasts are informational only and are not
        financial advice.
      </p>
    </div>
  )
}