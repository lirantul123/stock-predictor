import { cn } from '@/utils/helpers'
import { formatPrice, formatVolume, formatChange } from '@/utils/helpers'
import type { Quote } from '@/types'

interface MarketOverviewProps {
  quote?: Quote | null
}

export function MarketOverview({ quote }: MarketOverviewProps) {
  if (!quote) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const isUp = quote.change >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Current Price"
        value={formatPrice(quote.price)}
        subtitle="Real-time"
        icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        color="primary"
      />
      <MetricCard
        title="Change"
        value={formatChange(quote.change, quote.changePercent)}
        subtitle={isUp ? 'Up from previous close' : 'Down from previous close'}
        icon="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
        color={isUp ? 'success' : 'danger'}
        isChange={true}
      />
      <MetricCard
        title="High / Low"
        value={`${formatPrice(quote.high)} / ${formatPrice(quote.low)}`}
        subtitle="Day range"
        icon="M9 3L2.586 13.414A2 2 0 004.164 17.5l2.828 2.828A2 2 0 007.586 21h12.828A2 2 0 0019.836 17.5l2.828-2.828A2 2 0 0021.414 13.414L21 3zM9 17.586l-2.828-2.828A2 2 0 014.164 13.5l2.828-2.828A2 2 0 017.586 9.5l2.828 2.828A2 2 0 0110.414 13.5L13 17.586zM4.164 9.5L7 6.586A2 2 0 018.586 5.5h2.828A2 2 0 0113.414 8.5L10.586 11.5A2 2 0 019 13.586z"
        color="warning"
      />
      <MetricCard
        title="Volume"
        value={formatVolume(quote.volume)}
        subtitle="Trading volume"
        icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v5h8m0 0l-2-2m2 2l2 2"
        color="info"
      />
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  isChange = false,
}: {
  title: string
  value: string
  subtitle: string
  icon: string
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'info'
  isChange?: boolean
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/30' },
    success: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    danger: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    info: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/30' },
  }
  const c = colorMap[color]

  return (
    <div className="rounded-2xl glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.border}`}>
          <svg className={cn('h-5 w-5', c.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{subtitle}</span>
      </div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <div className={cn('text-2xl font-bold font-mono text-slate-100', isChange && (value.startsWith('+') ? 'text-green-400' : 'text-red-400'), !isChange && 'text-slate-100')}>
        {value}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-xl bg-slate-800/50" />
        <div className="h-3 w-24 rounded-full bg-slate-800/50" />
      </div>
      <div className="h-3 w-24 rounded-full bg-slate-800/50 mb-1" />
      <div className="h-6 w-32 rounded-full bg-slate-800/50" />
    </div>
  )
}
