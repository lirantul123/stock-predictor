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
}

export interface PredictionHistoryResponse {
  symbol: string
  forecasts: PastForecast[]
}

export function usePredictionHistory(symbol: string | null | undefined) {
  return useQuery({
    queryKey: ['prediction-history', symbol],
    queryFn: () =>
      api.get<PredictionHistoryResponse>(`/predictions/${symbol}/history`).then((r) => r.data),
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
      return api.patch(`/predictions/${params.symbol}/${params.predictionId}?${qs.toString()}`)
    },
  }
}