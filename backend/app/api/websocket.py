import socketio
import asyncio
import json
import time
from typing import Dict, Set, Optional
from app.config import settings
from app.services.market_data import yfinance
from app.services.indicator_engine import indicator_engine
from app.services.prediction_service import prediction_service
import structlog

logger = structlog.get_logger()

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_interval=25,
    ping_timeout=20,
)

subscriptions: Dict[str, Dict[str, Set[str]]] = {
    "price": {},
    "indicators": {},
    "predictions": {},
}


async def get_symbol_subscribers(event_type: str, symbol: str) -> Set[str]:
    return subscriptions[event_type].get(symbol, set())


async def subscribe(event_type: str, symbol: str, sid: str):
    if symbol not in subscriptions[event_type]:
        subscriptions[event_type][symbol] = set()
    subscriptions[event_type][symbol].add(sid)
    logger.debug("Subscribed", event_type=event_type, symbol=symbol, sid=sid)


async def unsubscribe(event_type: str, symbol: str, sid: str):
    if symbol in subscriptions[event_type]:
        subscriptions[event_type][symbol].discard(sid)
        if not subscriptions[event_type][symbol]:
            del subscriptions[event_type][symbol]
    logger.debug("Unsubscribed", event_type=event_type, symbol=symbol, sid=sid)


async def broadcast_price_update(symbol: str):
    try:
        quote = await yfinance.get_global_quote(symbol)
        data = quote.model_dump()
        subscribers = await get_symbol_subscribers("price", symbol)
        for sid in subscribers:
            await sio.emit("price_update", data, to=sid)
    except Exception as e:
        logger.warning("Price broadcast failed", symbol=symbol, error=str(e))


async def broadcast_indicator_update(symbol: str):
    try:
        points = await yfinance.get_daily_adjusted(symbol, outputsize="compact")
        if not points:
            return
        
        opens = [p.open for p in points]
        highs = [p.high for p in points]
        lows = [p.low for p in points]
        closes = [p.close for p in points]
        volumes = [p.volume for p in points]
        
        result = indicator_engine.calculate_all(opens, highs, lows, closes, volumes)
        
        data = {
            "symbol": symbol,
            "indicators": {
                "rsi": {"value": result.rsi_value, "signal": result.rsi_signal} if result.rsi_value else None,
                "macd": {"macd": result.macd_value, "signal": result.macd_signal, "histogram": result.macd_histogram, "trend": result.macd_trend} if result.macd_value else None,
                "bollinger_bands": {"upper": result.bb_upper, "middle": result.bb_middle, "lower": result.bb_lower, "position": result.bb_position} if result.bb_upper else None,
                "sma_20": result.sma_20,
                "sma_50": result.sma_50,
                "sma_200": result.sma_200,
                "ema_20": result.ema_20,
                "ema_50": result.ema_50,
                "stochastic": {"k": result.stochastic_k, "d": result.stochastic_d, "signal": result.stochastic_signal} if result.stochastic_k else None,
                "atr": result.atr,
                "adx": {"value": result.adx_value, "trend": result.adx_trend} if result.adx_value else None,
                "obv": result.obv,
            },
            "timestamp": int(time.time() * 1000),
        }
        
        subscribers = await get_symbol_subscribers("indicators", symbol)
        for sid in subscribers:
            await sio.emit("indicator_update", data, to=sid)
    except Exception as e:
        logger.warning("Indicator broadcast failed", symbol=symbol, error=str(e))


async def broadcast_prediction_update(symbol: str):
    try:
        points = await yfinance.get_daily_adjusted(symbol, outputsize="compact")
        if not points or len(points) < 100:
            return
        
        opens = [p.open for p in points]
        highs = [p.high for p in points]
        lows = [p.low for p in points]
        closes = [p.close for p in points]
        volumes = [p.volume for p in points]
        
        indicators = indicator_engine.calculate_all(opens, highs, lows, closes, volumes)
        
        price_history = [
            {
                "timestamp": p.timestamp,
                "open": p.open,
                "high": p.high,
                "low": p.low,
                "close": p.close,
                "volume": p.volume,
            }
            for p in points
        ]
        
        ensemble = prediction_service.get_ensemble_prediction(symbol, price_history, indicators, 5)
        
        data = {
            "symbol": symbol,
            "prediction": {
                "ensemble_signal": ensemble["ensemble_signal"],
                "ml_signal": ensemble["ml_signal"],
                "technical_signal": ensemble["technical_signal"],
                "agreement": ensemble["agreement"],
                "confidence": ensemble["confidence"],
                "ml_predictions": ensemble["ml_predictions"],
                "model_version": ensemble["model_version"],
            },
            "timestamp": int(time.time() * 1000),
        }
        
        subscribers = await get_symbol_subscribers("predictions", symbol)
        for sid in subscribers:
            await sio.emit("prediction_update", data, to=sid)
    except Exception as e:
        logger.warning("Prediction broadcast failed", symbol=symbol, error=str(e))


async def price_update_loop():
    while True:
        try:
            all_symbols = set()
            for symbol in subscriptions["price"]:
                all_symbols.add(symbol)
            
            for symbol in all_symbols:
                await broadcast_price_update(symbol)
            
            await asyncio.sleep(10)
        except Exception as e:
            logger.error("Price update loop error", error=str(e))
            await asyncio.sleep(30)


async def indicator_update_loop():
    while True:
        try:
            all_symbols = set()
            for symbol in subscriptions["indicators"]:
                all_symbols.add(symbol)
            
            for symbol in all_symbols:
                await broadcast_indicator_update(symbol)
            
            await asyncio.sleep(60)
        except Exception as e:
            logger.error("Indicator update loop error", error=str(e))
            await asyncio.sleep(60)


async def prediction_update_loop():
    while True:
        try:
            all_symbols = set()
            for symbol in subscriptions["predictions"]:
                all_symbols.add(symbol)
            
            for symbol in all_symbols:
                await broadcast_prediction_update(symbol)
            
            await asyncio.sleep(300)
        except Exception as e:
            logger.error("Prediction update loop error", error=str(e))
            await asyncio.sleep(300)


@sio.event
async def connect(sid, environ, auth):
    logger.info("Client connected", sid=sid)


@sio.event
async def disconnect(sid):
    for event_type in subscriptions:
        for symbol in list(subscriptions[event_type].keys()):
            await unsubscribe(event_type, symbol, sid)
    logger.info("Client disconnected", sid=sid)


@sio.event
async def subscribe_price(sid, data):
    symbol = data.get("symbol", "").upper()
    if symbol:
        await subscribe("price", symbol, sid)
        await sio.emit("subscribed", {"symbol": symbol, "type": "price"}, to=sid)
        quote = await yfinance.get_global_quote(symbol)
        await sio.emit("price_update", quote.model_dump(), to=sid)


@sio.event
async def unsubscribe_price(sid, data):
    symbol = data.get("symbol", "").upper()
    if symbol:
        await unsubscribe("price", symbol, sid)
        await sio.emit("unsubscribed", {"symbol": symbol, "type": "price"}, to=sid)


@sio.event
async def subscribe_indicators(sid, data):
    symbol = data.get("symbol", "").upper()
    if symbol:
        await subscribe("indicators", symbol, sid)
        await sio.emit("subscribed", {"symbol": symbol, "type": "indicators"}, to=sid)
        await broadcast_indicator_update(symbol)


@sio.event
async def unsubscribe_indicators(sid, data):
    symbol = data.get("symbol", "").upper()
    if symbol:
        await unsubscribe("indicators", symbol, sid)
        await sio.emit("unsubscribed", {"symbol": symbol, "type": "indicators"}, to=sid)


@sio.event
async def subscribe_predictions(sid, data):
    symbol = data.get("symbol", "").upper()
    if symbol:
        await subscribe("predictions", symbol, sid)
        await sio.emit("subscribed", {"symbol": symbol, "type": "predictions"}, to=sid)
        await broadcast_prediction_update(symbol)


@sio.event
async def unsubscribe_predictions(sid, data):
    symbol = data.get("symbol", "").upper()
    if symbol:
        await unsubscribe("predictions", symbol, sid)
        await sio.emit("unsubscribed", {"symbol": symbol, "type": "predictions"}, to=sid)


socket_app = socketio.ASGIApp(sio, socketio_path="/ws")