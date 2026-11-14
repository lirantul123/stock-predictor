import { cn } from '@/utils/helpers'
import type { TechnicalIndicators } from '@/types'

interface TechnicalSummaryProps {
  indicators: TechnicalIndicators | null
  symbol?: string
  className?: string
}

type CheckState = 'buy' | 'sell' | 'neutral'

interface Check {
  label: string
  detail: string
  state: CheckState
}

function buildChecks(indicators: TechnicalIndicators | null): Check[] {
  if (!indicators) return []

  const checks: Check[] = []

  if (indicators.rsi) {
    checks.push({
      label: 'RSI (14)',
      detail: indicators.rsi.value.toFixed(1),
      state: indicators.rsi.value <= 30 ? 'buy' : indicators.rsi.value >= 70 ? 'sell' : 'neutral',
    })
  }

  if (indicators.macd) {
    checks.push({
      label: 'MACD',
      detail: indicators.macd.trend,
      state: indicators.macd.trend === 'bullish' ? 'buy' : indicators.macd.trend === 'bearish' ? 'sell' : 'neutral',
    })
  }

  if (indicators.stochastic) {
    checks.push({
      label: 'Stochastic',
      detail: indicators.stochastic.k.toFixed(1),
      state:
        indicators.stochastic.signal === 'oversold'
          ? 'buy'
          : indicators.stochastic.signal === 'overbought'
            ? 'sell'
            : 'neutral',
    })
  }

  if (indicators.sma20 != null && indicators.sma50 != null) {
    checks.push({
      label: 'SMA 20/50',
      detail: `${indicators.sma20.toFixed(0)} / ${indicators.sma50.toFixed(0)}`,
      state:
        indicators.sma20 > indicators.sma50
          ? 'buy'
          : indicators.sma20 < indicators.sma50
            ? 'sell'
            : 'neutral',
    })
  }

  if (indicators.ema20 != null && indicators.ema50 != null) {
    checks.push({
      label: 'EMA 20/50',
      detail: `${indicators.ema20.toFixed(0)} / ${indicators.ema50.toFixed(0)}`,
      state:
        indicators.ema20 > indicators.ema50
          ? 'buy'
          : indicators.ema20 < indicators.ema50
            ? 'sell'
            : 'neutral',
    })
  }

  if (indicators.adx) {
    checks.push({
      label: 'ADX (14)',
      detail: indicators.adx.trend,
      state: 'neutral',
    })
  }

  return checks
}

const stateColor: Record<CheckState, string> = {
  buy: 'text-green-400',
  sell: 'text-red-400',
  neutral: 'text-slate-300',
}

export function TechnicalSummary({ indicators, symbol, className }: TechnicalSummaryProps) {
  const checks = buildChecks(indicators)

  if (!indicators) {
    return (
      <div className={cn('rounded-xl border border-slate-800/70 bg-slate-950/40 p-4', className)}>
        <div className="mb-3 h-3 w-28 animate-pulse rounded-full bg-slate-800/60" />
        <div className="mb-3 h-2 w-full animate-pulse rounded-full bg-slate-800/60" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-800/40" />
          ))}
        </div>
      </div>
    )
  }

  const buy = checks.filter((c) => c.state === 'buy').length
  const sell = checks.filter((c) => c.state === 'sell').length
  const neutral = checks.length - buy - sell
  const total = Math.max(checks.length, 1)
  const position = Math.round((((buy - sell) / total + 1) / 2) * 100)

  const verdict =
    buy - sell >= 2 ? 'Bullish' : sell - buy >= 2 ? 'Bearish' : buy > sell ? 'Leaning Bullish' : sell > buy ? 'Leaning Bearish' : 'Neutral'

  return (
    <div className={cn('rounded-xl border border-slate-800/70 bg-slate-950/40 p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Technical Verdict{symbol ? ` · ${symbol}` : ''}
        </h3>
        <span
          className={cn(
            'text-[11px] font-semibold',
            verdict.includes('Bull') ? 'text-green-400' : verdict.includes('Bear') ? 'text-red-400' : 'text-slate-300',
          )}
        >
          {verdict}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-gradient-to-r from-red-500/70 via-yellow-500/70 to-green-500/70">
        <div
          className="absolute -top-1 h-4 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-md shadow-black/40"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] font-medium uppercase tracking-wide">
        <span className="text-red-400/80">Sell</span>
        <span className="text-slate-500">Neutral</span>
        <span className="text-green-400/80">Buy</span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
        <span className="font-semibold text-green-400">{buy} Buy</span>
        <span className="text-slate-500">{neutral} Neutral</span>
        <span className="font-semibold text-red-400">{sell} Sell</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-900/40 px-2 py-1.5"
            title={`${check.label}: ${check.detail}`}
          >
            <span className="text-[10px] text-slate-400">{check.label}</span>
            <span className={cn('text-[10px] font-semibold font-mono', stateColor[check.state])}>
              {check.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}