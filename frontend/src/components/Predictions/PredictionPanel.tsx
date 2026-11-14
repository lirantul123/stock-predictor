import { cn } from '@/utils/helpers'
import type { PredictionResult } from '@/types'
import { formatPrice } from '@/utils/helpers'

interface PredictionPanelProps {
  prediction: PredictionResult | null
  unavailable?: boolean
  className?: string
}

type SignalEntry = { label: string; className: string; icon: string }

function getSignalConfig(signal: PredictionResult['ensembleSignal']) {
  const config: Record<string, SignalEntry> = {
    strong_buy: { label: 'Strong Buy', className: 'bg-green-500/15 text-green-400 border-green-500/30', icon: 'M5 13l4 4L19 7' },
    buy: { label: 'Buy', className: 'bg-green-500/15 text-green-400 border-green-500/30', icon: 'M5 13l4 4L19 7' },
    hold: { label: 'Hold', className: 'bg-slate-700/50 text-slate-300 border-slate-600/50', icon: 'M9 16l-4-4l6-6l4 4l-6 6-4-4z' },
    sell: { label: 'Sell', className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: 'M6 18L18 6M6 6l12 12' },
    strong_sell: { label: 'Strong Sell', className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: 'M6 18L18 6M6 6l12 12' },
  }
  return config[signal] ?? config.hold
}

function getAgreementLabel(agreement: string) {
  const labels: Record<string, string> = {
    strong: 'Strong Agreement',
    moderate: 'Moderate Agreement',
    weak: 'Weak Agreement',
    conflict: 'Conflicting Signals',
  }
  return labels[agreement] ?? agreement
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

  const signalConfig = getSignalConfig(prediction.ensembleSignal)
  const confidencePct = Math.round(prediction.confidence * 100)
  const lastPred = prediction.predictions[prediction.predictions.length - 1]
  const changePct = lastPred ? ((lastPred.predictedClose - prediction.currentPrice) / prediction.currentPrice) * 100 : 0
  const isUp = changePct >= 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Signal header */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Ensemble Signal</h3>
            <p className="text-xs text-slate-500">ML + Technical consensus</p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border',
              signalConfig.className
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={signalConfig.icon} />
            </svg>
            {signalConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl bg-slate-800/50 border border-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Price</p>
            <p className="text-xl font-bold font-mono text-slate-100 mt-1">{formatPrice(prediction.currentPrice)}</p>
          </div>
          <div className="rounded-xl bg-slate-800/50 border border-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target ({prediction.horizon})</p>
            <p className={cn('text-xl font-bold font-mono mt-1', isUp ? 'text-green-400' : 'text-red-400')}>
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
          <BreakdownCard label="ML Model" value={prediction.mlSignal.charAt(0).toUpperCase() + prediction.mlSignal.slice(1)} signal={prediction.mlSignal} sub="LSTM Forecast" />
          <BreakdownCard label="Technical" value={prediction.technicalSignal.charAt(0).toUpperCase() + prediction.technicalSignal.slice(1)} signal={prediction.technicalSignal} sub="Indicator Consensus" />
          <BreakdownCard label="Agreement" value={getAgreementLabel(prediction.agreement)} signal={prediction.agreement} sub="Signal Alignment" />
        </div>
      </div>

      {/* Forecast table */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          {prediction.horizon}-Day Forecast
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Predicted</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Range</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Confidence</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Direction</th>
              </tr>
            </thead>
            <tbody>
              {prediction.predictions.map((p, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-slate-300">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="py-3 px-4 text-sm font-mono font-medium text-slate-100 text-right">{formatPrice(p.predictedClose)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-400 text-right">{formatPrice(p.lowerBound)} - {formatPrice(p.upperBound)}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-400 text-right">{Math.round(p.confidence * 100)}%</td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                        p.direction === 'up' && 'bg-green-500/15 text-green-400 border border-green-500/30',
                        p.direction === 'down' && 'bg-red-500/15 text-red-400 border border-red-500/30',
                        p.direction === 'flat' && 'bg-slate-800 text-slate-400 border border-slate-600/50'
                      )}
                    >
                      {p.direction === 'up' && '▲'}
                      {p.direction === 'down' && '▼'}
                      {p.direction === 'flat' && '●'}
                      {p.direction.charAt(0).toUpperCase() + p.direction.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-900/30 border border-slate-800/50 p-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold">Disclaimer:</span> Predictions are for informational purposes only and do not constitute financial advice. Past performance does not guarantee future results.
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Generated: {new Date(prediction.generatedAt).toLocaleString()}
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

function BreakdownCard({
  label,
  value,
  signal,
  sub,
}: {
  label: string
  value: string
  signal: string
  sub: string
}) {
  const color =
    signal === 'buy' || signal === 'strong'
      ? 'text-green-400 bg-green-500/15 border-green-500/30'
      : signal === 'sell' || signal === 'conflict'
        ? 'text-red-400 bg-red-500/15 border-red-500/30'
        : 'text-slate-400 bg-slate-800/50 border-slate-600/50'

  return (
    <div className="rounded-xl p-4 border">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-sm font-bold font-mono', color)}>{value}</p>
      <p className="text-[10px] text-slate-600 mt-2">{sub}</p>
    </div>
  )
}
