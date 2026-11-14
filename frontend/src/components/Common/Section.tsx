import type { ReactNode } from 'react'
import { cn } from '@/utils/helpers'

export type SectionTone = 'ml' | 'analysis'

interface SectionProps {
  id: string
  tone: SectionTone
  title: string
  subtitle: string
  icon: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

const toneStyles = {
  ml: {
    shell: 'border-primary-500/25 bg-primary-500/[0.04]',
    header: 'from-primary-500/15 to-transparent',
    badge: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
    iconBox: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
    rule: 'via-primary-500/40',
  },
  analysis: {
    shell: 'border-cyan-500/25 bg-cyan-500/[0.04]',
    header: 'from-cyan-500/15 to-transparent',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    iconBox: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    rule: 'via-cyan-500/40',
  },
} as const

export function Section({
  id,
  tone,
  title,
  subtitle,
  icon,
  action,
  children,
  className,
}: SectionProps) {
  const t = toneStyles[tone]

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn('scroll-mt-24 overflow-hidden rounded-2xl border bg-slate-900/30', t.shell, className)}
    >
      <header className={cn('relative flex flex-wrap items-center gap-3 border-b border-slate-800/60 bg-gradient-to-r px-4 py-3.5 sm:px-5', t.header)}>
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', t.iconBox)}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id={`${id}-heading`} className="truncate text-sm font-semibold tracking-tight text-slate-100">
              {title}
            </h2>
            <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', t.badge)}>
              {tone === 'ml' ? 'LSTM' : 'TA'}
            </span>
          </div>
          <p className="truncate text-[11px] text-slate-500">{subtitle}</p>
        </div>

        {action}
      </header>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}