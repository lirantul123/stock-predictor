import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Trendline } from '../components/Chart/trendlines'

interface DrawingState {
  /** Trendlines per symbol, so each chart keeps its own annotations. */
  bySymbol: Record<string, Trendline[]>
  linesFor: (symbol: string | null | undefined) => Trendline[]
  setLines: (symbol: string, lines: Trendline[]) => void
  clearSymbol: (symbol: string) => void
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      bySymbol: {},

      linesFor: (symbol) => (symbol ? get().bySymbol[symbol] ?? [] : []),

      setLines: (symbol, lines) =>
        set((state) => ({
          bySymbol: { ...state.bySymbol, [symbol]: lines },
        })),

      clearSymbol: (symbol) =>
        set((state) => {
          const next = { ...state.bySymbol }
          delete next[symbol]
          return { bySymbol: next }
        }),
    }),
    {
      name: 'stock-predictor-drawings',
      // Only persist the drawing data; the helpers are re-created on load.
      partialize: (state) => ({ bySymbol: state.bySymbol }),
    }
  )
)