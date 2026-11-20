import { cn } from '@/utils/helpers'

export type DrawingMode = 'none' | 'line' | 'ray' | 'extended' | 'horizontal' | 'vertical' | 'erase'

const MODES: { id: DrawingMode; label: string; title: string; icon: string }[] = [
  { id: 'none', label: 'Off', title: 'Drawing off', icon: '' },
  { id: 'line', label: 'Line', title: 'Draw a line between two points', icon: 'M3 17l6-6 4 4 8-8' },
  { id: 'ray', label: 'Ray', title: 'Line from a start point, extending right', icon: 'M3 17l6-6 4 4 8-8' },
  { id: 'extended', label: 'Ext', title: 'Line extending both ways', icon: 'M3 17l6-6 4 4 8-8' },
  { id: 'horizontal', label: 'H', title: 'Horizontal support / resistance', icon: 'M4 12h16' },
  { id: 'vertical', label: 'V', title: 'Vertical time marker', icon: 'M12 4v16' },
  { id: 'erase', label: '✕', title: 'Erase a drawn line', icon: 'M18 6L6 18M6 6l12 12' },
]

interface TrendlineToolbarProps {
  mode: DrawingMode
  onModeChange: (m: DrawingMode) => void
  onClear: () => void
  className?: string
}

export function TrendlineToolbar({ mode, onModeChange, onClear, className }: TrendlineToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-lg border border-slate-800/70 bg-slate-950/60 p-0.5',
        className,
      )}
    >
      {MODES.map((m) => {
        const active = m.id === mode
        return (
          <button
            key={m.id}
            type="button"
            title={m.title}
            aria-label={m.title}
            onClick={() => onModeChange(m.id)}
            className={cn(
              'flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-[10px] font-medium transition-colors',
              active
                ? 'bg-primary-500/20 text-primary-300'
                : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
            {m.icon ? (
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
              </svg>
            ) : (
              m.label
            )}
          </button>
        )
      })}
      <div className="mx-0.5 h-5 w-px bg-slate-800" />
      <button
        type="button"
        title="Clear all drawn lines"
        aria-label="Clear all drawn lines"
        onClick={onClear}
        className="flex h-7 items-center justify-center rounded-md px-1.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
      >
        Clear
      </button>
    </div>
  )
}