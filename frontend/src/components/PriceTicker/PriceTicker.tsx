import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/utils/helpers'
import { useWatchlistStore } from '@/stores'
import { marketApi } from '@/services/api'
import { currencyOf, formatPrice, formatChange } from '@/utils/helpers'
import { SymbolIcon } from '../Common/SymbolIcon'

interface PriceTickerProps {
  className?: string
}

export function PriceTicker({ className }: PriceTickerProps) {
  const { items } = useWatchlistStore()
  const [visibleSymbols, setVisibleSymbols] = useState<string[]>([])

  useEffect(() => {
    setVisibleSymbols(items.map((i) => i.symbol))
  }, [items])

  if (visibleSymbols.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 border-b border-slate-800/50 bg-slate-900/60 px-4 py-2 backdrop-blur-md',
          className
        )}
      >
        <span className="text-[11px] text-slate-500">No symbols in watchlist</span>
      </div>
    )
  }

  const loopSymbols = [...visibleSymbols, ...visibleSymbols]
  const duration = Math.max(visibleSymbols.length * 8, 20)

  return (
    <div
      className={cn(
        'relative overflow-hidden border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-md',
        className
      )}
    >
      <div
        className="flex w-max items-center animate-marquee-slow"
        style={{ animationDuration: `${duration}s` }}
      >
        {loopSymbols.map((symbol, index) => (
          <TickerItem key={`${symbol}-${index}`} symbol={symbol} />
        ))}
      </div>
    </div>
  )
}

function TickerItem({ symbol }: { symbol: string }) {
  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => marketApi.getQuote(symbol),
    staleTime: 5000,
    refetchInterval: 15000,
  })

  if (isLoading || !quote) {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap px-2">
        <SymbolIcon symbol={symbol} size="sm" />
        <span className="font-mono font-medium text-slate-400">{symbol}</span>
        <span className="h-3 w-16 rounded-full bg-slate-800/50 animate-pulse" />
      </div>
    )
  }

  const isUp = quote.change >= 0
  const color = isUp ? 'text-green-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-3 whitespace-nowrap px-2">
      <SymbolIcon symbol={symbol} size="sm" />
      <span className="font-mono font-medium text-slate-200">{symbol}</span>
      <span className={cn('font-mono font-medium', color)}>{formatPrice(quote.price, currencyOf(quote.currency))}</span>
      <span className={cn('text-xs font-medium', color)}>
        {formatChange(quote.change, quote.changePercent)}
      </span>
      <div className="h-3 w-0.5 bg-slate-700" />
    </div>
  )
}