from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SignalType(str, Enum):
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"


class EnsembleSignalType(str, Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class AgreementType(str, Enum):
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"
    CONFLICT = "conflict"


class RsiSignalType(str, Enum):
    OVERSOLD = "oversold"
    OVERBOUGHT = "overbought"
    NEUTRAL = "neutral"


class MacdTrendType(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class BbPositionType(str, Enum):
    UPPER = "upper"
    LOWER = "lower"
    MIDDLE = "middle"


class AdxTrendType(str, Enum):
    STRONG = "strong"
    WEAK = "weak"


class DirectionType(str, Enum):
    UP = "up"
    DOWN = "down"
    FLAT = "flat"


# Symbol schemas
class SymbolBase(BaseModel):
    symbol: str
    name: str
    type: Optional[str] = None
    region: Optional[str] = None
    currency: str = "USD"
    timezone: Optional[str] = None
    market_open: Optional[str] = None
    market_close: Optional[str] = None


class SymbolCreate(SymbolBase):
    pass


class SymbolResponse(SymbolBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SymbolSearchResult(BaseModel):
    symbol: str
    name: str
    type: str
    region: str
    market_open: str
    market_close: str
    timezone: str
    currency: str
    match_score: str


# Quote schemas
class QuoteResponse(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    high: float
    low: float
    open: float
    previous_close: float
    timestamp: int


# Price History
class PricePoint(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class PriceHistoryResponse(BaseModel):
    symbol: str
    interval: str
    data: List[PricePoint]


# Technical Indicators
class RsiData(BaseModel):
    value: float
    signal: RsiSignalType


class MacdData(BaseModel):
    macd: float
    signal: float
    histogram: float
    trend: MacdTrendType


class BollingerBandsData(BaseModel):
    upper: float
    middle: float
    lower: float
    position: BbPositionType


class StochasticData(BaseModel):
    k: float
    d: float
    signal: RsiSignalType


class AdxData(BaseModel):
    value: float
    trend: AdxTrendType


class TechnicalIndicatorsResponse(BaseModel):
    symbol: str
    interval: str
    timestamp: int
    rsi: Optional[RsiData] = None
    macd: Optional[MacdData] = None
    bollinger_bands: Optional[BollingerBandsData] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    stochastic: Optional[StochasticData] = None
    atr: Optional[float] = None
    adx: Optional[AdxData] = None
    obv: Optional[float] = None


# Prediction schemas
class PredictionPoint(BaseModel):
    date: str
    predicted_close: float
    upper_bound: float
    lower_bound: float
    confidence: float
    direction: DirectionType


class PredictionResponse(BaseModel):
    symbol: str
    horizon: str
    current_price: float
    predictions: List[PredictionPoint]
    ensemble_signal: EnsembleSignalType
    ml_signal: SignalType
    technical_signal: SignalType
    agreement: AgreementType
    confidence: float
    model_version: str
    generated_at: str


# Watchlist
class WatchlistItem(BaseModel):
    symbol: str
    name: Optional[str] = None
    added_at: datetime


class WatchlistAdd(BaseModel):
    symbol: str
    name: Optional[str] = None


# Health
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    database: str
    redis: str