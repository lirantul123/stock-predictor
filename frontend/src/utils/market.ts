import type { Quote } from '../types'

/** Yahoo session states, surfaced on the quote. */
export type MarketState = 'REGULAR' | 'PRE' | 'POST' | 'CLOSED' | 'UNKNOWN'

const STATE_ALIASES: Record<string, MarketState> = {
  REGULAR: 'REGULAR',
  PRE: 'PRE',
  PREPRE: 'PRE',
  POST: 'POST',
  POSTPOST: 'POST',
  CLOSED: 'CLOSED',
  UNKNOWN: 'UNKNOWN',
}

export function marketStateOf(quote?: Quote | null): MarketState {
  const raw = (quote?.marketState ?? '').toUpperCase()
  return STATE_ALIASES[raw] ?? 'UNKNOWN'
}

export function marketIsOpen(quote?: Quote | null): boolean {
  return quote?.marketIsOpen === true
}

export function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Zone label such as "EST" / "JST" / "GMT+1", for compact display. */
export function zoneLabel(timeZone?: string | null, at: Date = new Date()): string {
  if (!timeZone) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(at)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

/** Format a UTC epoch (seconds) as a wall-clock time in the given zone. */
export function formatTimeInZone(epochSeconds?: number | null, timeZone?: string | null): string {
  if (!epochSeconds || !timeZone) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(epochSeconds * 1000))
  } catch {
    return '—'
  }
}

/** Format a UTC epoch (seconds) as "Mon 09:30" in the given zone. */
export function formatDayTimeInZone(epochSeconds?: number | null, timeZone?: string | null): string {
  if (!epochSeconds || !timeZone) return '—'
  try {
    const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(
      new Date(epochSeconds * 1000),
    )
    return `${day} ${formatTimeInZone(epochSeconds, timeZone)}`
  } catch {
    return '—'
  }
}

/** "09:30 – 16:00" in the exchange's own timezone. */
export function sessionRange(quote?: Quote | null): string {
  if (!quote?.marketSessionStart || !quote?.marketSessionEnd) return '—'
  const tz = quote.marketTimezone
  return `${formatTimeInZone(quote.marketSessionStart, tz)} – ${formatTimeInZone(quote.marketSessionEnd, tz)}`
}

function isSameDayInZone(epochSeconds: number, timeZone: string): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return fmt.format(new Date(epochSeconds * 1000)) === fmt.format(new Date())
  } catch {
    return false
  }
}

/**
 * When the next session opens, phrased relative to today: "09:30 EST" when it
 * is later today, "Mon 09:30 EST" when it is another day.
 */
export function formatOpenMoment(epochSeconds?: number | null, timeZone?: string | null): string {
  if (!epochSeconds || !timeZone) return '—'
  const time = formatTimeInZone(epochSeconds, timeZone)
  const zone = zoneLabel(timeZone)
  const suffix = zone ? ` ${zone}` : ''
  if (isSameDayInZone(epochSeconds, timeZone)) return `${time}${suffix}`
  return `${formatDayTimeInZone(epochSeconds, timeZone)}${suffix}`
}

/** The same session rendered in the viewer's own timezone. */
export function sessionRangeLocal(quote?: Quote | null): string {
  if (!quote?.marketSessionStart || !quote?.marketSessionEnd) return '—'
  const tz = userTimeZone()
  return `${formatTimeInZone(quote.marketSessionStart, tz)} – ${formatTimeInZone(quote.marketSessionEnd, tz)}`
}

export interface MarketStatusView {
  state: MarketState
  open: boolean
  label: string
  detail: string
  tone: 'positive' | 'negative' | 'warning' | 'neutral'
}

/** One-line, human summary of where the exchange stands right now. */
export function describeMarket(quote?: Quote | null): MarketStatusView | null {
  if (!quote || !quote.marketState) return null

  const state = marketStateOf(quote)
  const tz = quote.marketTimezone
  const zone = zoneLabel(tz)
  const open = marketIsOpen(quote)

  if (state === 'UNKNOWN') {
    return {
      state,
      open: false,
      label: 'Market status unknown',
      detail: 'This exchange does not publish trading hours.',
      tone: 'neutral',
    }
  }

  if (open) {
    const closes = quote.marketSessionEnd ? formatTimeInZone(quote.marketSessionEnd, tz) : ''
    return {
      state,
      open: true,
      label: 'Market open',
      detail: closes ? `Closes ${closes}${zone ? ` ${zone}` : ''}` : 'Trading now',
      tone: 'positive',
    }
  }

  const opens = formatOpenMoment(quote.marketNextOpen ?? quote.marketSessionStart, tz)

  if (state === 'PRE') {
    return {
      state,
      open: false,
      label: 'Pre-market',
      detail: opens !== '—' ? `Regular session ${opens}` : 'Before the open',
      tone: 'warning',
    }
  }

  if (state === 'POST') {
    return {
      state,
      open: false,
      label: 'After hours',
      detail: opens !== '—' ? `Next session ${opens}` : 'After the close',
      tone: 'warning',
    }
  }

  return {
    state,
    open: false,
    label: 'Market closed',
    detail: opens !== '—' ? `Opens ${opens}` : 'Not trading now',
    tone: 'neutral',
  }
}

/** Exchange region name, e.g. "New York" from "America/New_York". */
export function regionFromTimeZone(timeZone?: string | null): string {
  if (!timeZone) return ''
  const tail = timeZone.split('/').pop() ?? timeZone
  return tail.replace(/_/g, ' ')
}

export function sessionDateLabel(quote?: Quote | null): string {
  const day = quote?.marketTradingDay
  if (!day) return ''
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return day
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}