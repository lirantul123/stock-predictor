import { useEffect, useMemo, useRef, useState } from 'react'
import { useSymbolSearch, usePopularSymbols, useTrainedModels, useWatchlist } from '../../hooks/useMarketData'
import { useToastStore } from '../../stores/toast'
import { cn } from '../../utils/helpers'
import { SymbolIcon } from '../Common/SymbolIcon'
import type { SymbolSearchResult } from '../../types'

interface AddSymbolModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddSymbolModal({ isOpen, onClose }: AddSymbolModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, add, remove, isInWatchlist } = useWatchlist()
  const { add: addToast } = useToastStore()
  const { data: popularSymbols } = usePopularSymbols()
  const { data: trainedModels } = useTrainedModels()

  const trainedSet = useMemo(
    () => new Set((trainedModels ?? []).map((m) => m.symbol.toUpperCase())),
    [trainedModels]
  )

  const { data: searchResults, isFetching } = useSymbolSearch(query.trim())

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const trimmed = query.trim()
  const results: SymbolSearchResult[] =
    trimmed.length > 0 ? searchResults ?? [] : popularSymbols ?? []

  const handleAdd = (symbol: string, name: string) => {
    if (isInWatchlist(symbol)) {
      remove(symbol)
      addToast({
        type: 'info',
        title: 'Removed from watchlist',
        message: `${symbol} removed.`,
        duration: 2500,
      })
      return
    }
    add(symbol, name)
    addToast({
      type: 'success',
      title: 'Added to watchlist',
      message: `${symbol} added successfully.`,
      duration: 3000,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add symbol to watchlist"
        className="relative w-full max-w-lg glass-panel shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Add Symbol</h2>
              <p className="text-xs text-slate-500">Search for a stock to track</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-slate-800/50">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by symbol or company name..."
              className="input pl-10"
              aria-label="Search symbols"
            />
            {isFetching && (
              <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {trimmed.length > 0 && results.length === 0 && !isFetching ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              No symbols found for &quot;{trimmed}&quot;
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((sym) => {
                const inWatchlist = isInWatchlist(sym.symbol)
                const trained = trainedSet.has(sym.symbol.toUpperCase())
                return (
                  <li key={sym.symbol}>
                    <button
                      onClick={() => handleAdd(sym.symbol, sym.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                        inWatchlist
                          ? 'bg-primary-500/15 border border-primary-500/30'
                          : 'hover:bg-slate-800/60 border border-transparent'
                      )}
                    >
                      <SymbolIcon symbol={sym.symbol} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm text-slate-100">{sym.symbol}</span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
                              trained
                                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                            )}
                            title={trained ? 'Model trained' : 'No trained model'}
                          >
                            {trained ? 'Trained' : 'Untrained'}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">{sym.name}</p>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-colors',
                          inWatchlist
                            ? 'border-primary-500/40 bg-primary-500/20 text-primary-300'
                            : 'border-slate-700 text-slate-400'
                        )}
                        aria-hidden="true"
                      >
                        {inWatchlist ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-800/50 bg-slate-900/60 text-[11px] text-slate-500">
          {items.length} symbol{items.length === 1 ? '' : 's'} in watchlist
        </div>
      </div>
    </div>
  )
}