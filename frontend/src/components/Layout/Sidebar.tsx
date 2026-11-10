import { useState } from 'react'
import { cn } from '../../utils/helpers'
import { useWatchlistStore, useMarketStore } from '../../stores'
import type { WatchlistItem } from '../../types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ExpandedSections {
  watchlist: boolean
  recent: boolean
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    watchlist: true,
    recent: true,
  })

  const { items, removeItem } = useWatchlistStore()
  const { currentSymbol, setCurrentSymbol } = useMarketStore()

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSymbolClick = (symbol: string) => {
    setCurrentSymbol(symbol)
    onClose()
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 glass border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800 lg:hidden">
            <span className="font-semibold text-slate-100">Menu</span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <button
                onClick={() => toggleSection('watchlist')}
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide hover:text-slate-300"
              >
                <span>Watchlist</span>
                <svg
                  className={cn(
                    'h-4 w-4 transition-transform',
                    expandedSections.watchlist ? 'rotate-0' : '-rotate-90'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {expandedSections.watchlist && (
                <div className="mt-2 space-y-1">
                  {items.length === 0 ? (
                    <div className="px-2 py-4 text-center text-slate-500 text-sm">
                      No symbols in watchlist. Search and click the star to add.
                    </div>
                  ) : (
                    items.map((item: WatchlistItem) => (
                      <button
                        key={item.symbol}
                        onClick={() => handleSymbolClick(item.symbol)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          currentSymbol === item.symbol
                            ? 'bg-primary-500/20 text-primary-300'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                        )}
                      >
                        <span className="font-mono font-medium flex-1 text-left truncate">{item.symbol}</span>
                        <svg
                          className="h-4 w-4 text-yellow-400 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeItem(item.symbol)
                          }}
                          className="p-1 text-slate-500 hover:text-red-400"
                          aria-label="Remove from watchlist"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wide">Quick Actions</p>
              <div className="space-y-1 mt-2">
                <button
                  onClick={() => handleSymbolClick('AAPL')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    currentSymbol === 'AAPL' ? 'bg-primary-500/20 text-primary-300' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  <span className="font-mono font-medium">AAPL</span>
                  <span className="text-slate-500 text-xs">Apple Inc.</span>
                </button>
                <button
                  onClick={() => handleSymbolClick('MSFT')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    currentSymbol === 'MSFT' ? 'bg-primary-500/20 text-primary-300' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  <span className="font-mono font-medium">MSFT</span>
                  <span className="text-slate-500 text-xs">Microsoft</span>
                </button>
                <button
                  onClick={() => handleSymbolClick('NVDA')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    currentSymbol === 'NVDA' ? 'bg-primary-500/20 text-primary-300' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  <span className="font-mono font-medium">NVDA</span>
                  <span className="text-slate-500 text-xs">NVIDIA</span>
                </button>
                <button
                  onClick={() => handleSymbolClick('TSLA')}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    currentSymbol === 'TSLA' ? 'bg-primary-500/20 text-primary-300' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  <span className="font-mono font-medium">TSLA</span>
                  <span className="text-slate-500 text-xs">Tesla</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Data: Alpha Vantage</p>
              <p>Charts: TradingView</p>
              <p className="text-primary-400">ML: LSTM + Indicators</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}