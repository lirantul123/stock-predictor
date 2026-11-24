import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export interface ForecastPoint {
  date: string
  predictedClose: number
  upperBound: number
  lowerBound: number
  confidence: number
  direction: string
}

export interface PastForecast {
  id: number
  horizon: string
  currentPrice: number
  baselinePrice: number | null
  baselineTimestamp: number | null
  ensembleSignal: string
  mlSignal: string
  technicalSignal: string
  agreement: string
  confidence: number
  modelVersion: string
  generatedAt: string | null
  predictions: ForecastPoint[]
  userNote: string | null
  userExpectedDirection: string | null
  /** Date the final forecast point targets, e.g. "2026-11-30". */
  targetDate: string | null
  /** What the model expected for that date. */
  predictedTarget: number | null
  /** The close that actually printed, or null while the date is still ahead. */
  actualPrice: number | null
  /** (actual - predicted) / predicted * 100, or null when not yet scorable. */
  errorPct: number | null
  /** Most recent close, for context while a forecast is still running. */
  latestClose: number | null
}

export interface PredictionHistoryResponse {
  symbol: string
  forecasts: PastForecast[]
}

export function usePredictionHistory(symbol: string | null | undefined) {
  return useQuery({
    queryKey: ['prediction-history', symbol],
    // The axios client has no baseURL, so the /api prefix must be explicit —
    // every other call in services/api.ts includes it.
    queryFn: () =>
      api.get<PredictionHistoryResponse>(`/api/predictions/${symbol}/history`).then((r) => r.data),
    enabled: !!symbol,
    staleTime: 60_000,
  })
}

export function useUpdatePredictionNote() {
  return {
    mutate: async (params: {
      symbol: string
      predictionId: number
      note?: string
      expectedDirection?: string
    }) => {
      const qs = new URLSearchParams()
      if (params.note !== undefined) qs.set('note', params.note)
      if (params.expectedDirection !== undefined)
        qs.set('expected_direction', params.expectedDirection)
      return api.patch(`/api/predictions/${params.symbol}/${params.predictionId}?${qs.toString()}`)
    },
  }
}