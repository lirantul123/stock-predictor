import { cn } from '../../utils/helpers'

interface StockHeaderProps {
  symbol: string
  name?: string
  price?: number
  className?: string
}

export function StockHeader({ symbol, name, price, className }: StockHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono font-semibold text-slate-100 text-sm">{symbol}</span>
        {name && <span className="text-xs text-slate-500 truncate">{name}</span>}
      </div>
      {price != null && (
        <span className="font-mono text-sm font-semibold text-slate-200 flex-shrink-0">
          ${price.toFixed(2)}
        </span>
      )}
    </div>
  )
}