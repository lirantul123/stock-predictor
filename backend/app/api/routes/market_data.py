from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.db.session import get_db
from app.models import Symbol, PriceHistory, Watchlist
from app.schemas import (
    SymbolSearchResult,
    SymbolResponse,
    QuoteResponse,
    PriceHistoryResponse,
    PricePoint,
    WatchlistItem,
    WatchlistAdd,
    HealthResponse,
)
from app.services.market_data import yfinance
from app.config import settings
import structlog
import time

logger = structlog.get_logger()
router = APIRouter(prefix="/symbols", tags=["symbols"])


@router.get("/search", response_model=List[SymbolSearchResult])
async def search_symbols(q: str = Query(..., min_length=1, max_length=10)):
    try:
        results = await yfinance.search_symbols(q)
        return results
    except Exception as e:
        logger.error("Symbol search failed", query=q, error=str(e))
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/popular", response_model=List[SymbolSearchResult])
async def get_popular_symbols():
    try:
        results = await yfinance.get_popular_symbols()
        return results
    except Exception as e:
        logger.error("Popular symbols failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch popular symbols")


@router.get("/{symbol}/quote", response_model=QuoteResponse)
async def get_quote(symbol: str):
    symbol = symbol.upper()
    try:
        quote = await yfinance.get_global_quote(symbol)
        return quote
    except Exception as e:
        logger.error("Quote failed", symbol=symbol, error=str(e))
        raise HTTPException(status_code=404, detail=f"Quote not found for {symbol}")


@router.get("/{symbol}/history", response_model=PriceHistoryResponse)
async def get_history(
    symbol: str,
    timeframe: str = Query("1Y", regex="^(1D|1W|1M|3M|1Y|ALL)$"),
    db: AsyncSession = Depends(get_db),
):
    symbol = symbol.upper()
    
    interval_map = {
        "1D": "5m",
        "1W": "30m",
        "1M": "60m",
        "3M": "daily",
        "1Y": "daily",
        "ALL": "daily",
    }
    interval = interval_map.get(timeframe, "daily")
    
    try:
        if timeframe in ["1D", "1W", "1M"] and interval != "daily":
            points = await yfinance.get_intraday(symbol, interval=interval)
        else:
            outputsize = "full" if timeframe in ["1Y", "ALL"] else "compact"
            points = await yfinance.get_daily_adjusted(symbol, outputsize=outputsize)
        
        if not points:
            raise HTTPException(status_code=404, detail=f"No history for {symbol}")
        
        return PriceHistoryResponse(symbol=symbol, interval=interval, data=points)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("History failed", symbol=symbol, timeframe=timeframe, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch history")


@router.get("/{symbol}/indicators")
async def get_indicators(
    symbol: str,
    interval: str = Query("daily", regex="^(1m|5m|15m|30m|60m|daily)$"),
    indicators: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from app.services.indicator_engine import indicator_engine
    
    symbol = symbol.upper()
    requested = indicators.split(",") if indicators else None
    
    try:
        if interval == "daily":
            points = await yfinance.get_daily_adjusted(symbol, outputsize="compact")
        else:
            points = await yfinance.get_intraday(symbol, interval=interval, outputsize="compact")
        
        if not points:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        
        opens = [p.open for p in points]
        highs = [p.high for p in points]
        lows = [p.low for p in points]
        closes = [p.close for p in points]
        volumes = [p.volume for p in points]
        
        result = indicator_engine.calculate_all(opens, highs, lows, closes, volumes)
        
        response = {
            "symbol": symbol,
            "interval": interval,
            "timestamp": int(time.time() * 1000),
        }
        
        if requested is None or "rsi" in requested:
            response["rsi"] = {
                "value": result.rsi_value,
                "signal": result.rsi_signal,
            } if result.rsi_value is not None else None
        
        if requested is None or "macd" in requested:
            response["macd"] = {
                "macd": result.macd_value,
                "signal": result.macd_signal,
                "histogram": result.macd_histogram,
                "trend": result.macd_trend,
            } if result.macd_value is not None else None
        
        if requested is None or "bollingerBands" in requested or "bb" in requested:
            response["bollinger_bands"] = {
                "upper": result.bb_upper,
                "middle": result.bb_middle,
                "lower": result.bb_lower,
                "position": result.bb_position,
            } if result.bb_upper is not None else None
        
        if requested is None or "sma" in requested:
            response["sma_20"] = result.sma_20
            response["sma_50"] = result.sma_50
            response["sma_200"] = result.sma_200
        
        if requested is None or "ema" in requested:
            response["ema_20"] = result.ema_20
            response["ema_50"] = result.ema_50
        
        if requested is None or "stochastic" in requested:
            response["stochastic"] = {
                "k": result.stochastic_k,
                "d": result.stochastic_d,
                "signal": result.stochastic_signal,
            } if result.stochastic_k is not None else None
        
        if requested is None or "atr" in requested:
            response["atr"] = result.atr
        
        if requested is None or "adx" in requested:
            response["adx"] = {
                "value": result.adx_value,
                "trend": result.adx_trend,
            } if result.adx_value is not None else None
        
        if requested is None or "obv" in requested:
            response["obv"] = result.obv
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Indicators failed", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate indicators")


# Watchlist routes
watchlist_router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@watchlist_router.get("", response_model=List[WatchlistItem])
async def get_watchlist(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).order_by(Watchlist.added_at.desc()))
    items = result.scalars().all()
    return [WatchlistItem(symbol=w.symbol, name=w.name, added_at=w.added_at) for w in items]


@watchlist_router.post("", response_model=WatchlistItem)
async def add_to_watchlist(item: WatchlistAdd, db: AsyncSession = Depends(get_db)):
    symbol = item.symbol.upper()
    
    existing = await db.execute(select(Watchlist).where(Watchlist.symbol == symbol))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already in watchlist")
    
    try:
        search_results = await yfinance.search_symbols(symbol)
        name = search_results[0].name if search_results else symbol
    except Exception:
        name = symbol
    
    watchlist_item = Watchlist(symbol=symbol, name=name)
    db.add(watchlist_item)
    await db.commit()
    await db.refresh(watchlist_item)
    
    return WatchlistItem(symbol=watchlist_item.symbol, name=watchlist_item.name, added_at=watchlist_item.added_at)


@watchlist_router.delete("/{symbol}")
async def remove_from_watchlist(symbol: str, db: AsyncSession = Depends(get_db)):
    symbol = symbol.upper()
    result = await db.execute(select(Watchlist).where(Watchlist.symbol == symbol))
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Not in watchlist")
    
    await db.delete(item)
    await db.commit()
    
    return {"message": "Removed from watchlist"}


# Health check
health_router = APIRouter(prefix="", tags=["health"])


@health_router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "ok"
    try:
        await db.execute(select(1))
    except Exception:
        db_status = "error"
    
    redis_status = "ok"
    try:
        import redis.asyncio as redis
        r = redis.from_url(settings.redis_url)
        await r.ping()
        await r.close()
    except Exception:
        redis_status = "error"
    
    return HealthResponse(
        status="healthy" if db_status == "ok" and redis_status == "ok" else "degraded",
        timestamp=datetime.utcnow(),
        version="0.1.0",
        database=db_status,
        redis=redis_status,
    )


from datetime import datetime