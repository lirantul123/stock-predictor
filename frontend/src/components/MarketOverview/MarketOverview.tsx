import { cn, formatPrice, formatVolume, formatChange } from '@/utils/helpers'
import type { Quote } from '@/types'

interface MarketOverviewProps {
  quote?: Quote | null
  symbol?: string
  name?: string
  className?: string
}

interface Metric {
  key: string
  label: string
  value: string
  hint: string
  icon: string
  accent: 'primary' | 'success' | 'danger' | 'warning' | 'info'
  valueClass?: string
}

const accentMap = {
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/25',
  success: 'bg-green-500/10 text-green-400 border-green-500/25',
  danger: 'bg-red-500/10 text-red-400 border-red-500/25',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
  info: 'bg-primary-500/10 text-primary-400 border-primary-500/25',
} as const

export function MarketOverview({ quote, symbol, name, className }: MarketOverviewProps) {
  if (!quote) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 lg:grid-cols-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[62px] animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/40" />
        ))}
      </div>
    )
  }

  const isUp = quote.change >= 0

  const metrics: Metric[] = [
    {
      key: 'price',
      label: 'Price',
      value: formatPrice(quote.price),
      hint: 'Last traded price for this session.',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      accent: 'primary',
    },
    {
      key: 'change',
      label: 'Change',
      value: formatChange(quote.change, quote.changePercent),
      hint: 'Move versus the previous closing price.',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      accent: isUp ? 'success' : 'danger',
      valueClass: isUp ? 'text-green-400' : 'text-red-400',
    },
    {
      key: 'range',
      label: 'Day Range',
      value: `${formatPrice(quote.low)} – ${formatPrice(quote.high)}`,
      hint: 'Lowest and highest price reached today.',
      icon: 'M5 12h14M5 12l3-3m-3 3l3 3m9-3l-3-3m3 3l-3 3',
      accent: 'warning',
    },
    {
      key: 'volume',
      label: 'Volume',
      value: formatVolume(quote.volume),
      hint: 'Shares traded so far today.',
      icon: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
      accent: 'info',
    },
  ]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {symbol && (
        <div className="hidden min-w-0 shrink-0 pr-3 xl:block">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-bold text-slate-100">{symbol}</span>
            {name && <span className="truncate text-xs text-slate-500">{name}</span>}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-600">Market snapshot</p>
        </div>
      )}

      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricChip key={m.key} metric={m} />
        ))}
      </div>
    </div>
  )
}

function MetricChip({ metric }: { metric: Metric }) {
  const accent = accentMap[metric.accent]

  return (
    <div className="group relative flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-800/60 bg-slate-900/40 px-2.5 py-2 transition-colors hover:border-slate-700/70">
      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', accent)}>
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={metric.icon} />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {metric.label}
          </span>
          <InfoDot text={metric.hint} />
        </div>
        <div
          className={cn(
            'truncate font-mono text-sm font-bold leading-tight',
            metric.valueClass ?? 'text-slate-100',
          )}
        >
          {metric.value}
        </div>
      </div>
    </div>
  )
}

function InfoDot({ text }: { text: string }) {
  return (
    <span className="group/info relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={text}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-700 text-[8px] font-bold text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-44 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-normal normal-case leading-snug tracking-normal text-slate-300 opacity-0 shadow-xl shadow-black/40 transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}