import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistItem, UserSettings, Timeframe, Quote, TechnicalIndicators, PredictionResult } from '../types'

interface MarketState {
  currentSymbol: string | null
  currentQuote: Quote | null
  currentIndicators: TechnicalIndicators | null
  currentPrediction: PredictionResult | null
  priceHistory: Map<string, { data: any[]; timeframe: Timeframe['value']; timestamp: number }>
  setCurrentSymbol: (symbol: string) => void
  setCurrentQuote: (quote: Quote | null) => void
  setCurrentIndicators: (indicators: TechnicalIndicators | null) => void
  setCurrentPrediction: (prediction: PredictionResult | null) => void
  setPriceHistory: (symbol: string, data: any[], timeframe: Timeframe['value']) => void
  getPriceHistory: (symbol: string, timeframe: Timeframe['value']) => any[] | null
  clearCurrentData: () => void
}

export const useMarketStore = create<MarketState>((set, get) => ({
  currentSymbol: null,
  currentQuote: null,
  currentIndicators: null,
  currentPrediction: null,
  priceHistory: new Map(),

  setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),

  setCurrentQuote: (quote) => set({ currentQuote: quote }),

  setCurrentIndicators: (indicators) => set({ currentIndicators: indicators }),

  setCurrentPrediction: (prediction) => set({ currentPrediction: prediction }),

  setPriceHistory: (symbol, data, timeframe) => {
    const history = new Map(get().priceHistory)
    history.set(`${symbol}:${timeframe}`, { data, timeframe, timestamp: Date.now() })
    set({ priceHistory: history })
  },

  getPriceHistory: (symbol, timeframe) => {
    const key = `${symbol}:${timeframe}`
    const entry = get().priceHistory.get(key)
    if (entry && Date.now() - entry.timestamp < 5 * 60 * 1000) {
      return entry.data
    }
    return null
  },

  clearCurrentData: () =>
    set({
      currentQuote: null,
      currentIndicators: null,
      currentPrediction: null,
    }),
}))

interface WatchlistState {
  items: WatchlistItem[]
  addItem: (symbol: string, name: string) => void
  removeItem: (symbol: string) => void
  reorderItems: (items: WatchlistItem[]) => void
  isInWatchlist: (symbol: string) => boolean
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (symbol, name) => {
        if (get().isInWatchlist(symbol)) return
        set((state) => ({
          items: [...state.items, { symbol, name, addedAt: Date.now() }],
        }))
      },

      removeItem: (symbol) => {
        set((state) => ({
          items: state.items.filter((item) => item.symbol !== symbol),
        }))
      },

      reorderItems: (items) => set({ items }),

      isInWatchlist: (symbol) => get().items.some((item) => item.symbol === symbol),
    }),
    {
      name: 'stock-predictor-watchlist',
    }
  )
)

interface UIState {
  settings: UserSettings
  sidebarOpen: boolean
  settingsOpen: boolean
  indicatorPanelOpen: boolean
  predictionPanelOpen: boolean
  selectedTimeframe: Timeframe['value']
  isLoading: boolean
  error: string | null
  updateSettings: (settings: Partial<UserSettings>) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  toggleIndicatorPanel: () => void
  togglePredictionPanel: () => void
  setSelectedTimeframe: (timeframe: Timeframe['value']) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  defaultTimeframe: '1Y',
  enabledIndicators: ['rsi', 'macd', 'bollingerBands', 'volume'],
  predictionHorizon: 5,
  showVolume: true,
  showPredictions: true,
  autoRefresh: true,
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      sidebarOpen: true,
      settingsOpen: false,
      indicatorPanelOpen: true,
      predictionPanelOpen: true,
      selectedTimeframe: '1Y',
      isLoading: false,
      error: null,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      toggleIndicatorPanel: () =>
        set((state) => ({ indicatorPanelOpen: !state.indicatorPanelOpen })),
      togglePredictionPanel: () =>
        set((state) => ({ predictionPanelOpen: !state.predictionPanelOpen })),
      setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'stock-predictor-ui',
      partialize: (state) => ({
        settings: state.settings,
        selectedTimeframe: state.selectedTimeframe,
        sidebarOpen: state.sidebarOpen,
        indicatorPanelOpen: state.indicatorPanelOpen,
        predictionPanelOpen: state.predictionPanelOpen,
      }),
    }
  )
)