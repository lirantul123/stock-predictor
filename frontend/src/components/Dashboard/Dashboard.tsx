import { Chart } from '../Chart/Chart'
import { IndicatorPanel } from '../Indicators/IndicatorPanel'
import { PredictionPanel } from '../Predictions/PredictionPanel'
import { SignalGauge } from '../SignalGauge/SignalGauge'
import { MarketOverview } from '../MarketOverview/MarketOverview'
import { PriceTicker } from '../PriceTicker/PriceTicker'
import { useMarketStore, useUIStore } from '../../stores'
import { useMarketData, usePopularSymbols } from '../../hooks/useMarketData'
import { cn, formatPrice, formatChange, getChangeColor } from '../../utils/helpers'

export function Dashboard() {
  const { currentSymbol } = useMarketStore()
  const { selectedTimeframe, settings, indicatorPanelOpen, predictionPanelOpen, toggleIndicatorPanel, togglePredictionPanel } = useUIStore()

  const { quote, history, indicators, prediction, predictionError, isLoading, isError, error, refetch } = useMarketData(currentSymbol, selectedTimeframe)

  const changeColor = quote ? getChangeColor(quote.change) : 'neutral'

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
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Chart area */}
          <div className={cn(
            'flex-1 flex flex-col min-w-0 relative',
            indicatorPanelOpen && predictionPanelOpen && 'lg:w-[60%]',
            indicatorPanelOpen && !predictionPanelOpen && 'lg:w-[70%]',
            !indicatorPanelOpen && predictionPanelOpen && 'lg:w-[70%]',
          )}>
            <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none z-10">
              <div className="max-w-6xl mx-auto flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/20 border border-primary-500/30">
                    <span className="font-mono font-bold text-primary-300 text-sm">{currentSymbol}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{currentSymbol}</p>
                    <p className="text-xs text-slate-500">{selectedTimeframe} · Real-time data</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 border-l border-slate-800 pl-4">
                  {quote && (
                    <>
                      <span className={cn('text-xl font-bold font-mono', changeColor === 'up' && 'text-green-400', changeColor === 'down' && 'text-red-400', changeColor === 'neutral' && 'text-slate-400')}>
                        {formatPrice(quote.price)}
                      </span>
                      <span className={cn('text-sm font-mono', changeColor === 'up' && 'text-green-400', changeColor === 'down' && 'text-red-400', changeColor === 'neutral' && 'text-slate-400')}>
                        {formatChange(quote.change, quote.changePercent)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 relative min-h-0">
              <Chart
                data={history ?? []}
                predictions={prediction?.predictions ?? []}
                indicators={indicators ?? undefined}
                volume={settings.showVolume}
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
      <p className="text-slate-400 mb-6">
        Use the search bar to find a stock, then view interactive charts, technical indicators, and ML-powered predictions.
      </p>
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
