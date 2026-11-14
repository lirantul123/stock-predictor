import { cn } from '@/utils/helpers'
import type { PredictionResult } from '@/types'
import { toneBadge, toneText, signalTone } from '../../utils/signal'

interface SignalGaugeProps {
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

export function SignalGauge({ prediction, unavailable = false, className }: SignalGaugeProps) {
  if (!prediction) {
    if (unavailable) {
      return (
        <div className={cn('rounded-2xl glass-panel p-5 text-center', className)}>
          <p className="text-sm text-slate-300 font-medium">No trained model</p>
          <p className="text-xs text-slate-500 mt-1">Train this symbol to enable ML predictions.</p>
        </div>
      )
    }

    return (
      <div className={cn('rounded-2xl glass-panel p-5 text-center', className)}>
        <p className="text-sm text-slate-400">Generating prediction...</p>
      </div>
    )
  }

  const tone = signalTone(prediction.ensembleSignal)
  const label = signalLabel[prediction.ensembleSignal] ?? 'Hold'
  const confidencePct = Math.round(prediction.confidence * 100)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ensemble Signal</h3>
        <span className={toneBadge(tone)}>{label}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <GaugeStat label="Confidence" value={`${confidencePct}%`} />
        <GaugeStat label="Horizon" value={prediction.horizon} />
        <GaugeStat label="Agreement" value={prediction.agreement} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Signal confidence</span>
          <span className={cn('font-mono font-semibold', toneText(tone))}>{confidencePct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              tone === 'positive' && 'bg-green-500',
              tone === 'negative' && 'bg-red-500',
              tone === 'warning' && 'bg-yellow-500',
              tone === 'neutral' && 'bg-slate-500',
            )}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 text-[10px]">
        <span className="text-slate-500">Model</span>
        <span className="truncate pl-2 font-mono text-slate-400">{prediction.modelVersion}</span>
      </div>
    </div>
  )
}

function GaugeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-2">
      <p className="mb-0.5 text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="truncate font-mono text-[11px] font-bold capitalize text-slate-100">{value}</p>
    </div>
  )
}
