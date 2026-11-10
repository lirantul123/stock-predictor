import { useEffect, useRef, useCallback } from 'react'
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
} from 'lightweight-charts'
import type { PricePoint, PredictionPoint, TechnicalIndicators } from '../../types'
import { cn } from '../../utils/helpers'

interface ChartProps {
  data: PricePoint[]
  predictions?: PredictionPoint[]
  indicators?: TechnicalIndicators
  volume?: boolean
  height?: number
  className?: string
}

export function Chart({
  data,
  predictions,
  indicators,
  volume = true,
  height = 500,
  className,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const predictionSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const upperBandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const lowerBandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const formatData = useCallback(
    (points: PricePoint[]): CandlestickData[] => {
      return points.map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }))
    },
    []
  )

  const formatVolume = useCallback(
    (points: PricePoint[]): HistogramData[] => {
      return points.map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }))
    },
    []
  )

  const formatPrediction = useCallback(
    (points: PredictionPoint[]): LineData[] => {
      return points.map((p) => ({
        time: (new Date(p.date).getTime() / 1000) as UTCTimestamp,
        value: p.predictedClose,
      }))
    },
    []
  )

  const formatBands = useCallback(
    (points: PredictionPoint[], bound: 'upperBound' | 'lowerBound'): LineData[] => {
      return points.map((p) => ({
        time: (new Date(p.date).getTime() / 1000) as UTCTimestamp,
        value: p[bound],
      }))
    },
    []
  )

  const formatSMA = useCallback(
    (points: PricePoint[], period: number): LineData[] => {
      const result: LineData[] = []
      for (let i = period - 1; i < points.length; i++) {
        let sum = 0
        for (let j = 0; j < period; j++) {
          sum += points[i - j].close
        }
        result.push({
          time: (points[i].timestamp / 1000) as UTCTimestamp,
          value: sum / period,
        })
      }
      return result
    },
    []
  )

  useEffect(() => {
    if (!containerRef.current) return

    const chartOptions: DeepPartial<ChartOptions> = {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#475569', width: 1, style: 2 },
        horzLine: { color: '#475569', width: 1, style: 2 },
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
    }

    const chart = createChart(containerRef.current, chartOptions)
    chartRef.current = chart

    chart.applyOptions({
      height,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceScaleId: 'right',
    })
    candleSeriesRef.current = candleSeries
    candleSeries.setData(formatData(data))

    if (volume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#64748b',
        priceScaleId: 'volume',
        priceFormat: { type: 'volume' },
      })
      volumeSeriesRef.current = volumeSeries
      volumeSeries.setData(formatVolume(data))

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.7, bottom: 0 },
        borderVisible: false,
      })
    }

    if (predictions && predictions.length > 0) {
      const predSeries = chart.addLineSeries({
        color: '#0ea5e9',
        lineWidth: 2 as LineWidth,
        lineStyle: 2 as LineStyle,
        priceScaleId: 'right',
        title: 'Prediction',
      })
      predictionSeriesRef.current = predSeries
      predSeries.setData(formatPrediction(predictions))

      const upperSeries = chart.addLineSeries({
        color: 'rgba(14, 165, 233, 0.3)',
        lineWidth: 1 as LineWidth,
        lineStyle: 3 as LineStyle,
        priceScaleId: 'right',
      })
      upperBandSeriesRef.current = upperSeries
      upperSeries.setData(formatBands(predictions, 'upperBound'))

      const lowerSeries = chart.addLineSeries({
        color: 'rgba(14, 165, 233, 0.3)',
        lineWidth: 1 as LineWidth,
        lineStyle: 3 as LineStyle,
        priceScaleId: 'right',
      })
      lowerBandSeriesRef.current = lowerSeries
      lowerSeries.setData(formatBands(predictions, 'lowerBound'))

      const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(14, 165, 233, 0.1)',
        bottomColor: 'rgba(14, 165, 233, 0.02)',
        lineWidth: 0 as LineWidth,
        priceScaleId: 'right',
      })
      areaSeries.setData([
        ...formatBands(predictions, 'upperBound').map((p) => ({ ...p, value: p.value })),
        ...formatBands(predictions, 'lowerBound').reverse().map((p) => ({ ...p, value: p.value })),
      ])
    }

    if (indicators?.sma20) {
      const sma20Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1.5 as LineWidth,
        priceScaleId: 'right',
        title: 'SMA 20',
      })
      sma20SeriesRef.current = sma20Series
      sma20Series.setData(formatSMA(data, 20))
    }

    if (indicators?.sma50) {
      const sma50Series = chart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 1.5 as LineWidth,
        priceScaleId: 'right',
        title: 'SMA 50',
      })
      sma50SeriesRef.current = sma50Series
      sma50Series.setData(formatSMA(data, 50))
    }

    if (indicators?.bollingerBands) {
      const upperSeries = chart.addLineSeries({
        color: 'rgba(139, 92, 246, 0.5)',
        lineWidth: 1 as LineWidth,
        lineStyle: 2 as LineStyle,
        priceScaleId: 'right',
        title: 'BB Upper',
      })
      upperSeries.setData(data.map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        value: indicators.bollingerBands!.upper,
      })))

      const lowerSeries = chart.addLineSeries({
        color: 'rgba(139, 92, 246, 0.5)',
        lineWidth: 1 as LineWidth,
        lineStyle: 2 as LineStyle,
        priceScaleId: 'right',
        title: 'BB Lower',
      })
      lowerSeries.setData(data.map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        value: indicators.bollingerBands!.lower,
      })))
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height,
        })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      predictionSeriesRef.current = null
      upperBandSeriesRef.current = null
      lowerBandSeriesRef.current = null
      sma20SeriesRef.current = null
      sma50SeriesRef.current = null
      chart.remove()
    }
  }, [data, predictions, indicators, volume, height, formatData, formatVolume, formatPrediction, formatBands, formatSMA])

  useEffect(() => {
    if (candleSeriesRef.current && data.length > 0) {
      candleSeriesRef.current.setData(formatData(data))
    }
    if (volumeSeriesRef.current && data.length > 0) {
      volumeSeriesRef.current.setData(formatVolume(data))
    }
    if (sma20SeriesRef.current && data.length > 0 && indicators?.sma20) {
      sma20SeriesRef.current.setData(formatSMA(data, 20))
    }
    if (sma50SeriesRef.current && data.length > 0 && indicators?.sma50) {
      sma50SeriesRef.current.setData(formatSMA(data, 50))
    }
  }, [data, indicators, formatData, formatVolume, formatSMA])

  return <div ref={containerRef} className={cn('w-full', className)} style={{ height }} />
}