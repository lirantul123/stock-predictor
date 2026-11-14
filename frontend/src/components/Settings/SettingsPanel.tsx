import { cn } from '../../utils/helpers'
import { useUIStore } from '../../stores'
import type { ThemeMode } from '../../types'

export function SettingsPanel() {
  const { settings, updateSettings, settingsOpen, setSettingsOpen, indicatorPanelOpen, predictionPanelOpen, toggleIndicatorPanel, togglePredictionPanel } = useUIStore()

  if (!settingsOpen) return null

  const close = () => setSettingsOpen(false)

  const themes: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'system', label: 'System', icon: '💻' },
  ]

  const allIndicators = [
    { key: 'rsi', label: 'RSI (14)', description: 'Relative Strength Index' },
    { key: 'macd', label: 'MACD (12,26,9)', description: 'Moving Average Convergence Divergence' },
    { key: 'bollingerBands', label: 'Bollinger Bands (20,2)', description: 'Volatility bands' },
    { key: 'sma', label: 'SMA 20/50/200', description: 'Simple Moving Averages' },
    { key: 'ema', label: 'EMA 20/50', description: 'Exponential Moving Averages' },
    { key: 'stochastic', label: 'Stochastic (14,3)', description: 'Momentum oscillator' },
    { key: 'atr', label: 'ATR (14)', description: 'Average True Range' },
    { key: 'adx', label: 'ADX (14)', description: 'Average Directional Index' },
    { key: 'obv', label: 'OBV', description: 'On-Balance Volume' },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-end sm:justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => close()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md sm:max-w-lg glass-panel shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          </div>
          <button
            onClick={() => close()}
            className="p-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Appearance */}
          <SettingsSection title="Appearance" description="Choose your preferred theme">
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => {
                    updateSettings({ theme: theme.value })
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all duration-200',
                    settings.theme === theme.value
                      ? 'border-primary-500 bg-primary-500/15 text-primary-400 shadow-glow'
                      : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50'
                  )}
                >
                  <span className="text-2xl">{theme.icon}</span>
                  <span className="text-xs font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* Indicators */}
          <SettingsSection title="Technical Indicators" description="Select which indicators to display in the analysis panel">
            <p className="text-xs text-slate-500 mb-3">Enable the indicators you want to track</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {allIndicators.map((ind) => (
                <label
                  key={ind.key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-all cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={settings.enabledIndicators.includes(ind.key)}
                    onChange={(e) => {
                      const newIndicators = e.target.checked
                        ? [...settings.enabledIndicators, ind.key]
                        : settings.enabledIndicators.filter((i) => i !== ind.key)
                      updateSettings({ enabledIndicators: newIndicators })
                    }}
                    className="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 bg-slate-900"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{ind.label}</p>
                    <p className="text-xs text-slate-500">{ind.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </SettingsSection>

          {/* Prediction */}
          <SettingsSection title="Prediction Settings" description="Configure forecast behavior">
            <div className="space-y-2">
                <ToggleRow
                  id="showVolume"
                  label="Show Volume"
                  description="Display volume histogram on chart"
                  checked={settings.showVolume}
                  onChange={(v) => updateSettings({ showVolume: v })}
                />
                <ToggleRow
                  id="showPredictions"
                  label="Show Predictions on Chart"
                  description="Display ML forecast line on chart"
                  checked={settings.showPredictions}
                  onChange={(v) => updateSettings({ showPredictions: v })}
                />
                <ToggleRow
                  id="autoRefresh"
                  label="Auto-refresh Data"
                  description="Refresh market data periodically"
                  checked={settings.autoRefresh}
                  onChange={(v) => updateSettings({ autoRefresh: v })}
                />
            </div>
          </SettingsSection>

          {/* Panels */}
          <SettingsSection title="Analysis Panels" description="Toggle the side analysis panels">
            <div className="grid grid-cols-2 gap-3">
              <PanelToggle
                label="Indicators Panel"
                active={indicatorPanelOpen}
                onToggle={toggleIndicatorPanel}
              />
              <PanelToggle
                label="Predictions Panel"
                active={predictionPanelOpen}
                onToggle={togglePredictionPanel}
              />
            </div>
          </SettingsSection>

          {/* About */}
          <SettingsSection title="About" description="Version and data sources">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Stock Predictor v0.2.0</p>
              <p>Data provided by Yahoo Finance</p>
              <p>Charts by TradingView Lightweight Charts</p>
              <p className="text-primary-500">ML: PyTorch LSTM + Technical Indicators</p>
            </div>
          </SettingsSection>
        </div>

        <div className="p-5 border-t border-slate-800/50 bg-slate-900/80">
          <button
            onClick={() => close()}
            className="w-full btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-[10px] text-slate-600">{description}</p>
      <div className="border-t border-slate-800/50 pt-3">{children}</div>
    </div>
  )
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-colors">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 bg-slate-900"
      />
    </div>
  )
}

function PanelToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'p-3 rounded-xl border-2 text-center transition-all duration-200',
        active
          ? 'border-primary-500 bg-primary-500/15 text-primary-400 shadow-glow'
          : 'border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
      )}
    >
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
