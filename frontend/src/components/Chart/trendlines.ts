export type TrendlineMode = 'line' | 'ray' | 'extended' | 'horizontal' | 'vertical'

export interface Trendline {
  id: string
  mode: TrendlineMode
  color: string
  lineWidth: 1 | 2 | 3
  price1: number
  price2: number
  time1: number // seconds (UTCTimestamp)
  time2: number
  visible: boolean
  createdAt: number
  label?: string
}

export const LINE_COLORS = [
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#a78bfa',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

export const LINE_WIDTHS: (1 | 2 | 3)[] = [1, 2, 3]

/** Seconds since epoch — used as the lightweight-charts time coordinate. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function createTrendline(
  mode: TrendlineMode,
  price1: number,
  price2: number,
  time1: number,
  time2: number,
  opts: Partial<Omit<Trendline, 'id' | 'mode' | 'price1' | 'price2' | 'time1' | 'time2'>> = {},
): Trendline {
  return {
    id: `tl-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`,
    mode,
    color: opts.color ?? '#f59e0b',
    lineWidth: opts.lineWidth ?? 2,
    price1,
    price2,
    time1,
    time2,
    visible: opts.visible ?? true,
    createdAt: nowSeconds(),
    label: opts.label,
  }
}

/** Resolve the two price endpoints of a trendline for a given time. */
export function linePriceAt(line: Trendline, time: number): number | null {
  if (line.mode === 'horizontal') return line.price1
  if (line.mode === 'vertical') return null
  if (line.time1 === line.time2) return null
  const t = (time - line.time1) / (line.time2 - line.time1)
  return line.price1 + (line.price2 - line.price1) * t
}

/** Whether the line should be drawn through a given time, given its mode. */
export function inRange(line: Trendline, time: number): boolean {
  if (line.mode === 'horizontal' || line.mode === 'vertical') return true
  const t = (time - line.time1) / (line.time2 - line.time1)
  if (line.mode === 'line') return t >= 0 && t <= 1
  if (line.mode === 'ray') return t >= 0
  return true // extended
}

/** Render a trendline as an SVG path inside a chart overlay. */
export function trendlinePath(
  line: Trendline,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { d: string; xEnd: number } {
  if (line.mode === 'vertical') {
    return { d: `M${x1} ${y1} L${x1} ${y2}`, xEnd: x1 }
  }
  return { d: `M${x1} ${y1} L${x2} ${y2}`, xEnd: x2 }
}