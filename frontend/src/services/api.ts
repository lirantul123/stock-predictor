import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { Quote, PricePoint, SymbolSearchResult, TechnicalIndicators, PredictionResult, Timeframe, WatchlistItem } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 429) {
      console.warn('Rate limited by API')
    }
    return Promise.reject(error)
  }
)

export const marketApi = {
  searchSymbols: async (query: string): Promise<SymbolSearchResult[]> => {
    const { data } = await api.get('/api/symbols/search', { params: { q: query } })
    return data
  },

  getQuote: async (symbol: string): Promise<Quote> => {
    const { data } = await api.get(`/api/symbols/${symbol}/quote`)
    return data
  },

  getHistory: async (
    symbol: string,
    timeframe: Timeframe['value'] = '1Y'
  ): Promise<PricePoint[]> => {
    const { data } = await api.get<{ symbol: string; interval: string; data: PricePoint[] }>(
      `/api/symbols/${symbol}/history`,
      { params: { timeframe } }
    )
    return data.data
  },

  getIndicators: async (
    symbol: string,
    interval: string = 'daily',
    indicators?: string[]
  ): Promise<TechnicalIndicators> => {
    const { data } = await api.get(`/api/symbols/${symbol}/indicators`, {
      params: { interval, indicators: indicators?.join(',') },
    })
    return data
  },

  getPrediction: async (
    symbol: string,
    horizon: number = 5
  ): Promise<PredictionResult> => {
    const { data } = await api.get(`/api/predictions/${symbol}`, { params: { horizon } })
    return data
  },

  getPopularSymbols: async (): Promise<SymbolSearchResult[]> => {
    const { data } = await api.get('/api/symbols/popular')
    return data
  },
}

export const watchlistApi = {
  getWatchlist: async (): Promise<WatchlistItem[]> => {
    const { data } = await api.get('/api/watchlist')
    return data
  },

  addToWatchlist: async (symbol: string): Promise<void> => {
    await api.post('/api/watchlist', { symbol })
  },

  removeFromWatchlist: async (symbol: string): Promise<void> => {
    await api.delete(`/api/watchlist/${symbol}`)
  },
}