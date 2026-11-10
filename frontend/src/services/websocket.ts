import { io, Socket } from 'socket.io-client'
import type { Quote, TechnicalIndicators, PredictionResult, PricePoint } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

type EventCallback<T> = (data: T) => void

class WebSocketService {
  private socket: Socket | null = null
  private priceSubs: Map<string, Set<EventCallback<Quote>>> = new Map()
  private indicatorSubs: Map<string, Set<EventCallback<TechnicalIndicators>>> = new Map()
  private predictionSubs: Map<string, Set<EventCallback<PredictionResult>>> = new Map()
  private historySubs: Map<string, Set<EventCallback<PricePoint[]>>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      this.socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      })

      this.socket.on('connect', () => {
        console.log('[WS] Connected')
        this.reconnectAttempts = 0
        this.resubscribeAll()
        resolve()
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[WS] Disconnected:', reason)
      })

      this.socket.on('connect_error', (error) => {
        console.error('[WS] Connection error:', error)
        this.reconnectAttempts++
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'))
        }
      })

      this.setupEventListeners()
    })
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('price_update', (data: Quote) => {
      this.notifyPriceSubscribers(data.symbol, data)
    })

    this.socket.on('indicator_update', (data: { symbol: string; indicators: TechnicalIndicators }) => {
      this.notifyIndicatorSubscribers(data.symbol, data.indicators)
    })

    this.socket.on('prediction_update', (data: PredictionResult) => {
      this.notifyPredictionSubscribers(data.symbol, data)
    })

    this.socket.on('history_update', (data: { symbol: string; history: PricePoint[] }) => {
      this.notifyHistorySubscribers(data.symbol, data.history)
    })

    this.socket.on('subscribed', (data: { symbol: string; type: string }) => {
      console.log('[WS] Subscribed:', data)
    })

    this.socket.on('unsubscribed', (data: { symbol: string; type: string }) => {
      console.log('[WS] Unsubscribed:', data)
    })

    this.socket.on('error', (error: { message: string }) => {
      console.error('[WS] Server error:', error.message)
    })
  }

  private notifyPriceSubscribers(symbol: string, data: Quote): void {
    const callbacks = this.priceSubs.get(symbol)
    if (callbacks) {
      callbacks.forEach((cb) => cb(data))
    }
  }

  private notifyIndicatorSubscribers(symbol: string, data: TechnicalIndicators): void {
    const callbacks = this.indicatorSubs.get(symbol)
    if (callbacks) {
      callbacks.forEach((cb) => cb(data))
    }
  }

  private notifyPredictionSubscribers(symbol: string, data: PredictionResult): void {
    const callbacks = this.predictionSubs.get(symbol)
    if (callbacks) {
      callbacks.forEach((cb) => cb(data))
    }
  }

  private notifyHistorySubscribers(symbol: string, data: PricePoint[]): void {
    const callbacks = this.historySubs.get(symbol)
    if (callbacks) {
      callbacks.forEach((cb) => cb(data))
    }
  }

  private resubscribeAll(): void {
    if (!this.socket) return

    this.priceSubs.forEach((_, symbol) => {
      this.socket?.emit('subscribe_price', { symbol })
    })
    this.indicatorSubs.forEach((_, symbol) => {
      this.socket?.emit('subscribe_indicators', { symbol })
    })
    this.predictionSubs.forEach((_, symbol) => {
      this.socket?.emit('subscribe_predictions', { symbol })
    })
  }

  subscribePrice(symbol: string, callback: EventCallback<Quote>): () => void {
    if (!this.priceSubs.has(symbol)) {
      this.priceSubs.set(symbol, new Set())
      if (this.socket?.connected) {
        this.socket.emit('subscribe_price', { symbol })
      }
    }
    this.priceSubs.get(symbol)!.add(callback)
    return () => this.unsubscribePrice(symbol, callback)
  }

  subscribeIndicators(symbol: string, callback: EventCallback<TechnicalIndicators>): () => void {
    if (!this.indicatorSubs.has(symbol)) {
      this.indicatorSubs.set(symbol, new Set())
      if (this.socket?.connected) {
        this.socket.emit('subscribe_indicators', { symbol })
      }
    }
    this.indicatorSubs.get(symbol)!.add(callback)
    return () => this.unsubscribeIndicators(symbol, callback)
  }

  subscribePredictions(symbol: string, callback: EventCallback<PredictionResult>): () => void {
    if (!this.predictionSubs.has(symbol)) {
      this.predictionSubs.set(symbol, new Set())
      if (this.socket?.connected) {
        this.socket.emit('subscribe_predictions', { symbol })
      }
    }
    this.predictionSubs.get(symbol)!.add(callback)
    return () => this.unsubscribePredictions(symbol, callback)
  }

  subscribeHistory(symbol: string, callback: EventCallback<PricePoint[]>): () => void {
    if (!this.historySubs.has(symbol)) {
      this.historySubs.set(symbol, new Set())
      if (this.socket?.connected) {
        this.socket.emit('subscribe_history', { symbol })
      }
    }
    this.historySubs.get(symbol)!.add(callback)
    return () => this.unsubscribeHistory(symbol, callback)
  }

  private unsubscribePrice(symbol: string, callback: EventCallback<Quote>): void {
    const callbacks = this.priceSubs.get(symbol)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.priceSubs.delete(symbol)
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe_price', { symbol })
        }
      }
    }
  }

  private unsubscribeIndicators(symbol: string, callback: EventCallback<TechnicalIndicators>): void {
    const callbacks = this.indicatorSubs.get(symbol)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.indicatorSubs.delete(symbol)
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe_indicators', { symbol })
        }
      }
    }
  }

  private unsubscribePredictions(symbol: string, callback: EventCallback<PredictionResult>): void {
    const callbacks = this.predictionSubs.get(symbol)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.predictionSubs.delete(symbol)
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe_predictions', { symbol })
        }
      }
    }
  }

  private unsubscribeHistory(symbol: string, callback: EventCallback<PricePoint[]>): void {
    const callbacks = this.historySubs.get(symbol)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.historySubs.delete(symbol)
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe_history', { symbol })
        }
      }
    }
  }

  unsubscribeAll(symbol: string): void {
    this.unsubscribePrice(symbol, () => {})
    this.unsubscribeIndicators(symbol, () => {})
    this.unsubscribePredictions(symbol, () => {})
    this.unsubscribeHistory(symbol, () => {})
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
    this.priceSubs.clear()
    this.indicatorSubs.clear()
    this.predictionSubs.clear()
    this.historySubs.clear()
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const ws = new WebSocketService()