import { useState } from 'react'
import { cn } from '../../utils/helpers'
import { useMarketStore } from '../../stores'
import { useToastStore } from '../../stores/toast'
import { useWatchlist } from '../../hooks/useMarketData'
import { AddSymbolModal } from './AddSymbolModal'
import { SymbolIcon } from '../Common/SymbolIcon'
import type { WatchlistItem } from '../../types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ExpandedSections {
  watchlist: boolean
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    watchlist: true,
  })
  const [addModalOpen, setAddModalOpen] = useState(false)

  const { items, remove } = useWatchlist()
  const { currentSymbol, setCurrentSymbol } = useMarketStore()
  const { add: addToast } = useToastStore()

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
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 glass border-r border-slate-800/50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/50 lg:hidden bg-slate-900/80 backdrop-blur-md">
            <span className="font-semibold text-slate-100">Navigation</span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav content */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Watchlist */}
            <div>
              <button
                onClick={() => toggleSection('watchlist')}
                className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Watchlist
                </span>
                <svg
                  className={cn('h-4 w-4 transition-transform duration-200', expandedSections.watchlist ? 'rotate-180' : '')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSections.watchlist && (
                <div className="mt-2 space-y-1">
                  {items.length === 0 ? (
                    <div className="px-2 py-6 text-center">
                      <div className="mx-auto h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                        <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500">No symbols tracked yet</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">Search and add symbols to monitor</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {items.map((item: WatchlistItem) => (
                        <div
                          key={item.symbol}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSymbolClick(item.symbol)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleSymbolClick(item.symbol)
                            }
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer',
                            currentSymbol === item.symbol
                              ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-sm shadow-primary-500/10'
                              : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 hover:border-slate-700 border border-transparent'
                          )}
                        >
                          <SymbolIcon symbol={item.symbol} size="sm" />
                          <span className="font-mono font-medium flex-1 text-left truncate text-slate-100">
                            {item.symbol}
                          </span>
                          <svg
                            className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              remove(item.symbol)
                              addToast({
                                type: 'info',
                                title: 'Removed from watchlist',
                                message: `${item.symbol} removed.`,
                                duration: 2500,
                              })
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                            aria-label={`Remove ${item.symbol}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add symbol */}
            <div className="pt-4 border-t border-slate-800/50">
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-primary-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Symbol
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span>Live data feed</span>
            </div>
            <div className="mt-3 text-[10px] text-slate-600 leading-relaxed">
              Data: Yahoo Finance · Charts: TradingView · ML: PyTorch LSTM
            </div>
          </div>
        </div>
      </aside>

      <AddSymbolModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  )
}
