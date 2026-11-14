import { cn } from '@/utils/helpers'
import type { PredictionResult } from '@/types'

interface SignalGaugeProps {
  prediction: PredictionResult | null
  unavailable?: boolean
  className?: string
}

const signalConfig: Record<string, { label: string; color: string; icon: string }> = {
  strong_buy: { label: 'Strong Buy', color: 'text-green-400', icon: 'M5 13l4 4L19 7' },
  buy: { label: 'Buy', color: 'text-green-400', icon: 'M5 13l4 4L19 7' },
  hold: { label: 'Hold', color: 'text-yellow-400', icon: 'M9 16l-4-4l6-6l4 4l-6 6-4-4z' },
  sell: { label: 'Sell', color: 'text-red-400', icon: 'M6 18L18 6M6 6l12 12' },
  strong_sell: { label: 'Strong Sell', color: 'text-red-400', icon: 'M6 18L18 6M6 6l12 12' },
}

export function SignalGauge({ prediction, unavailable = false, className }: SignalGaugeProps) {
  if (!prediction) {
    if (unavailable) {
      return (
        <div className={cn('rounded-2xl glass-panel p-6 text-center', className)}>
          <div className="h-32 w-32 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-300 font-medium">No trained model</p>
          <p className="text-xs text-slate-500 mt-1">Train this symbol to enable ML predictions.</p>
        </div>
      )
    }

    return (
      <div className={cn('rounded-2xl glass-panel p-6 text-center', className)}>
        <div className="h-32 w-32 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
          <svg className="h-10 w-10 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-slate-400">Generating prediction...</p>
      </div>
    )
  }

  const config = signalConfig[prediction.ensembleSignal] ?? signalConfig.hold
  const confidencePct = Math.round(prediction.confidence * 100)
  const lastPred = prediction.predictions[prediction.predictions.length - 1]
  const changePct = lastPred ? ((lastPred.predictedClose - prediction.currentPrice) / prediction.currentPrice) * 100 : 0
  const isUp = changePct >= 0

  return (
    <div className={cn('rounded-2xl glass-panel p-6', className)}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">ML Signal</h3>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border',
              config.color === 'text-green-400' && 'bg-green-500/15 border-green-500/30',
              config.color === 'text-red-400' && 'bg-red-500/15 border-red-500/30',
              config.color === 'text-yellow-400' && 'bg-yellow-500/15 border-yellow-500/30',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
            </svg>
            {config.label}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold font-mono text-slate-100">{config.label}</span>
          <span className={cn('text-sm font-medium', isUp ? 'text-green-400' : 'text-red-400')}>
            {isUp ? '+' : ''}{changePct.toFixed(1)}% target
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <GaugeStat label="Confidence" value={`${confidencePct}%`} />
        <GaugeStat label="Horizon" value={prediction.horizon} />
        <GaugeStat label="Model" value={prediction.modelVersion} />
      </div>

      <div className="border-t border-slate-800/50 pt-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Signal Breakdown</h4>
        <div className="grid grid-cols-2 gap-3">
          <BreakdownItem
            label="ML Model"
            value={prediction.mlSignal.charAt(0).toUpperCase() + prediction.mlSignal.slice(1)}
            signal={prediction.mlSignal}
          />
          <BreakdownItem
            label="Technical"
            value={prediction.technicalSignal.charAt(0).toUpperCase() + prediction.technicalSignal.slice(1)}
            signal={prediction.technicalSignal}
          />
        </div>
        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-1">Agreement</p>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full',
                    prediction.agreement === 'strong' && 'bg-green-500',
                    prediction.agreement === 'moderate' && 'bg-yellow-500',
                    prediction.agreement === 'weak' && 'bg-orange-500',
                    prediction.agreement === 'conflict' && 'bg-red-500',
                  )}
                  style={{
                    width: `${{
                      strong: 100,
                      moderate: 65,
                      weak: 35,
                      conflict: 10,
                    }[prediction.agreement] ?? 50}%`,
                  }}
                />
          </div>
          <p className="text-xs font-medium text-slate-300 mt-1">
            {{
              strong: 'Strong Agreement',
              moderate: 'Moderate Agreement',
              weak: 'Weak Agreement',
              conflict: 'Conflicting Signals',
            }[prediction.agreement] ?? prediction.agreement}
          </p>
        </div>
      </div>
    </div>
  )
}

function GaugeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold font-mono text-slate-100">{value}</p>
    </div>
  )
}

function BreakdownItem({ label, value, signal }: { label: string; value: string; signal: string }) {
  const color =
    signal === 'buy' ? 'text-green-400' : signal === 'sell' ? 'text-red-400' : 'text-slate-400'
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cn('text-xs font-bold font-mono', color)}>{value}</span>
    </div>
  )
}
