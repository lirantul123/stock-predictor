import { cn } from '../../utils/helpers'
import type { TechnicalIndicators } from '../../types'

interface IndicatorPanelProps {
  indicators: TechnicalIndicators | null
  enabledIndicators: string[]
  className?: string
}

interface IndicatorConfigBase {
  label: string
  getValue: (i: TechnicalIndicators) => string
  getSignal: (i: TechnicalIndicators) => string
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
  },
  macd: {
    label: 'MACD (12,26,9)',
    getValue: (ind: TechnicalIndicators) => ind.macd?.histogram.toFixed(4) ?? '--',
    getSignal: (ind: TechnicalIndicators) => ind.macd?.trend ?? 'neutral',
  },
  bollingerBands: {
    label: 'Bollinger Bands (20,2)',
    getValue: (ind: TechnicalIndicators) => {
      if (!ind.bollingerBands) return '--'
      const { upper, middle, lower } = ind.bollingerBands
      return `U: ${upper.toFixed(2)} M: ${middle.toFixed(2)} L: ${lower.toFixed(2)}`
    },
    getSignal: (ind: TechnicalIndicators) => ind.bollingerBands?.position ?? 'neutral',
  },
  stochastic: {
    label: 'Stochastic (14,3)',
    getValue: (ind: TechnicalIndicators) => ind.stochastic?.k.toFixed(1) ?? '--',
    getSignal: (ind: TechnicalIndicators) => ind.stochastic?.signal ?? 'neutral',
    thresholds: { oversold: 20, overbought: 80 },
  },
  sma: {
    label: 'SMA 20/50/200',
    getValue: (ind: TechnicalIndicators) => {
      const vals = [ind.sma20, ind.sma50, ind.sma200].filter(Boolean)
      return vals.length ? vals.map((v) => v!.toFixed(2)).join(' / ') : '--'
    },
    getSignal: () => 'neutral',
  },
  ema: {
    label: 'EMA 20/50',
    getValue: (ind: TechnicalIndicators) => {
      const vals = [ind.ema20, ind.ema50].filter(Boolean)
      return vals.length ? vals.map((v) => v!.toFixed(2)).join(' / ') : '--'
    },
    getSignal: () => 'neutral',
  },
  atr: {
    label: 'ATR (14)',
    getValue: (ind: TechnicalIndicators) => ind.atr?.toFixed(2) ?? '--',
    getSignal: () => 'neutral',
  },
  adx: {
    label: 'ADX (14)',
    getValue: (ind: TechnicalIndicators) => ind.adx?.value.toFixed(1) ?? '--',
    getSignal: (ind: TechnicalIndicators) => ind.adx?.trend ?? 'neutral',
  },
  obv: {
    label: 'OBV',
    getValue: (ind: TechnicalIndicators) => ind.obv ? formatNumber(ind.obv) : '--',
    getSignal: () => 'neutral',
  },
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toLocaleString()
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
      <div className={cn('space-y-3', className)}>
        <div className="text-center py-8 text-slate-500">
          Loading indicators...
        </div>
      </div>
    )
  }

  const activeIndicators = enabledIndicators.filter((key) => key in indicatorConfigs)

  if (activeIndicators.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        No indicators enabled. Open settings to enable indicators.
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
          <div
            key={key}
            className="rounded-lg bg-slate-900/50 border border-slate-800 p-4 transition-colors hover:border-slate-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">{config.label}</span>
              <span className={cn('text-sm font-mono font-medium', signalClass)}>
                {signalLabel}
              </span>
            </div>
            <div className="text-lg font-mono font-semibold text-slate-100">{value}</div>
            {hasThresholds(config) && (
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(config.thresholds.oversold / 100) * 100}%` }}
                />
                <div
                  className="h-full bg-yellow-500"
                  style={{ width: `${((config.thresholds.overbought - config.thresholds.oversold) / 100) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${((100 - config.thresholds.overbought) / 100) * 100}%` }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}