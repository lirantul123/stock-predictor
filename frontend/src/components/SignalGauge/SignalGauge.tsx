import { cn } from '@/utils/helpers'
import type { PredictionResult } from '@/types'
import { StockHeader } from '../Common/StockHeader'
import { toneBadge, toneText, signalTone, changeTone } from '../../utils/signal'

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
  const lastPred = prediction.predictions[prediction.predictions.length - 1]
  const changePct = lastPred ? ((lastPred.predictedClose - prediction.currentPrice) / prediction.currentPrice) * 100 : 0
  const changeToneVal = changeTone(changePct)

  return (
    <div className={cn('rounded-2xl glass-panel p-5 space-y-4', className)}>
      <StockHeader symbol={prediction.symbol} price={prediction.currentPrice} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">ML Signal</h3>
        <span className={toneBadge(tone)}>{label}</span>
      </div>

      <div className="flex items-end gap-2">
        <span className={cn('text-2xl font-bold font-mono', toneText(tone))}>{label}</span>
        <span className={cn('text-sm font-medium', toneText(changeToneVal))}>
          {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}% target
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <GaugeStat label="Confidence" value={`${confidencePct}%`} />
        <GaugeStat label="Horizon" value={prediction.horizon} />
        <GaugeStat label="Model" value={prediction.modelVersion} />
      </div>

      <div className="border-t border-slate-800/50 pt-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Signal Breakdown</h4>
        <div className="grid grid-cols-2 gap-3">
          <BreakdownItem label="ML Model" value={prediction.mlSignal} />
          <BreakdownItem label="Technical" value={prediction.technicalSignal} />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500">Agreement</p>
            <p className="text-xs font-medium text-slate-300 capitalize">{prediction.agreement}</p>
          </div>
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
                width: `${{ strong: 100, moderate: 65, weak: 35, conflict: 10 }[prediction.agreement] ?? 50}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function GaugeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-2.5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs font-bold font-mono text-slate-100 truncate">{value}</p>
    </div>
  )
}

function BreakdownItem({ label, value }: { label: string; value: string }) {
  const tone = signalTone(value)
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cn('text-xs font-bold font-mono capitalize', toneText(tone))}>{value}</span>
    </div>
  )
}