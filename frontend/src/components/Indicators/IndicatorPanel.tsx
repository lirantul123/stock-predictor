import { cn } from '@/utils/helpers'
import type { TechnicalIndicators } from '@/types'
import { formatNumber } from '@/utils/helpers'

interface IndicatorPanelProps {
  indicators: TechnicalIndicators | null
  enabledIndicators: string[]
  className?: string
}

interface IndicatorConfigBase {
  label: string
  getValue: (i: TechnicalIndicators) => string
  getSignal: (i: TechnicalIndicators) => string
  icon: string
}

interface IndicatorConfigWithThresholds extends IndicatorConfigBase {
  thresholds: { oversold: number; overbought: number }
}

type IndicatorConfig = IndicatorConfigBase | IndicatorConfigWithThresholds

function hasThresholds(config: IndicatorConfig): config is IndicatorConfigWithThresholds {
  return 'thresholds' in config
}

const indicatorConfigs: Record<string, IndicatorConfig> = {
  rsi: {
    label: 'RSI (14)',
    getValue: (i: TechnicalIndicators) => i.rsi?.value.toFixed(1) ?? '--',
    getSignal: (i: TechnicalIndicators) => i.rsi?.signal ?? 'neutral',
    thresholds: { oversold: 30, overbought: 70 },
    icon: 'M13 7h8m0 0v8m0-8l-8-8-4 4-6-6',
  },
  macd: {
    label: 'MACD (12,26,9)',
    getValue: (ind: TechnicalIndicators) => ind.macd?.histogram.toFixed(4) ?? '--',
    getSignal: (ind: TechnicalIndicators) => ind.macd?.trend ?? 'neutral',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  bollingerBands: {
    label: 'Bollinger Bands (20,2)',
    getValue: (ind: TechnicalIndicators) => {
      if (!ind.bollingerBands) return '--'
      const { upper, middle, lower } = ind.bollingerBands
      return `U ${upper.toFixed(2)} · M ${middle.toFixed(2)} · L ${lower.toFixed(2)}`
    },
    getSignal: (ind: TechnicalIndicators) => ind.bollingerBands?.position ?? 'neutral',
    icon: 'M4 8a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8zM16 18a2 2 0 01-2-2h6a2 2 0 012 2v6a2 2 0 01-2 2h-6a2 2 0 01-2-2v-6z',
  },
  stochastic: {
    label: 'Stochastic (14,3)',
    getValue: (ind: TechnicalIndicators) => ind.stochastic?.k.toFixed(1) ?? '--',
    getSignal: (ind: TechnicalIndicators) => ind.stochastic?.signal ?? 'neutral',
    thresholds: { oversold: 20, overbought: 80 },
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  },
  sma: {
    label: 'SMA 20/50/200',
    getValue: (ind: TechnicalIndicators) => {
      const vals = [ind.sma20, ind.sma50, ind.sma200].filter(Boolean)
      return vals.length ? vals.map((v) => v!.toFixed(2)).join(' · ') : '--'
    },
    getSignal: () => 'neutral',
    icon: 'M12 6.253v13m0-13C10.832 8.988 9.246 9 6 9s-4.832-.012-6 1.253m12-1.253C15.168 8.988 13.582 9 10.246 9S5.478 8.988 4.246 9 2.246 9 1 9c-2.234 0-3.828.012-4.754 1.253M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
  ema: {
    label: 'EMA 20/50',
    getValue: (ind: TechnicalIndicators) => {
      const vals = [ind.ema20, ind.ema50].filter(Boolean)
      return vals.length ? vals.map((v) => v!.toFixed(2)).join(' · ') : '--'
    },
    getSignal: () => 'neutral',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  atr: {
    label: 'ATR (14)',
    getValue: (ind: TechnicalIndicators) => ind.atr?.toFixed(2) ?? '--',
    getSignal: () => 'neutral',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.859-3.167M12 9V7m0 0v2m0 0v2m0 0V9m-3 3l-3 3m3 3l3-3M3.545 9.743a5.497 5.497 0 017.734 0M3.545 15.257a5.497 5.497 0 007.734 0',
  },
  adx: {
    label: 'ADX (14)',
    getValue: (ind: TechnicalIndicators) => ind.adx?.value.toFixed(1) ?? '--',
    getSignal: (ind: TechnicalIndicators) => ind.adx?.trend ?? 'neutral',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  obv: {
    label: 'OBV',
    getValue: (ind: TechnicalIndicators) => ind.obv ? formatNumber(ind.obv) : '--',
    getSignal: () => 'neutral',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
}

function getSignalClass(signal: string): string {
  switch (signal) {
    case 'bullish':
    case 'buy':
    case 'oversold':
    case 'strong':
      return 'text-green-400'
    case 'bearish':
    case 'sell':
    case 'overbought':
    case 'weak':
      return 'text-red-400'
    default:
      return 'text-slate-400'
  }
}

function getSignalLabel(signal: string): string {
  const labels: Record<string, string> = {
    bullish: 'Bullish',
    bearish: 'Bearish',
    buy: 'Buy',
    sell: 'Sell',
    oversold: 'Oversold',
    overbought: 'Overbought',
    neutral: 'Neutral',
    strong: 'Strong',
    weak: 'Weak',
    upper: 'Upper Band',
    lower: 'Lower Band',
    middle: 'Middle Band',
  }
  return labels[signal] || signal
}

export function IndicatorPanel({ indicators, enabledIndicators, className }: IndicatorPanelProps) {
  if (!indicators) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="h-8 w-8 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
          <svg className="h-4 w-4 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Loading indicators...</p>
      </div>
    )
  }

  const activeIndicators = enabledIndicators.filter((key) => key in indicatorConfigs)

  if (activeIndicators.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="text-slate-500">No indicators enabled</div>
        <p className="text-xs text-slate-600 mt-1">Open settings to enable indicators.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {activeIndicators.map((key) => {
        const config = indicatorConfigs[key]
        const value = config.getValue(indicators)
        const signal = config.getSignal(indicators)
        const signalClass = getSignalClass(signal)
        const signalLabel = getSignalLabel(signal)

        return (
          <div key={key} className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 hover:border-slate-700/60 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50">
                  <svg className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-300">{config.label}</span>
              </div>
              <span className={cn('text-xs font-mono font-medium px-2 py-1 rounded-full', signalClass, signalClass === 'text-green-400' && 'bg-green-500/15', signalClass === 'text-red-400' && 'bg-red-500/15', signalClass === 'text-slate-400' && 'bg-slate-800')}>
                {signalLabel}
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-slate-100">{value}</div>
            {hasThresholds(config) && (
              <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${(config.thresholds.oversold / 100) * 100}%` }} />
                <div className="h-full bg-yellow-500" style={{ width: `${((config.thresholds.overbought - config.thresholds.oversold) / 100) * 100}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${((100 - config.thresholds.overbought) / 100) * 100}%` }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
