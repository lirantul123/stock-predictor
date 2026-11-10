import { useState } from 'react'
import { cn } from '../../utils/helpers'
import { useUIStore } from '../../stores'
import type { ThemeMode } from '../../types'

export function SettingsPanel() {
  const { settings, updateSettings, indicatorPanelOpen, predictionPanelOpen, toggleIndicatorPanel, togglePredictionPanel } = useUIStore()
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) return null

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md sm:max-w-lg glass rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Appearance</h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => updateSettings({ theme: theme.value })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    settings.theme === theme.value
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                  )}
                >
                  <span className="text-2xl block mb-1">{theme.icon}</span>
                  <span className="text-sm font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Technical Indicators</h3>
            <p className="text-xs text-slate-500 mb-3">Select which indicators to display in the analysis panel</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allIndicators.map((ind) => (
                <label
                  key={ind.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-colors cursor-pointer"
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
                    <p className="text-sm font-medium text-slate-100">{ind.label}</p>
                    <p className="text-xs text-slate-500">{ind.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Prediction Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Prediction Horizon</label>
                <select
                  value={settings.predictionHorizon}
                  onChange={(e) => updateSettings({ predictionHorizon: Number(e.target.value) })}
                  className="input"
                >
                  <option value={1}>1 Day</option>
                  <option value={3}>3 Days</option>
                  <option value={5}>5 Days</option>
                  <option value={10}>10 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showVolume"
                  checked={settings.showVolume}
                  onChange={(e) => updateSettings({ showVolume: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 bg-slate-900"
                />
                <label htmlFor="showVolume" className="text-sm text-slate-300 cursor-pointer">
                  Show Volume
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showPredictions"
                  checked={settings.showPredictions}
                  onChange={(e) => updateSettings({ showPredictions: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 bg-slate-900"
                />
                <label htmlFor="showPredictions" className="text-sm text-slate-300 cursor-pointer">
                  Show Predictions on Chart
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={settings.autoRefresh}
                  onChange={(e) => updateSettings({ autoRefresh: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500 bg-slate-900"
                />
                <label htmlFor="autoRefresh" className="text-sm text-slate-300 cursor-pointer">
                  Auto-refresh Data
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Panels</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleIndicatorPanel}
                className={cn(
                  'p-3 rounded-lg border-2 text-center transition-all text-sm font-medium',
                  indicatorPanelOpen
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                )}
              >
                Indicators Panel
              </button>
              <button
                onClick={togglePredictionPanel}
                className={cn(
                  'p-3 rounded-lg border-2 text-center transition-all text-sm font-medium',
                  predictionPanelOpen
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                )}
              >
                Predictions Panel
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">About</h3>
            <div className="text-xs text-slate-500 space-y-1">
              <p>Stock Predictor v0.1.0</p>
              <p>Data provided by Alpha Vantage</p>
              <p>Charts by TradingView Lightweight Charts</p>
              <p>ML: PyTorch LSTM + Technical Indicators</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}