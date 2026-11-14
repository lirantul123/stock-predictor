import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
  ChartOptions,
  DeepPartial,
  LineStyle,
  LineWidth,
  ColorType,
  MouseEventParams,
  IPriceLine,
} from 'lightweight-charts'
import type { PricePoint, PredictionPoint } from '../../types'
import { cn, formatTimestamp, formatVolume as formatVolumeLabel } from '../../utils/helpers'
import { useUIStore } from '../../stores'

type ChartType = 'candles' | 'line' | 'area'

interface LegendData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartProps {
  data: PricePoint[]
  symbol?: string
  predictions?: PredictionPoint[]
  enabledIndicators?: string[]
  volume?: boolean
  height?: number
  className?: string
}

const chartTypes: { value: ChartType; label: string }[] = [
  { value: 'candles', label: 'Candles' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
]

const EMPTY_INDICATORS: string[] = []

export function Chart({
  data,
  symbol,
  predictions,
  enabledIndicators = EMPTY_INDICATORS,
  volume = true,
  height,
  className,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const lastPriceLineRef = useRef<IPriceLine | null>(null)
  const [chartType, setChartType] = useState<ChartType>('candles')
  const [legend, setLegend] = useState<LegendData | null>(null)
  const theme = useUIStore((s) => s.settings.theme)
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const chartBg = isDark ? '#0f172a' : '#f8fafc'
  const chartText = isDark ? '#64748b' : '#475569'
  const chartGrid = isDark ? '#1e293b' : '#e2e8f0'
  const chartBorder = isDark ? '#334155' : '#cbd5e1'

  const normalize = useCallback((points: PricePoint[]): PricePoint[] => {
    const seen = new Set<number>()
    return points
      .filter((p) => {
        if (seen.has(p.timestamp)) return false
        seen.add(p.timestamp)
        return true
      })
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [])

  const formatData = useCallback(
    (points: PricePoint[]): CandlestickData[] =>
      normalize(points).map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      })),
    [normalize]
  )

  const formatLine = useCallback(
    (points: PricePoint[]): LineData[] =>
      normalize(points).map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        value: p.close,
      })),
    [normalize]
  )

  const formatVolumeData = useCallback(
    (points: PricePoint[]): HistogramData[] =>
      normalize(points).map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
      })),
    [normalize]
  )

  const formatPrediction = useCallback(
    (points: PredictionPoint[]): LineData[] =>
      points.map((p) => ({
        time: (new Date(p.date).getTime() / 1000) as UTCTimestamp,
        value: p.predictedClose,
      })),
    []
  )

  const formatBands = useCallback(
    (points: PredictionPoint[], bound: 'upperBound' | 'lowerBound'): LineData[] =>
      points.map((p) => ({
        time: (new Date(p.date).getTime() / 1000) as UTCTimestamp,
        value: p[bound],
      })),
    []
  )

  const formatSMA = useCallback((points: PricePoint[], period: number): LineData[] => {
    const result: LineData[] = []
    if (points.length < period) return result
    for (let i = period - 1; i < points.length; i++) {
      let sum = 0
      for (let j = 0; j < period; j++) sum += points[i - j].close
      result.push({
        time: (points[i].timestamp / 1000) as UTCTimestamp,
        value: sum / period,
      })
    }
    return result
  }, [])

  const formatEMA = useCallback((points: PricePoint[], period: number): LineData[] => {
    const result: LineData[] = []
    if (points.length < period) return result
    const multiplier = 2 / (period + 1)
    let ema = points[0].close
    points.forEach((p, i) => {
      ema = i === 0 ? p.close : (p.close - ema) * multiplier + ema
      if (i >= period - 1) {
        result.push({
          time: (p.timestamp / 1000) as UTCTimestamp,
          value: ema,
        })
      }
    })
    return result
  }, [])

  const formatBollinger = useCallback((points: PricePoint[], period = 20, stdDev = 2) => {
    const upper: LineData[] = []
    const middle: LineData[] = []
    const lower: LineData[] = []
    if (points.length < period) return { upper, middle, lower }

    for (let i = period - 1; i < points.length; i++) {
      const window = points.slice(i - period + 1, i + 1)
      const mean = window.reduce((sum, p) => sum + p.close, 0) / period
      const variance = window.reduce((sum, p) => sum + (p.close - mean) ** 2, 0) / period
      const deviation = Math.sqrt(variance) * stdDev
      const time = (points[i].timestamp / 1000) as UTCTimestamp
      upper.push({ time, value: mean + deviation })
      middle.push({ time, value: mean })
      lower.push({ time, value: mean - deviation })
    }

    return { upper, middle, lower }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: chartBg },
        textColor: chartText,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: chartGrid },
        horzLines: { color: chartGrid },
      },
      rightPriceScale: {
        borderColor: chartBorder,
        scaleMargins: { top: 0.12, bottom: 0.12 },
        autoScale: true,
      },
      timeScale: {
        borderColor: chartBorder,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 3,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#64748b', width: 1, style: LineStyle.Dotted },
        horzLine: { color: '#64748b', width: 1, style: LineStyle.Dotted },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      watermark: {
        visible: !!symbol,
        text: symbol ?? '',
        color: 'rgba(148, 163, 184, 0.06)',
        fontSize: 52,
        horzAlign: 'center',
        vertAlign: 'center',
      },
    } as DeepPartial<ChartOptions>)

    chartRef.current = chart

    if (height) chart.applyOptions({ height })

    let mainSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>

    if (chartType === 'candles') {
      const series = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
        priceScaleId: 'right',
      })
      series.setData(formatData(data))
      mainSeries = series
    } else if (chartType === 'line') {
      const series = chart.addLineSeries({
        color: '#60a5fa',
        lineWidth: 2 as LineWidth,
        priceScaleId: 'right',
        title: symbol ? `${symbol} close` : 'Close',
      })
      series.setData(formatLine(data))
      mainSeries = series
    } else {
      const series = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.32)',
        bottomColor: 'rgba(59, 130, 246, 0.02)',
        lineColor: '#60a5fa',
        lineWidth: 2 as LineWidth,
        priceScaleId: 'right',
        title: symbol ? `${symbol} close` : 'Close',
      })
      series.setData(formatLine(data))
      mainSeries = series
    }

    if (data.length > 0) {
      const last = data[data.length - 1]
      lastPriceLineRef.current = mainSeries.createPriceLine({
        price: last.close,
        color: last.close >= last.open ? '#22c55e' : '#ef4444',
        lineWidth: 1 as LineWidth,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Last',
      })
    }

    if (volume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#64748b',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      volumeSeries.setData(formatVolumeData(data))
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
        borderVisible: false,
      })
    }

    if (enabledIndicators.includes('sma')) {
      if (formatSMA(data, 20).length > 0) {
        chart.addLineSeries({
          color: '#f59e0b',
          lineWidth: 1 as LineWidth,
          priceScaleId: 'right',
          title: 'SMA 20',
        }).setData(formatSMA(data, 20))
      }
      if (formatSMA(data, 50).length > 0) {
        chart.addLineSeries({
          color: '#8b5cf6',
          lineWidth: 1 as LineWidth,
          priceScaleId: 'right',
          title: 'SMA 50',
        }).setData(formatSMA(data, 50))
      }
    }

    if (enabledIndicators.includes('ema')) {
      if (formatEMA(data, 20).length > 0) {
        chart.addLineSeries({
          color: '#22d3ee',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dashed,
          priceScaleId: 'right',
          title: 'EMA 20',
        }).setData(formatEMA(data, 20))
      }
      if (formatEMA(data, 50).length > 0) {
        chart.addLineSeries({
          color: '#f472b6',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dashed,
          priceScaleId: 'right',
          title: 'EMA 50',
        }).setData(formatEMA(data, 50))
      }
    }

    if (enabledIndicators.includes('bollingerBands')) {
      const bands = formatBollinger(data)
      if (bands.upper.length > 0) {
        chart.addLineSeries({
          color: 'rgba(139, 92, 246, 0.45)',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dotted,
          priceScaleId: 'right',
          title: 'BB Upper',
        }).setData(bands.upper)
        chart.addLineSeries({
          color: 'rgba(139, 92, 246, 0.3)',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dotted,
          priceScaleId: 'right',
          title: 'BB Middle',
        }).setData(bands.middle)
        chart.addLineSeries({
          color: 'rgba(139, 92, 246, 0.45)',
          lineWidth: 1 as LineWidth,
          lineStyle: LineStyle.Dotted,
          priceScaleId: 'right',
          title: 'BB Lower',
        }).setData(bands.lower)
      }
    }

    if (predictions && predictions.length > 0) {
      const predictionSeries = chart.addLineSeries({
        color: '#a78bfa',
        lineWidth: 2 as LineWidth,
        lineStyle: LineStyle.Dashed,
        priceScaleId: 'right',
        title: 'Forecast',
      })
      predictionSeries.setData(formatPrediction(predictions))

      const upperSeries = chart.addLineSeries({
        color: 'rgba(167, 139, 250, 0.35)',
        lineWidth: 1 as LineWidth,
        lineStyle: LineStyle.Dotted,
        priceScaleId: 'right',
        title: 'Upper',
      })
      upperSeries.setData(formatBands(predictions, 'upperBound'))

      const lowerSeries = chart.addLineSeries({
        color: 'rgba(167, 139, 250, 0.35)',
        lineWidth: 1 as LineWidth,
        lineStyle: LineStyle.Dotted,
        priceScaleId: 'right',
        title: 'Lower',
      })
      lowerSeries.setData(formatBands(predictions, 'lowerBound'))

      const target = predictions[predictions.length - 1]
      predictionSeries.createPriceLine({
        price: target.predictedClose,
        color: '#a78bfa',
        lineWidth: 1 as LineWidth,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target',
      })
    }

    const pointsByTime = new Map(data.map((p) => [p.timestamp / 1000, p]))

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.time) {
        setLegend(null)
        return
      }
      const point = pointsByTime.get(Number(param.time))
      setLegend(
        point
          ? {
              time: point.timestamp,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close,
              volume: point.volume,
            }
          : null
      )
    })

    let resizeFrame = 0
    const handleResize = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        if (!containerRef.current) return
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: height ?? containerRef.current.clientHeight,
        })
      })
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      cancelAnimationFrame(resizeFrame)
      resizeObserver.disconnect()
      lastPriceLineRef.current = null
      chart.remove()
      chartRef.current = null
    }
  }, [
    data,
    symbol,
    predictions,
    enabledIndicators,
    volume,
    height,
    chartType,
    isDark,
    chartBg,
    chartText,
    chartGrid,
    chartBorder,
    formatData,
    formatLine,
    formatVolumeData,
    formatPrediction,
    formatBands,
    formatSMA,
    formatEMA,
    formatBollinger,
  ])

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div ref={containerRef} className="w-full h-full" style={height ? { height } : undefined} />

      <div className="absolute top-20 right-3 z-10 flex items-center gap-0.5 rounded-lg border border-slate-700/70 bg-slate-900/85 p-1 backdrop-blur">
        {chartTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setChartType(type.value)}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
              chartType === type.value
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            {type.label}
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-slate-700" />
        <button
          onClick={() => chartRef.current?.timeScale().fitContent()}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          title="Fit all data"
          aria-label="Fit chart"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3m0 8v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
          </svg>
        </button>
      </div>

      {legend && (
        <div className="pointer-events-none absolute bottom-9 left-3 z-10 flex items-center gap-3 rounded-lg border border-slate-800/70 bg-slate-950/75 px-3 py-1.5 font-mono text-[11px] backdrop-blur">
          <span className="text-slate-500">
            {formatTimestamp(legend.time * 1000, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-slate-500">
            O <span className={legend.close >= legend.open ? 'text-green-400' : 'text-red-400'}>{legend.open.toFixed(2)}</span>
          </span>
          <span className="text-slate-500">
            H <span className={legend.close >= legend.open ? 'text-green-400' : 'text-red-400'}>{legend.high.toFixed(2)}</span>
          </span>
          <span className="text-slate-500">
            L <span className={legend.close >= legend.open ? 'text-green-400' : 'text-red-400'}>{legend.low.toFixed(2)}</span>
          </span>
          <span className="text-slate-500">
            C <span className={legend.close >= legend.open ? 'text-green-400' : 'text-red-400'}>{legend.close.toFixed(2)}</span>
          </span>
          <span className="text-slate-500">
            V <span className="text-slate-300">{formatVolumeLabel(legend.volume)}</span>
          </span>
        </div>
      )}
    </div>
  )
}