import { useState, useCallback } from 'react'
import { Chart } from '../Chart/Chart'
import { chartTypes, type ChartType } from '../Chart/chartTypes'
import { IndicatorPanel } from '../Indicators/IndicatorPanel'
import { PredictionPanel } from '../Predictions/PredictionPanel'
import { SignalGauge } from '../SignalGauge/SignalGauge'
import { TechnicalSummary } from '../Analysis/TechnicalSummary'
import { KeyLevels } from '../Analysis/KeyLevels'
import { MarketOverview } from '../MarketOverview/MarketOverview'
import { PriceTicker } from '../PriceTicker/PriceTicker'
import { useMarketStore, useUIStore } from '../../stores'
import { useMarketData, usePopularSymbols } from '../../hooks/useMarketData'
import { cn } from '../../utils/helpers'
import type { IChartApi } from 'lightweight-charts'

export function Dashboard() {
  const { currentSymbol } = useMarketStore()
  const { selectedTimeframe, settings, indicatorPanelOpen, predictionPanelOpen, toggleIndicatorPanel, togglePredictionPanel } = useUIStore()
  const [chartType, setChartType] = useState<ChartType>('candles')
  const [chartApi, setChartApi] = useState<IChartApi | null>(null)

  const { quote, history, indicators, prediction, predictionError, isLoading, isError, error, refetch } = useMarketData(currentSymbol, selectedTimeframe)

  const handleChartReady = useCallback((api: IChartApi | null) => {
    setChartApi(api)
  }, [])

  if (!currentSymbol) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* Price ticker */}
      <PriceTicker className="z-10" />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Overview row */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md z-10">
          <MarketOverview quote={quote} />
        </div>

        {/* Chart + panels */}
        <div className="flex-1 flex overflow-hidden min-h-0 items-start">
          {/* Chart area */}
          <div className={cn(
            'flex-1 flex flex-col min-w-0 relative h-[calc(100vh-11rem)] min-h-[360px] max-h-[820px]',
            indicatorPanelOpen && predictionPanelOpen && 'lg:w-[60%]',
            indicatorPanelOpen && !predictionPanelOpen && 'lg:w-[70%]',
            !indicatorPanelOpen && predictionPanelOpen && 'lg:w-[70%]',
          )}>
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chart toolbar — kept above the chart so it never overlaps the graph */}
              <div className="flex-shrink-0 flex items-center justify-end px-3 py-1.5 border-b border-slate-800/50 bg-slate-950/60">
                <div className="flex items-center gap-0.5 rounded-lg border border-slate-700/70 bg-slate-900/85 p-1">
                  {chartTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setChartType(type.value)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
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
                    onClick={() => chartApi?.timeScale().fitContent()}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                    title="Fit all data"
                    aria-label="Fit chart"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3m0 8v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 relative min-h-0">
                <Chart
                  data={history ?? []}
                  symbol={currentSymbol}
                  predictions={settings.showPredictions ? prediction?.predictions ?? [] : []}
                  enabledIndicators={settings.enabledIndicators}
                  volume={settings.showVolume}
                  chartType={chartType}
                  onReady={handleChartReady}
                  className="h-full"
                />

                {isLoading && history?.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20">
                    <div className="h-10 w-10 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin mb-3" />
                    <p className="text-sm text-slate-400">Loading market data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right rail */}
          {(indicatorPanelOpen || predictionPanelOpen) && (
            <aside className={cn(
              'w-96 lg:w-[40%] flex-shrink-0 border-l border-slate-800/60 bg-slate-950/90 backdrop-blur-md overflow-y-auto z-10',
              !indicatorPanelOpen && predictionPanelOpen && 'lg:w-[30%]',
            )}>
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">Analysis</h3>
                <div className="flex gap-1.5">
                  {indicatorPanelOpen && (
                    <button
                      onClick={toggleIndicatorPanel}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                      aria-label="Close indicators"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {predictionPanelOpen && (
                    <button
                      onClick={togglePredictionPanel}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                      aria-label="Close predictions"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-5">
                {predictionPanelOpen && <SignalGauge prediction={prediction ?? null} unavailable={!!predictionError} />}
                <TechnicalSummary indicators={indicators ?? null} symbol={currentSymbol} />
                <KeyLevels history={history} indicators={indicators ?? null} />
                {indicatorPanelOpen && <IndicatorPanel indicators={indicators ?? null} enabledIndicators={settings.enabledIndicators} />}
                {predictionPanelOpen && <PredictionPanel prediction={prediction ?? null} unavailable={!!predictionError} />}
              </div>
            </aside>
          )}
        </div>

        {/* Error state */}
        {isError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            Error loading data: {error?.message ?? 'Unknown error'}
            <button onClick={refetch} className="ml-3 text-sm underline hover:text-red-300">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const { data: popularSymbols } = usePopularSymbols()
  const symbols = (popularSymbols ?? []).slice(0, 12)

  return (
    <div className="text-center max-w-md">
      <div className="mx-auto h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
        <svg className="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Select a Symbol</h2>
      <div className="grid grid-cols-3 gap-2">
        {symbols.map((sym) => (
          <button
            key={sym.symbol}
            title={sym.name}
            onClick={() => useMarketStore.getState().setCurrentSymbol(sym.symbol)}
            className="px-3 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-300 font-mono font-medium hover:bg-slate-800 hover:text-slate-100 hover:border-slate-600 transition-all"
          >
            {sym.symbol}
          </button>
        ))}
      </div>
    </div>
  )
}
