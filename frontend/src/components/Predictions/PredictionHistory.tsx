import { useState } from 'react'
import { usePredictionHistory } from '../../hooks/usePredictionHistory'
import { cn, formatPrice } from '../../utils/helpers'
import { useMarketStore } from '../../stores'

export function PredictionHistory() {
  const { currentSymbol } = useMarketStore()
  const { data, isLoading } = usePredictionHistory(currentSymbol)
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!currentSymbol) return null

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
        <p className="text-xs text-slate-500">Loading forecast history...</p>
      </div>
    )
  }

  const forecasts = data?.forecasts ?? []

  if (forecasts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
        <p className="text-xs text-slate-500">No past forecasts yet. Run a prediction to start tracking.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {forecasts.map((f) => {
        const last = f.predictions[f.predictions.length - 1]
        const isExpanded = expanded === f.id

        return (
          <div
            key={f.id}
            className="rounded-xl border border-slate-800/70 bg-slate-900/40 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : f.id)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-100">
                    {formatPrice(f.currentPrice, "USD")}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {f.generatedAt ? new Date(f.generatedAt).toLocaleDateString() : '—'}
                  </span>
                  <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400">
                    {f.horizon}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px]">
                  <span className="text-slate-500">
                    Signal: <span className="font-medium text-slate-300">{f.ensembleSignal}</span>
                  </span>
                  <span className="text-slate-500">
                    Conf: <span className="font-medium text-slate-300">{Math.round(f.confidence * 100)}%</span>
                  </span>
                  {last && (
                    <span className="text-slate-500">
                      Target: <span className="font-medium text-slate-300">{formatPrice(last.predictedClose, "USD")}</span>
                    </span>
                  )}
                </div>
              </div>
              <svg
                className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', isExpanded && 'rotate-180')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-800/60 px-3 py-2">
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <p className="text-slate-500">Baseline</p>
                    <p className="font-mono font-medium text-slate-200">
                      {formatPrice(f.baselinePrice ?? f.currentPrice, "USD")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Model</p>
                    <p className="font-mono text-slate-400">{f.modelVersion}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Agreement</p>
                    <p className="font-medium text-slate-300">{f.agreement}</p>
                  </div>
                </div>

                {f.predictions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                      Forecast points
                    </p>
                    {f.predictions.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{p.date}</span>
                        <span className="font-mono text-slate-200">{formatPrice(p.predictedClose, "USD")}</span>
                        <span
                          className={cn(
                            'font-mono',
                            p.direction === 'up' ? 'text-green-400' : p.direction === 'down' ? 'text-red-400' : 'text-slate-400',
                          )}
                        >
                          {p.direction}
                        </span>
                        <span className="text-slate-500">{Math.round(p.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {f.userNote && (
                  <p className="mt-2 text-[10px] italic text-slate-400">
                    Note: {f.userNote}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}