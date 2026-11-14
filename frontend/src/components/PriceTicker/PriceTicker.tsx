import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/utils/helpers'
import { useWatchlistStore } from '@/stores'
import { marketApi } from '@/services/api'
import { formatPrice, formatChange } from '@/utils/helpers'

interface PriceTickerProps {
  className?: string
}

export function PriceTicker({ className }: PriceTickerProps) {
  const { items } = useWatchlistStore()
  const [visibleSymbols, setVisibleSymbols] = useState<string[]>([])

  useEffect(() => {
    const symbols = items.map((i) => i.symbol)
    if (symbols.length === 0) {
      setVisibleSymbols(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'])
    } else {
      setVisibleSymbols(symbols)
    }
  }, [items])

  return (
    <div className={cn('relative overflow-hidden border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-md', className)}>
      <div className="relative flex items-center gap-6 px-4 py-2 animate-marquee">
        {visibleSymbols.map((symbol) => (
          <TickerItem key={symbol} symbol={symbol} />
        ))}
        {visibleSymbols.map((symbol) => (
          <TickerItem key={symbol + '-dup'} symbol={symbol} />
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
    refetchInterval: 10000,
  })

  if (isLoading || !quote) {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="font-mono font-medium text-slate-400">{symbol}</span>
        <span className="h-3 w-16 rounded-full bg-slate-800/50 animate-pulse" />
      </div>
    )
  }

  const isUp = quote.change >= 0
  const color = isUp ? 'text-green-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-3 whitespace-nowrap px-2">
      <span className="font-mono font-medium text-slate-200">{symbol}</span>
      <span className={cn('font-mono font-medium', color)}>{formatPrice(quote.price)}</span>
      <span className={cn('text-xs font-medium', color)}>
        {formatChange(quote.change, quote.changePercent)}
      </span>
      <div className="h-3 w-0.5 bg-slate-700" />
    </div>
  )
}
