import { cn } from '@/utils/helpers'
import type { PredictionResult } from '@/types'
import { formatPrice } from '@/utils/helpers'
import { StockHeader } from '../Common/StockHeader'
import { toneBadge, toneText, signalTone, changeTone } from '../../utils/signal'

interface PredictionPanelProps {
  prediction: PredictionResult | null
  unavailable?: boolean
  className?: string
}

const signalLabel: Record<string, string> = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  hold: 'Hold',
  sell: 'Sell',
  strong_sell: 'Strong Sell',
}

export function PredictionPanel({ prediction, unavailable = false, className }: PredictionPanelProps) {
  if (!prediction) {
    if (unavailable) {
      return (
        <div className={cn('rounded-2xl bg-slate-900/50 border border-slate-800 p-5 text-center', className)}>
          <p className="text-sm text-slate-300 font-medium">No trained model for this symbol</p>
          <p className="text-xs text-slate-500 mt-2">
            Technical analysis is still available. Train a model to see the LSTM forecast.
          </p>
        </div>
      )
    }

    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="h-10 w-10 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
          <svg className="h-5 w-5 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Generating prediction...</p>
      </div>
    )
  }

  const tone = signalTone(prediction.ensembleSignal)
  const label = signalLabel[prediction.ensembleSignal] ?? 'Hold'
  const confidencePct = Math.round(prediction.confidence * 100)
  const lastPred = prediction.predictions[prediction.predictions.length - 1]
  const changePct = lastPred ? ((lastPred.predictedClose - prediction.currentPrice) / prediction.currentPrice) * 100 : 0
  const isUp = changePct >= 0
  const changeToneVal = changeTone(changePct)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Signal header */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5">
        <StockHeader symbol={prediction.symbol} price={prediction.currentPrice} className="mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Ensemble Signal</h3>
            <p className="text-xs text-slate-500">ML + Technical consensus</p>
          </div>
          <span className={toneBadge(tone)}>{label}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl bg-slate-800/50 border border-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Price</p>
            <p className="text-xl font-bold font-mono text-slate-100 mt-1">{formatPrice(prediction.currentPrice)}</p>
          </div>
          <div className="rounded-xl bg-slate-800/50 border border-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target ({prediction.horizon})</p>
            <p className={cn('text-xl font-bold font-mono mt-1', toneText(changeToneVal))}>
              {isUp ? '+' : ''}{changePct.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/50">
          <StatItem label="Confidence" value={`${confidencePct}%`} />
          <StatItem label="Horizon" value={prediction.horizon} />
          <StatItem label="Model" value={prediction.modelVersion} />
        </div>
      </div>

      {/* Signal breakdown */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Signal Breakdown</h3>
        <div className="grid grid-cols-3 gap-3">
          <BreakdownCard label="ML Model" value={prediction.mlSignal} />
          <BreakdownCard label="Technical" value={prediction.technicalSignal} />
          <BreakdownCard label="Agreement" value={prediction.agreement} />
        </div>
      </div>

      {/* Forecast */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              {prediction.horizon}-Day Forecast
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{prediction.symbol} · LSTM price projection</p>
          </div>
          <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 px-2.5 py-1.5 text-right">
            <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Current</p>
            <p className="text-sm font-bold font-mono text-slate-100 leading-tight">
              {formatPrice(prediction.currentPrice)}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {prediction.predictions.map((p, i) => {
            const dirTone = p.direction === 'up' ? 'positive' : p.direction === 'down' ? 'negative' : 'neutral'
            const arrow = p.direction === 'up' ? '▲' : p.direction === 'down' ? '▼' : '●'
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-800/50 bg-slate-800/30 px-3 py-2.5 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900/60 text-[11px] font-bold font-mono text-slate-400">
                  D{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300">
                      {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-100">{formatPrice(p.predictedClose)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatPrice(p.lowerBound)} – {formatPrice(p.upperBound)}
                    </span>
                    <span className={cn('text-[10px] font-mono', toneText(dirTone))}>
                      {Math.round(p.confidence * 100)}% conf
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    'flex-shrink-0 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    dirTone === 'positive' && 'bg-green-500/15 text-green-400 border border-green-500/30',
                    dirTone === 'negative' && 'bg-red-500/15 text-red-400 border border-red-500/30',
                    dirTone === 'neutral' && 'bg-slate-800 text-slate-400 border border-slate-600/50'
                  )}
                >
                  {arrow}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-900/30 border border-slate-800/50 p-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> Predictions are for informational purposes only and do not constitute financial advice. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-800/50 p-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold font-mono text-slate-100">{value}</p>
    </div>
  )
}

function BreakdownCard({ label, value }: { label: string; value: string }) {
  const tone = signalTone(value)
  return (
    <div className="rounded-xl p-4 border border-slate-800/50 bg-slate-800/30">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-sm font-bold font-mono capitalize', toneText(tone))}>{value}</p>
    </div>
  )
}