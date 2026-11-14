export interface PricePoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
}

export interface SymbolSearchResult {
  symbol: string
  name: string
  type?: string | null
  region?: string | null
  marketOpen?: string | null
  marketClose?: string | null
  timezone?: string | null
  currency?: string
  matchScore?: number | null
}

export interface TechnicalIndicators {
  rsi?: { value: number; signal: 'oversold' | 'overbought' | 'neutral' }
  macd?: { macd: number; signal: number; histogram: number; trend: 'bullish' | 'bearish' | 'neutral' }
  bollingerBands?: { upper: number; middle: number; lower: number; position: 'upper' | 'lower' | 'middle' }
  sma20?: number
  sma50?: number
  sma200?: number
  ema20?: number
  ema50?: number
  stochastic?: { k: number; d: number; signal: 'oversold' | 'overbought' | 'neutral' }
  atr?: number
  adx?: { value: number; trend: 'strong' | 'weak' }
  obv?: number
}

export interface PredictionPoint {
  date: string
  predictedClose: number
  upperBound: number
  lowerBound: number
  confidence: number
  direction: 'up' | 'down' | 'flat'
}

export interface PredictionResult {
  symbol: string
  horizon: string
  currentPrice: number
  predictions: PredictionPoint[]
  ensembleSignal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  mlSignal: 'buy' | 'hold' | 'sell'
  technicalSignal: 'buy' | 'hold' | 'sell'
  agreement: 'strong' | 'moderate' | 'weak' | 'conflict'
  confidence: number
  modelVersion: string
  generatedAt: string
}

export interface WatchlistItem {
  symbol: string
  name: string
  addedAt: number | string
}

export interface Timeframe {
  value: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'
  label: string
  interval: '1m' | '5m' | '15m' | '30m' | '60m' | 'daily'
}

export const TIMEFRAMES: Timeframe[] = [
  { value: '1D', label: '1D', interval: '5m' },
  { value: '1W', label: '1W', interval: '30m' },
  { value: '1M', label: '1M', interval: '60m' },
  { value: '3M', label: '3M', interval: 'daily' },
  { value: '1Y', label: '1Y', interval: 'daily' },
  { value: 'ALL', label: 'ALL', interval: 'daily' },
]

export type ThemeMode = 'dark' | 'light' | 'system'

export interface UserSettings {
  theme: ThemeMode
  defaultTimeframe: Timeframe['value']
  enabledIndicators: string[]
  predictionHorizon: number
  showVolume: boolean
  showPredictions: boolean
  autoRefresh: boolean
}