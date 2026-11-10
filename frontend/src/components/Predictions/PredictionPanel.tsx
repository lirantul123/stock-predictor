import { cn } from '../../utils/helpers'
import type { PredictionResult } from '../../types'

interface PredictionPanelProps {
  prediction: PredictionResult | null
  className?: string
}

function getSignalBadge(signal: PredictionResult['ensembleSignal']) {
  const config: Record<string, { label: string; className: string }> = {
    strong_buy: { label: 'Strong Buy', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    buy: { label: 'Buy', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    hold: { label: 'Hold', className: 'bg-slate-700 text-slate-300 border-slate-600' },
    sell: { label: 'Sell', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    strong_sell: { label: 'Strong Sell', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  return config[signal] || config.hold
}

function getAgreementClass(agreement: string) {
  switch (agreement) {
    case 'strong':
      return 'text-green-400'
    case 'moderate':
      return 'text-yellow-400'
    case 'weak':
      return 'text-orange-400'
    case 'conflict':
      return 'text-red-400'
    default:
      return 'text-slate-400'
  }
}

function getAgreementLabel(agreement: string) {
  const labels: Record<string, string> = {
    strong: 'Strong Agreement',
    moderate: 'Moderate Agreement',
    weak: 'Weak Agreement',
    conflict: 'Conflicting Signals',
  }
  return labels[agreement] || agreement
}

export function PredictionPanel({ prediction, className }: PredictionPanelProps) {
  if (!prediction) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="text-center py-8 text-slate-500">
          Generating prediction...
        </div>
      </div>
    )
  }

  const signalConfig = getSignalBadge(prediction.ensembleSignal)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Ensemble Prediction</h3>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border',
              signalConfig.className
            )}
          >
            {signalConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Price</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">${prediction.currentPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target (5d)</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              ${prediction.predictions[prediction.predictions.length - 1]?.predictedClose.toFixed(2) ?? '--'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500">ML Confidence</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{Math.round(prediction.confidence * 100)}%</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Horizon</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{prediction.horizon}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Model v</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{prediction.modelVersion}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Signal Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">ML Model</p>
            <p className={cn('text-lg font-bold', prediction.mlSignal === 'buy' && 'text-green-400', prediction.mlSignal === 'sell' && 'text-red-400', prediction.mlSignal === 'hold' && 'text-slate-400')}>
              {prediction.mlSignal.charAt(0).toUpperCase() + prediction.mlSignal.slice(1)}
            </p>
            <p className="text-xs text-slate-500 mt-1">LSTM Forecast</p>
          </div>
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Technical</p>
            <p className={cn('text-lg font-bold', prediction.technicalSignal === 'buy' && 'text-green-400', prediction.technicalSignal === 'sell' && 'text-red-400', prediction.technicalSignal === 'hold' && 'text-slate-400')}>
              {prediction.technicalSignal.charAt(0).toUpperCase() + prediction.technicalSignal.slice(1)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Indicator Consensus</p>
          </div>
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Agreement</p>
            <p className={cn('text-lg font-bold', getAgreementClass(prediction.agreement))}>
              {getAgreementLabel(prediction.agreement)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Signal Alignment</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-5">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">5-Day Forecast</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Date</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Predicted</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Range</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Confidence</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Direction</th>
              </tr>
            </thead>
            <tbody>
              {prediction.predictions.map((p, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="py-2 px-3 text-slate-300 font-mono">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-100">${p.predictedClose.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">
                    ${p.lowerBound.toFixed(2)} - ${p.upperBound.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">{Math.round(p.confidence * 100)}%</td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        p.direction === 'up' && 'bg-green-500/20 text-green-400',
                        p.direction === 'down' && 'bg-red-500/20 text-red-400',
                        p.direction === 'flat' && 'bg-slate-700 text-slate-400'
                      )}
                    >
                      {p.direction === 'up' && '▲'}
                      {p.direction === 'down' && '▼'}
                      {p.direction === 'flat' && '●'}
                      {p.direction.charAt(0).toUpperCase() + p.direction.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/30 border border-slate-800 p-3 text-xs text-slate-500">
        <p>Generated: {new Date(prediction.generatedAt).toLocaleString()}</p>
        <p className="mt-1">
          <strong>Disclaimer:</strong> Predictions are for informational purposes only and do not constitute financial advice.
          Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  )
}