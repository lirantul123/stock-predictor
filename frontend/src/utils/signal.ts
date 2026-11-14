import { cn } from './helpers'

export type SignalTone = 'positive' | 'negative' | 'neutral' | 'warning'

export const toneColor: Record<SignalTone, string> = {
  positive: 'text-green-400',
  negative: 'text-red-400',
  neutral: 'text-slate-300',
  warning: 'text-yellow-400',
}

export const toneBg: Record<SignalTone, string> = {
  positive: 'bg-green-500/15 border-green-500/30',
  negative: 'bg-red-500/15 border-red-500/30',
  neutral: 'bg-slate-700/50 border-slate-600/50',
  warning: 'bg-yellow-500/15 border-yellow-500/30',
}

export function signalTone(signal: string): SignalTone {
  if (signal === 'buy' || signal === 'strong_buy' || signal === 'strong' || signal === 'up') return 'positive'
  if (signal === 'sell' || signal === 'strong_sell' || signal === 'conflict' || signal === 'down') return 'negative'
  if (signal === 'hold' || signal === 'moderate' || signal === 'flat') return 'warning'
  return 'neutral'
}

export function changeTone(change: number): SignalTone {
  if (change > 0) return 'positive'
  if (change < 0) return 'negative'
  return 'neutral'
}

export function toneText(tone: SignalTone, extra?: string) {
  return cn(toneColor[tone], extra)
}

export function toneBadge(tone: SignalTone, extra?: string) {
  return cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border', toneBg[tone], toneColor[tone], extra)
}