import { cn } from '../../utils/helpers'

interface SymbolIconProps {
  symbol: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const PALETTE = [
  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'bg-green-500/15 text-green-400 border-green-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'bg-red-500/15 text-red-400 border-red-500/30',
  'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
]

function hashSymbol(symbol: string): number {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0
  }
  return hash
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function SymbolIcon({ symbol, className, size = 'md' }: SymbolIconProps) {
  const colorClass = PALETTE[hashSymbol(symbol) % PALETTE.length]
  const initials = symbol.slice(0, 2).toUpperCase()

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-mono font-semibold flex-shrink-0',
        colorClass,
        SIZES[size],
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}