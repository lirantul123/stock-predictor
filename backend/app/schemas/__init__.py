from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        protected_namespaces=(),
    )


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
class SymbolBase(APIModel):
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


class SymbolSearchResult(APIModel):
    symbol: str
    name: str
    type: Optional[str] = None
    region: Optional[str] = None
    market_open: Optional[str] = None
    market_close: Optional[str] = None
    timezone: Optional[str] = None
    currency: str = "USD"
    match_score: Optional[float] = None


# Quote schemas
class QuoteResponse(APIModel):
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
class PricePoint(APIModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class PriceHistoryResponse(APIModel):
    symbol: str
    interval: str
    data: List[PricePoint]


# Technical Indicators
class RsiData(APIModel):
    value: float
    signal: RsiSignalType


class MacdData(APIModel):
    macd: float
    signal: float
    histogram: float
    trend: MacdTrendType


class BollingerBandsData(APIModel):
    upper: float
    middle: float
    lower: float
    position: BbPositionType


class StochasticData(APIModel):
    k: float
    d: float
    signal: RsiSignalType


class AdxData(APIModel):
    value: float
    trend: AdxTrendType


class TechnicalIndicatorsResponse(APIModel):
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
class PredictionPoint(APIModel):
    date: str
    predicted_close: float
    upper_bound: float
    lower_bound: float
    confidence: float
    direction: DirectionType


class PredictionResponse(APIModel):
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
class WatchlistItem(APIModel):
    symbol: str
    name: Optional[str] = None
    added_at: datetime


class WatchlistAdd(APIModel):
    symbol: str
    name: Optional[str] = None


# Health
class HealthResponse(APIModel):
    status: str
    timestamp: datetime
    version: str
    database: str
    redis: str