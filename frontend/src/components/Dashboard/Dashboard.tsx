import { useState, useCallback } from 'react'
import { Chart } from '../Chart/Chart'
import { chartTypes, type ChartType } from '../Chart/chartTypes'
import { IndicatorPanel } from '../Indicators/IndicatorPanel'
import { PredictionPanel } from '../Predictions/PredictionPanel'
import { MLControls } from '../Predictions/MLControls'
import { SignalGauge } from '../SignalGauge/SignalGauge'
import { TechnicalSummary } from '../Analysis/TechnicalSummary'
import { KeyLevels } from '../Analysis/KeyLevels'
import { MarketOverview } from '../MarketOverview/MarketOverview'
import { PriceTicker } from '../PriceTicker/PriceTicker'
import { Section } from '../Common/Section'
import { useMarketStore, useUIStore } from '../../stores'
import { useMarketData, usePopularSymbols } from '../../hooks/useMarketData'
import { cn, formatPrice, formatChange } from '../../utils/helpers'
import type { IChartApi } from 'lightweight-charts'

export function Dashboard() {
  const { currentSymbol } = useMarketStore()
  const { selectedTimeframe, settings, indicatorPanelOpen, predictionPanelOpen, predictionHorizon, setPredictionHorizon, toggleIndicatorPanel, togglePredictionPanel } = useUIStore()
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

  const isUp = (quote?.change ?? 0) >= 0
  const bothSections = indicatorPanelOpen && predictionPanelOpen

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-slate-950">
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md">
        <PriceTicker />
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-4 sm:px-4 lg:px-6">
        {/* Market snapshot — compact, scannable */}
        <MarketOverview quote={quote} symbol={currentSymbol} />

        {/* Chart card — the primary focus */}
        <section
          aria-label={`${currentSymbol} price chart`}
          className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/30"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <h1 className="font-mono text-base font-bold text-slate-100">{currentSymbol}</h1>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                    {selectedTimeframe}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-bold leading-none text-slate-50">
                    {quote ? formatPrice(quote.price) : '—'}
                  </span>
                  {quote && (
                    <span
                      className={cn(
                        'font-mono text-xs font-semibold',
                        isUp ? 'text-green-400' : 'text-red-400',
                      )}
                    >
                      {formatChange(quote.change, quote.changePercent)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-900/85 p-1">
              {chartTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setChartType(type.value)}
                  aria-pressed={chartType === type.value}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    chartType === type.value
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
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
          </header>

          <div className="relative h-[clamp(340px,52vh,620px)]">
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
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90">
                <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
                <p className="text-sm text-slate-400">Loading market data...</p>
              </div>
            )}
          </div>
        </section>

        {isError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            Error loading data: {error?.message ?? 'Unknown error'}
            <button onClick={refetch} className="ml-3 underline hover:text-red-300">
              Retry
            </button>
          </div>
        )}

        {/* Deep analysis — two complementary sections below the chart */}
        <div className={cn('grid gap-4', bothSections && 'xl:grid-cols-2')}>
          {predictionPanelOpen && (
            <Section
              id="ml-insights"
              tone="ml"
              title="ML Insights"
              subtitle="LSTM forecasts, confidence and model signals"
              icon="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7z"
              action={
                <button
                  onClick={togglePredictionPanel}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Hide ML Insights"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2.5">
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Current Price</p>
                    <p className="font-mono text-base font-bold leading-tight text-slate-100">
                      {quote ? formatPrice(quote.price) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">Target</p>
                    <p className={cn(
                      'font-mono text-base font-bold leading-tight',
                      (prediction?.predictions?.[prediction.predictions.length - 1]?.predictedClose ?? 0) >= (prediction?.currentPrice ?? 0)
                        ? 'text-green-400'
                        : 'text-red-400',
                    )}>
                      {prediction?.predictions?.length
                        ? formatPrice(prediction.predictions[prediction.predictions.length - 1].predictedClose)
                        : '—'}
                    </p>
                  </div>
                </div>

                <MLControls horizon={predictionHorizon} onHorizonChange={setPredictionHorizon} />

                <SignalGauge prediction={prediction ?? null} unavailable={!!predictionError} />
                <PredictionPanel prediction={prediction ?? null} unavailable={!!predictionError} />
              </div>
            </Section>
          )}

          {indicatorPanelOpen && (
            <Section
              id="stock-analysis"
              tone="analysis"
              title="Stock Analysis"
              subtitle="Technical indicators, key levels and momentum"
              icon="M4 19V9m5 10V5m5 14v-7m5 7V8"
              action={
                <button
                  onClick={toggleIndicatorPanel}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Hide Stock Analysis"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              }
            >
              <div className="space-y-4">
                <TechnicalSummary indicators={indicators ?? null} symbol={currentSymbol} />
                <KeyLevels history={history} indicators={indicators ?? null} />
                <IndicatorPanel indicators={indicators ?? null} enabledIndicators={settings.enabledIndicators} />
              </div>
            </Section>
          )}
        </div>

        {!indicatorPanelOpen && !predictionPanelOpen && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-4 py-10 text-center">
            <p className="text-sm text-slate-400">Analysis sections are hidden</p>
            <p className="mt-1 text-xs text-slate-600">
              Use the ML button in the header to show ML Insights or Stock Analysis.
            </p>
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
    <div className="max-w-md text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
        <svg className="h-8 w-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="mb-3 text-2xl font-bold text-slate-100">Select a Symbol</h2>
      <div className="grid grid-cols-3 gap-2">
        {symbols.map((sym) => (
          <button
            key={sym.symbol}
            title={sym.name}
            onClick={() => useMarketStore.getState().setCurrentSymbol(sym.symbol)}
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 font-mono font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
          >
            {sym.symbol}
          </button>
        ))}
      </div>
    </div>
  )
}