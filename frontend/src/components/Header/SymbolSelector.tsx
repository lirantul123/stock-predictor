import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { marketApi } from '../../services/api'
import { useMarketStore, useWatchlistStore } from '../../stores'
import { cn } from '../../utils/helpers'
import { SymbolIcon } from '../Common/SymbolIcon'
import type { SymbolSearchResult } from '../../types'

interface SymbolSelectorProps {
  className?: string
}

export function SymbolSelector({ className }: SymbolSelectorProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [recentSymbols, setRecentSymbols] = useState<SymbolSearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentSymbol = useMarketStore((s) => s.currentSymbol)
  const setCurrentSymbol = useMarketStore((s) => s.setCurrentSymbol)
  const { items: watchlist, isInWatchlist } = useWatchlistStore()

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['symbols', 'search', query],
    queryFn: () => marketApi.searchSymbols(query),
    enabled: query.length >= 1,
    staleTime: 5 * 60 * 1000,
  })

  const { data: popularSymbols } = useQuery({
    queryKey: ['symbols', 'popular'],
    queryFn: marketApi.getPopularSymbols,
    staleTime: 60 * 60 * 1000,
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback(
    (symbol: SymbolSearchResult) => {
      setCurrentSymbol(symbol.symbol)
      setRecentSymbols((prev) => [
        symbol,
        ...prev.filter((s) => s.symbol !== symbol.symbol),
      ].slice(0, 5))
      setQuery(symbol.symbol)
      setIsOpen(false)
      inputRef.current?.blur()
    },
    [setCurrentSymbol]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    setQuery(value)
    setIsOpen(true)
  }

  const handleFocus = () => {
    if (query.length >= 1 || recentSymbols.length > 0 || watchlist.length > 0) {
      setIsOpen(true)
    }
  }

  const getDisplayName = (symbol: SymbolSearchResult | { symbol: string; name: string }) => (
    <span className="flex items-center gap-2.5 min-w-0">
      <SymbolIcon symbol={symbol.symbol} size="sm" />
      <span className="font-mono font-medium text-slate-100">{symbol.symbol}</span>
      <span className="text-sm text-slate-400 truncate max-w-[150px]">{symbol.name}</span>
    </span>
  )

  const renderSymbolItem = (symbol: SymbolSearchResult | { symbol: string; name: string }, _isWatchlist = false) => {
    const isActive = currentSymbol === symbol.symbol

    return (
      <button
        key={symbol.symbol}
        onClick={() => handleSelect(symbol as SymbolSearchResult)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
          isActive ? 'bg-primary-500/20 text-primary-300' : 'hover:bg-slate-800 text-slate-100'
        )}
      >
        <span className="flex-1 text-left min-w-0">{getDisplayName(symbol)}</span>
        {isInWatchlist(symbol.symbol) && (
          <svg className="h-4 w-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        {isActive && (
          <svg className="h-4 w-4 text-primary-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder="Search..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 glass rounded-xl border border-slate-700 shadow-xl overflow-hidden z-50 animate-fade-in"
          >
            {isSearching && (
              <div className="p-4 text-center text-slate-500">
                <svg className="mx-auto h-5 w-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="mt-2 text-sm">Searching...</p>
              </div>
            )}

            {!isSearching && query && searchResults && searchResults.length > 0 && (
              <div className="p-2 border-b border-slate-800">
                <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Search Results</p>
              </div>
            )}

            {!isSearching && query && searchResults && searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((symbol) => renderSymbolItem(symbol))}
              </div>
            )}

            {!isSearching && query && searchResults && searchResults.length === 0 && query.length >= 1 && (
              <div className="p-4 text-center text-slate-500">
                <p>No results found for "{query}"</p>
              </div>
            )}

            {(!query || query.length < 1) && recentSymbols.length > 0 && (
              <>
                <div className="p-2 border-b border-slate-800">
                  <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Recent</p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {recentSymbols.map((symbol) => renderSymbolItem(symbol))}
                </div>
              </>
            )}

            {(!query || query.length < 1) && watchlist.length > 0 && (
              <>
                <div className="p-2 border-b border-slate-800">
                  <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Watchlist</p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {watchlist.map((item) => renderSymbolItem(item, true))}
                </div>
              </>
            )}

            {(!query || query.length < 1) && popularSymbols && popularSymbols.length > 0 && (
              <>
                <div className="p-2 border-b border-slate-800">
                  <p className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Popular</p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {popularSymbols.map((symbol) => renderSymbolItem(symbol))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}