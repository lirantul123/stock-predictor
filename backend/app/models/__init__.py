from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, Index, ForeignKey, BigInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from datetime import datetime


class Symbol(Base):
    __tablename__ = "symbols"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    type = Column(String(50))  # equity, etf, crypto, etc.
    region = Column(String(50))
    currency = Column(String(10), default="USD")
    timezone = Column(String(50))
    market_open = Column(String(10))
    market_close = Column(String(10))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    price_history = relationship("PriceHistory", back_populates="symbol_obj", lazy="dynamic")
    predictions = relationship("Prediction", back_populates="symbol_obj", lazy="dynamic")
    indicators = relationship("Indicator", back_populates="symbol_obj", lazy="dynamic")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False, index=True)
    timestamp = Column(BigInteger, nullable=False, index=True)  # Unix timestamp in milliseconds
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(BigInteger, nullable=False)
    interval = Column(String(20), nullable=False)  # 1m, 5m, 15m, 30m, 60m, daily
    adjusted_close = Column(Float)
    dividend_amount = Column(Float, default=0)
    split_coefficient = Column(Float, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    symbol_obj = relationship("Symbol", back_populates="price_history")

    __table_args__ = (
        Index('ix_price_history_symbol_timestamp', 'symbol_id', 'timestamp'),
        Index('ix_price_history_symbol_interval_timestamp', 'symbol_id', 'interval', 'timestamp'),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False, index=True)
    horizon = Column(String(20), nullable=False)  # 1d, 5d, 10d
    current_price = Column(Float, nullable=False)
    ensemble_signal = Column(String(20), nullable=False)  # strong_buy, buy, hold, sell, strong_sell
    ml_signal = Column(String(10), nullable=False)  # buy, hold, sell
    technical_signal = Column(String(10), nullable=False)  # buy, hold, sell
    agreement = Column(String(20), nullable=False)  # strong, moderate, weak, conflict
    confidence = Column(Float, nullable=False)
    model_version = Column(String(50), nullable=False)
    predictions_json = Column(Text, nullable=False)  # JSON array of prediction points
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Relationships
    symbol_obj = relationship("Symbol", back_populates="predictions")


class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True, index=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id"), nullable=False, index=True)
    interval = Column(String(20), nullable=False)
    timestamp = Column(BigInteger, nullable=False, index=True)  # Unix timestamp in milliseconds

    # RSI
    rsi_value = Column(Float)
    rsi_signal = Column(String(20))  # oversold, overbought, neutral

    # MACD
    macd_value = Column(Float)
    macd_signal = Column(Float)
    macd_histogram = Column(Float)
    macd_trend = Column(String(20))  # bullish, bearish, neutral

    # Bollinger Bands
    bb_upper = Column(Float)
    bb_middle = Column(Float)
    bb_lower = Column(Float)
    bb_position = Column(String(20))  # upper, lower, middle

    # Moving Averages
    sma_20 = Column(Float)
    sma_50 = Column(Float)
    sma_200 = Column(Float)
    ema_20 = Column(Float)
    ema_50 = Column(Float)

    # Other
    stochastic_k = Column(Float)
    stochastic_d = Column(Float)
    stochastic_signal = Column(String(20))
    atr = Column(Float)
    adx_value = Column(Float)
    adx_trend = Column(String(20))
    obv = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    symbol_obj = relationship("Symbol", back_populates="indicators")

    __table_args__ = (
        Index('ix_indicators_symbol_interval_timestamp', 'symbol_id', 'interval', 'timestamp'),
    )


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(200))
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)


class ModelArtifact(Base):
    __tablename__ = "model_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), index=True, nullable=False)
    model_type = Column(String(50), nullable=False)  # lstm, ensemble
    version = Column(String(50), nullable=False)
    file_path = Column(String(500), nullable=False)
    metrics_json = Column(Text)  # JSON with training metrics
    training_data_hash = Column(String(64))  # Hash of training data for reproducibility
    is_active = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True))