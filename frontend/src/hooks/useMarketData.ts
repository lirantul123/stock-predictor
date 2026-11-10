import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { marketApi, watchlistApi } from '../services/api'
import { ws } from '../services/websocket'
import { useMarketStore, useWatchlistStore, useUIStore } from '../stores'
import type { Timeframe } from '../types'

export function useSymbolSearch(query: string) {
  return useQuery({
    queryKey: ['symbols', 'search', query],
    queryFn: () => marketApi.searchSymbols(query),
    enabled: query.length >= 1,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePopularSymbols() {
  return useQuery({
    queryKey: ['symbols', 'popular'],
    queryFn: marketApi.getPopularSymbols,
    staleTime: 60 * 60 * 1000,
  })
}

export function useQuote(symbol: string | null) {
  const setQuote = useMarketStore((s) => s.setCurrentQuote)
  const setLoading = useUIStore((s) => s.setLoading)

  const query = useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => marketApi.getQuote(symbol!),
    enabled: !!symbol,
    staleTime: 5000,
    refetchInterval: 10000,
  })

  useEffect(() => {
    if (query.data) {
      setQuote(query.data)
    }
    setLoading(query.isLoading)
  }, [query.data, query.isLoading, setQuote, setLoading])

  return query
}

export function usePriceHistory(symbol: string | null, timeframe: Timeframe['value']) {
  const setHistory = useMarketStore((s) => s.setPriceHistory)
  const getHistory = useMarketStore((s) => s.getPriceHistory)
  const setLoading = useUIStore((s) => s.setLoading)

  const cachedData = symbol ? getHistory(symbol, timeframe) : null

  const query = useQuery({
    queryKey: ['history', symbol, timeframe],
    queryFn: () => marketApi.getHistory(symbol!, timeframe),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    initialData: cachedData ?? undefined,
  })

  useEffect(() => {
    if (query.data && symbol) {
      setHistory(symbol, query.data, timeframe)
    }
    setLoading(query.isLoading)
  }, [query.data, query.isLoading, symbol, timeframe, setHistory, setLoading])

  return query
}

export function useIndicators(symbol: string | null, interval: string = 'daily') {
  const setIndicators = useMarketStore((s) => s.setCurrentIndicators)

  const query = useQuery({
    queryKey: ['indicators', symbol, interval],
    queryFn: () => marketApi.getIndicators(symbol!, interval),
    enabled: !!symbol,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (query.data) {
      setIndicators(query.data)
    }
  }, [query.data, setIndicators])

  return query
}

export function usePrediction(symbol: string | null, horizon: number = 5) {
  const setPrediction = useMarketStore((s) => s.setCurrentPrediction)

  const query = useQuery({
    queryKey: ['prediction', symbol, horizon],
    queryFn: () => marketApi.getPrediction(symbol!, horizon),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.data) {
      setPrediction(query.data)
    }
  }, [query.data, setPrediction])

  return query
}

export function useRealtimePrice(symbol: string | null) {
  const setQuote = useMarketStore((s) => s.setCurrentQuote)

  useEffect(() => {
    if (!symbol) return

    const unsubscribe = ws.subscribePrice(symbol, (data) => {
      setQuote(data)
    })

    ws.connect().catch(console.error)

    return () => {
      unsubscribe()
    }
  }, [symbol, setQuote])
}

export function useRealtimeIndicators(symbol: string | null) {
  const setIndicators = useMarketStore((s) => s.setCurrentIndicators)

  useEffect(() => {
    if (!symbol) return

    const unsubscribe = ws.subscribeIndicators(symbol, (data) => {
      setIndicators(data)
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, setIndicators])
}

export function useRealtimePrediction(symbol: string | null) {
  const setPrediction = useMarketStore((s) => s.setCurrentPrediction)

  useEffect(() => {
    if (!symbol) return

    const unsubscribe = ws.subscribePredictions(symbol, (data) => {
      setPrediction(data)
    })

    return () => {
      unsubscribe()
    }
  }, [symbol, setPrediction])
}

export function useWatchlist() {
  const queryClient = useQueryClient()
  const { items, addItem, removeItem, isInWatchlist } = useWatchlistStore()

  const addMutation = useMutation({
    mutationFn: (symbol: string) => watchlistApi.addToWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (symbol: string) => watchlistApi.removeFromWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
  })

  const add = useCallback(
    (symbol: string, name: string) => {
      addItem(symbol, name)
      addMutation.mutate(symbol)
    },
    [addItem, addMutation]
  )

  const remove = useCallback(
    (symbol: string) => {
      removeItem(symbol)
      removeMutation.mutate(symbol)
    },
    [removeItem, removeMutation]
  )

  return {
    items,
    add,
    remove,
    isInWatchlist: (symbol: string) => isInWatchlist(symbol),
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  }
}

export function useMarketData(symbol: string | null, timeframe: Timeframe['value']) {
  const quote = useQuote(symbol)
  const history = usePriceHistory(symbol, timeframe)
  const indicators = useIndicators(symbol)
  const prediction = usePrediction(symbol)

  useRealtimePrice(symbol)
  useRealtimeIndicators(symbol)
  useRealtimePrediction(symbol)

  return {
    quote: quote.data,
    history: history.data,
    indicators: indicators.data,
    prediction: prediction.data,
    isLoading: quote.isLoading || history.isLoading || indicators.isLoading || prediction.isLoading,
    isError: quote.isError || history.isError || indicators.isError || prediction.isError,
    error: quote.error || history.error || indicators.error || prediction.error,
    refetch: () => {
      quote.refetch()
      history.refetch()
      indicators.refetch()
      prediction.refetch()
    },
  }
}