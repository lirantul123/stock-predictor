import { useEffect, useReducer } from 'react'
import type { IChartApi } from 'lightweight-charts'
import type { Trendline } from './trendlines'
import { projectTrendline, type ChartSeries } from './trendlineProjection'

interface TrendlineOverlayProps {
  chart: IChartApi | null
  series: ChartSeries | null
  lines: Trendline[]
  /** Plot size in CSS pixels; the overlay is sized to match. */
  width: number
  height: number
}

export function TrendlineOverlay({ chart, series, lines, width, height }: TrendlineOverlayProps) {
  // Repaint whenever the user pans/zooms, since pixel positions depend on the
  // visible range rather than on the data alone.
  const [, repaint] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!chart) return
    const handler = () => repaint()
    const timeScale = chart.timeScale()
    timeScale.subscribeVisibleLogicalRangeChange(handler)
    return () => timeScale.unsubscribeVisibleLogicalRangeChange(handler)
  }, [chart])

  if (!chart || !series || lines.length === 0 || width === 0 || height === 0) {
    return null
  }

  // The price scale sits inside the chart's width; keep lines out of it so they
  // stop at the plot edge instead of running under the axis labels.
  const axisWidth = chart.priceScale('right').width()
  const plotWidth = Math.max(0, width - axisWidth)

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {lines.map((line) => {
        if (!line.visible) return null
        const projected = projectTrendline(line, chart, series, plotWidth, height)
        if (!projected) return null
        const { a, b } = projected
        return (
          <line
            key={line.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={line.color}
            strokeWidth={line.lineWidth}
            strokeLinecap="round"
            strokeDasharray={line.mode === 'extended' ? '5 4' : undefined}
          />
        )
      })}
    </svg>
  )
}