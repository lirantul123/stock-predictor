import { SymbolSelector } from './SymbolSelector'
import { TimeframeSelector } from './TimeframeSelector'
import { cn } from '../../utils/helpers'
import { useUIStore } from '../../stores'

export function Header() {
  const { toggleSidebar, sidebarOpen, setSidebarOpen, setSettingsOpen, predictionPanelOpen, togglePredictionPanel } = useUIStore()

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-800/60">
      <div className="mx-auto max-w-full px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand + toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative group">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
                <div className="absolute -right-1 -bottom-1 flex h-3 w-3 items-center justify-center rounded-full bg-green-500 ring-2 ring-slate-950">
                  <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill="#fff" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                </div>
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-slate-100">Stock Predictor</span>
            </div>
          </div>

          {/* Symbol search */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl mx-8">
            <SymbolSelector />
          </div>

          {/* Actions + user */}
          <div className="flex items-center gap-2">
            <TimeframeSelector />

            <div className="flex items-center gap-1">
              <button
                onClick={togglePredictionPanel}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
                  predictionPanelOpen
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent'
                )}
                aria-pressed={predictionPanelOpen}
                title={predictionPanelOpen ? 'Hide ML predictions' : 'Show ML predictions'}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.32-1.744-.848-2.426z" />
                </svg>
                <span className="hidden sm:inline">ML</span>
              </button>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn(
                  'p-2.5 rounded-lg transition-all',
                  sidebarOpen
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800 border-transparent'
                )}
                aria-label="Toggle sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <button
                className="p-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
