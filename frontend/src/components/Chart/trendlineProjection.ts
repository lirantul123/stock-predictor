import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import type { Trendline } from './trendlines'

export interface Point {
  x: number
  y: number
}

export type ChartSeries = ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>

/**
 * Extend a segment to the plot rectangle.
 *
 * `mode` decides how far past the two anchors the line is drawn:
 *   line      -> exactly between the anchors (t 0..1)
 *   ray       -> from the first anchor, through the second, to the edge
 *   extended  -> across the whole plot, both directions
 */
function extendToRect(
  p1: Point,
  p2: Point,
  width: number,
  height: number,
  mode: Trendline['mode'],
): [Point, Point] {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  if (dx === 0 && dy === 0) return [p1, p2]
  if (mode === 'line') return [p1, p2]

  let tMin = Number.NEGATIVE_INFINITY
  let tMax = Number.POSITIVE_INFINITY

  if (dx !== 0) {
    const a = (0 - p1.x) / dx
    const b = (width - p1.x) / dx
    tMin = Math.max(tMin, Math.min(a, b))
    tMax = Math.min(tMax, Math.max(a, b))
  }
  if (dy !== 0) {
    const a = (0 - p1.y) / dy
    const b = (height - p1.y) / dy
    tMin = Math.max(tMin, Math.min(a, b))
    tMax = Math.min(tMax, Math.max(a, b))
  }

  const from = mode === 'extended' ? tMin : 0

  return [
    { x: p1.x + dx * from, y: p1.y + dy * from },
    { x: p1.x + dx * tMax, y: p1.y + dy * tMax },
  ]
}

/** Project a trendline into pixel space, or null when it cannot be placed. */
export function projectTrendline(
  line: Trendline,
  chart: IChartApi,
  series: ChartSeries,
  width: number,
  height: number,
): { a: Point; b: Point } | null {
  const timeScale = chart.timeScale()

  if (line.mode === 'horizontal') {
    const y = series.priceToCoordinate(line.price1)
    if (y == null) return null
    return { a: { x: 0, y }, b: { x: width, y } }
  }

  if (line.mode === 'vertical') {
    const x = timeScale.timeToCoordinate(line.time1 as UTCTimestamp)
    if (x == null) return null
    return { a: { x, y: 0 }, b: { x, y: height } }
  }

  const x1 = timeScale.timeToCoordinate(line.time1 as UTCTimestamp)
  const x2 = timeScale.timeToCoordinate(line.time2 as UTCTimestamp)
  const y1 = series.priceToCoordinate(line.price1)
  const y2 = series.priceToCoordinate(line.price2)
  if (x1 == null || x2 == null || y1 == null || y2 == null) return null

  const [a, b] = extendToRect({ x: x1, y: y1 }, { x: x2, y: y2 }, width, height, line.mode)
  return { a, b }
}

/**
 * Nearest trendline to a click, in pixel space.
 *
 * Used by the erase tool: returns the id of the closest line within
 * `threshold` pixels, so a click near a line removes it.
 */
export function hitTestTrendline(
  lines: Trendline[],
  chart: IChartApi,
  series: ChartSeries,
  point: Point,
  width: number,
  height: number,
  threshold = 8,
): string | null {
  let best: { id: string; dist: number } | null = null

  for (const line of lines) {
    if (!line.visible) continue
    const projected = projectTrendline(line, chart, series, width, height)
    if (!projected) continue

    const { a, b } = projected
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy

    let t = 0
    if (lengthSq > 0) {
      t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq
      t = Math.max(0, Math.min(1, t))
    }
    const dist = Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t))

    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { id: line.id, dist }
    }
  }

  return best?.id ?? null
}