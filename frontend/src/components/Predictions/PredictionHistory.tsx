import { useState } from 'react'
import { usePredictionHistory, type PastForecast } from '../../hooks/usePredictionHistory'
import { cn, formatPrice } from '../../utils/helpers'
import { useMarketStore } from '../../stores'

/** One-line verdict on how a past forecast turned out. */
function ScoreBadge({ forecast }: { forecast: PastForecast }) {
  const { predictedTarget, actualPrice, errorPct, latestClose } = forecast

  if (actualPrice == null || predictedTarget == null) {
    // Target date is still ahead — say so instead of implying the model was wrong.
    const running = latestClose != null ? formatPrice(latestClose, 'USD') : null
    return (
      <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400">
        Pending{running ? ` · now ${running}` : ''}
      </span>
    )
  }

  const abs = Math.abs(errorPct ?? 0)
  const hit = abs <= 2
  const near = abs <= 5
  const tone = hit
    ? 'bg-green-500/15 text-green-400'
    : near
      ? 'bg-yellow-500/15 text-yellow-400'
      : 'bg-red-500/15 text-red-400'

  return (
    <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase', tone)}>
      {hit ? 'On target' : near ? 'Close' : 'Off'} · {errorPct! >= 0 ? '+' : ''}
      {errorPct!.toFixed(1)}%
    </span>
  )
}

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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-100">
                    {formatPrice(f.currentPrice, "USD")}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {f.generatedAt ? new Date(f.generatedAt).toLocaleDateString() : '—'}
                  </span>
                  <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-400">
                    {f.horizon}
                  </span>
                  <ScoreBadge forecast={f} />
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
                {/* Expected vs actual — the answer to "what did it think would happen?" */}
                <div className="mb-2 rounded-lg border border-slate-800/70 bg-slate-950/50 p-2">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    Expected vs actual
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="text-slate-500">Then</p>
                      <p className="font-mono font-medium text-slate-200">
                        {formatPrice(f.baselinePrice ?? f.currentPrice, "USD")}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expected {f.targetDate ?? ''}</p>
                      <p className="font-mono font-medium text-primary-300">
                        {f.predictedTarget != null ? formatPrice(f.predictedTarget, "USD") : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Actual</p>
                      <p
                        className={cn(
                          'font-mono font-medium',
                          f.actualPrice == null
                            ? 'text-slate-400'
                            : f.actualPrice >= (f.predictedTarget ?? 0)
                              ? 'text-green-400'
                              : 'text-red-400',
                        )}
                      >
                        {f.actualPrice != null ? formatPrice(f.actualPrice, "USD") : 'pending'}
                      </p>
                    </div>
                  </div>
                </div>

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