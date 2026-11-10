import { Chart } from '../Chart/Chart'
import { IndicatorPanel } from '../Indicators/IndicatorPanel'
import { PredictionPanel } from '../Predictions/PredictionPanel'
import { useMarketStore, useUIStore } from '../../stores'
import { useMarketData } from '../../hooks/useMarketData'
import { cn, formatPrice, formatChange, getChangeColor, formatNumber } from '../../utils/helpers'

export function Dashboard() {
  const { currentSymbol } = useMarketStore()
  const { selectedTimeframe, settings, indicatorPanelOpen, predictionPanelOpen, toggleIndicatorPanel, togglePredictionPanel } = useUIStore()

  const { quote, history, indicators, prediction, isLoading, isError, error, refetch } = useMarketData(currentSymbol, selectedTimeframe)

  const changeColor = quote ? getChangeColor(quote.change) : 'neutral'

  if (!currentSymbol) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-slate-700"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-slate-100">Select a Symbol</h2>
          <p className="mt-2 text-slate-400">
            Use the search bar in the header to find and select a stock symbol to view charts, indicators, and predictions.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
            {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'SPY'].map((sym) => (
              <button
                key={sym}
                onClick={() => useMarketStore.getState().setCurrentSymbol(sym)}
                className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors font-mono"
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-lg font-bold text-slate-100 font-mono">{currentSymbol}</p>
              {quote && (
                <p className="text-sm text-slate-400">{quote.price > 0 ? 'Real-time quote' : 'Market closed'}</p>
              )}
            </div>
            {quote && (
              <div className="flex items-center gap-4 ml-4 border-l border-slate-800 pl-4">
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-slate-100">{formatPrice(quote.price)}</p>
                  <p className={cn('text-sm font-mono', changeColor === 'up' && 'text-green-400', changeColor === 'down' && 'text-red-400', changeColor === 'neutral' && 'text-slate-400')}>
                    {formatChange(quote.change, quote.changePercent)}
                  </p>
                </div>
                <div className="text-right border-l border-slate-800 pl-4 ml-4">
                  <p className="text-xs text-slate-500">High / Low</p>
                  <p className="text-sm font-mono text-slate-100">{formatPrice(quote.high)} / {formatPrice(quote.low)}</p>
                </div>
                <div className="text-right border-l border-slate-800 pl-4 ml-4">
                  <p className="text-xs text-slate-500">Volume</p>
                  <p className="text-sm font-mono text-slate-100">{formatNumber(quote.volume)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="btn-secondary"
            >
              <svg className={cn('h-4 w-4', isLoading && 'animate-spin')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>

            <button
              onClick={toggleIndicatorPanel}
              className={cn('btn-secondary', indicatorPanelOpen && 'bg-primary-500/20 border-primary-500/30 text-primary-300')}
            >
              Indicators
            </button>

            <button
              onClick={togglePredictionPanel}
              className={cn('btn-secondary', predictionPanelOpen && 'bg-primary-500/20 border-primary-500/30 text-primary-300')}
            >
              Predictions
            </button>
          </div>
        </div>
      </div>

      {isError && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
          Error loading data: {error?.message ?? 'Unknown error'}
          <button onClick={refetch} className="ml-2 underline hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className={cn('flex-1 flex flex-col min-w-0', indicatorPanelOpen && predictionPanelOpen && 'lg:max-w-[50%]', indicatorPanelOpen && !predictionPanelOpen && 'lg:max-w-[65%]', !indicatorPanelOpen && predictionPanelOpen && 'lg:max-w-[65%]')}>
          <div className="flex-1 relative min-h-0">
            <Chart
              data={history ?? []}
              predictions={prediction?.predictions}
              indicators={indicators ?? undefined}
              volume={settings.showVolume}
              height={500}
            />
            {isLoading && history?.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                <svg className="h-8 w-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {(indicatorPanelOpen || predictionPanelOpen) && (
          <aside className={cn('w-80 lg:w-96 flex-shrink-0 border-l border-slate-800 bg-slate-950/50 backdrop-blur-sm overflow-y-auto', !indicatorPanelOpen && predictionPanelOpen && 'lg:w-96')}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">Analysis</h3>
              <div className="flex gap-1">
                {indicatorPanelOpen && (
                  <button
                    onClick={toggleIndicatorPanel}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-100"
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
                    className="p-1.5 rounded text-slate-400 hover:text-slate-100"
                    aria-label="Close predictions"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 space-y-6">
              {indicatorPanelOpen && <IndicatorPanel indicators={indicators ?? null} enabledIndicators={settings.enabledIndicators} />}
              {predictionPanelOpen && <PredictionPanel prediction={prediction ?? null} />}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}