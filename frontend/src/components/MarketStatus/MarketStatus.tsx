import { cn } from '@/utils/helpers'
import type { Quote } from '@/types'
import {
  describeMarket,
  marketStateOf,
  regionFromTimeZone,
  sessionDateLabel,
  sessionRange,
  sessionRangeLocal,
  userTimeZone,
  zoneLabel,
} from '@/utils/market'

const toneStyles = {
  positive: 'border-green-500/30 bg-green-500/10 text-green-400',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  negative: 'border-red-500/30 bg-red-500/10 text-red-400',
  neutral: 'border-slate-600/50 bg-slate-800/60 text-slate-300',
} as const

const dotStyles = {
  positive: 'bg-green-400',
  warning: 'bg-yellow-400',
  negative: 'bg-red-400',
  neutral: 'bg-slate-500',
} as const

interface MarketStatusPillProps {
  quote?: Quote | null
  className?: string
}

/** Compact open/closed badge for the chart header. */
export function MarketStatusPill({ quote, className }: MarketStatusPillProps) {
  const view = describeMarket(quote)
  if (!view) return null

  return (
    <div
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        toneStyles[view.tone],
        className,
      )}
      title={view.detail}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          dotStyles[view.tone],
          view.open && 'animate-pulse',
        )}
      />
      <span className="truncate">{view.label}</span>
      <span className="hidden truncate opacity-70 sm:inline">· {view.detail}</span>
    </div>
  )
}

interface MarketHoursProps {
  quote?: Quote | null
  className?: string
}

/** Regional trading hours, shown in both the exchange's zone and the viewer's. */
export function MarketHours({ quote, className }: MarketHoursProps) {
  const view = describeMarket(quote)
  const state = marketStateOf(quote)
  if (!quote || state === 'UNKNOWN') return null

  const tz = quote.marketTimezone
  const localTz = userTimeZone()
  const zone = zoneLabel(tz)
  const localZone = zoneLabel(localTz)
  const region = regionFromTimeZone(tz)
  const exchangeName = quote.exchangeName ?? quote.exchange ?? 'Exchange'
  // Yahoo sometimes names the exchange after its city ("Tokyo"); don't repeat it.
  const regionSuffix =
    region && region.toLowerCase() !== exchangeName.toLowerCase() ? region : ''
  const dateLabel = sessionDateLabel(quote)
  const sameZone = tz === localTz

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-800/70 bg-slate-900/40 px-3 py-2',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border',
            view ? toneStyles[view.tone] : toneStyles.neutral,
          )}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-200">
            {exchangeName}
            {regionSuffix ? <span className="font-normal text-slate-500"> · {regionSuffix}</span> : null}
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {dateLabel ? `${dateLabel} · ` : ''}
            {sessionRange(quote)}
            {zone ? ` ${zone}` : ''}
          </p>
        </div>
      </div>

      <div className="h-6 w-px shrink-0 bg-slate-800" />

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Your time</p>
        <p className="truncate font-mono text-[11px] text-slate-300">
          {sameZone ? sessionRange(quote) : sessionRangeLocal(quote)}
          <span className="ml-1 text-slate-500">
            {sameZone ? '' : localZone ? localZone : localTz}
          </span>
        </p>
      </div>

      {view ? (
        <>
          <div className="h-6 w-px shrink-0 bg-slate-800" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Status</p>
            <p
              className={cn(
                'truncate text-[11px] font-medium',
                view.tone === 'positive' && 'text-green-400',
                view.tone === 'warning' && 'text-yellow-400',
                view.tone === 'negative' && 'text-red-400',
                view.tone === 'neutral' && 'text-slate-300',
              )}
            >
              {view.detail}
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}