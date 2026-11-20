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

/**
 * Regional trading hours. Leads with the viewer's own clock — that is the time
 * they actually care about — and keeps the exchange's session as secondary
 * context beside it.
 */
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
  const localRange = sameZone ? sessionRange(quote) : sessionRangeLocal(quote)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/40 p-2',
        className,
      )}
    >
      {/* Your clock — the headline */}
      <div className="flex items-center gap-2.5 rounded-lg border border-primary-500/25 bg-primary-500/10 px-3 py-1.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-primary-300/80">
            Your time
          </p>
          <p className="whitespace-nowrap font-mono text-[15px] font-bold leading-tight text-slate-50">
            {localRange}
          </p>
        </div>
        <span className="ml-0.5 rounded-md bg-slate-950/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-200">
          {localZone || localTz}
        </span>
      </div>

      {/* Exchange session — secondary context */}
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-[11px] font-semibold text-slate-300">
          {exchangeName}
          {regionSuffix ? (
            <span className="font-normal text-slate-500"> · {regionSuffix}</span>
          ) : null}
          {sameZone ? <span className="ml-1 text-[10px] text-slate-600">· same as yours</span> : null}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          {dateLabel ? `${dateLabel} · ` : ''}
          {sessionRange(quote)}
          {zone ? ` ${zone}` : ''}
        </p>
      </div>

      {/* Status */}
      {view ? (
        <div
          className={cn(
            'ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold',
            toneStyles[view.tone],
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              dotStyles[view.tone],
              view.open && 'animate-pulse',
            )}
          />
          <span className="whitespace-nowrap">{view.label}</span>
          <span className="hidden whitespace-nowrap font-normal opacity-75 sm:inline">
            · {view.detail}
          </span>
        </div>
      ) : null}
    </div>
  )
}