#!/usr/bin/env python3
"""Initial model training script for popular symbols.

Yahoo Finance market data requires no API key or request quota.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.market_data import yfinance
from app.services.prediction_service import prediction_service
import structlog

logger = structlog.get_logger()

# Symbols trained by the initial backfill
POPULAR_SYMBOLS = ["AAPL", "MSFT", "TSLA"]

# Avoid hammering Yahoo Finance when training several symbols
REQUEST_DELAY_SECONDS = 2


async def train_symbol(symbol: str):
    try:
        logger.info("Fetching data for training", symbol=symbol)
        points = await yfinance.get_daily_adjusted(symbol, outputsize="compact")

        if not points or len(points) < 80:
            logger.warning("Insufficient data", symbol=symbol, count=len(points) if points else 0)
            return False

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

        logger.info("Training model", symbol=symbol, data_points=len(price_history))
        metadata = prediction_service.train_model(symbol, price_history)

        logger.info("Model trained successfully", symbol=symbol, metadata=metadata)
        return True
    except Exception as e:
        logger.error("Training failed", symbol=symbol, error=str(e))
        return False


async def main():
    logger.info("Starting initial model training", symbols=POPULAR_SYMBOLS)

    results = {}
    for i, symbol in enumerate(POPULAR_SYMBOLS):
        success = await train_symbol(symbol)
        results[symbol] = success

        if not success:
            logger.warning("Symbol training failed, continuing", symbol=symbol)

        # Short pause between symbols
        if i < len(POPULAR_SYMBOLS) - 1:
            logger.info("Pausing before next symbol", seconds=REQUEST_DELAY_SECONDS)
            await asyncio.sleep(REQUEST_DELAY_SECONDS)

    logger.info("Training complete", results=results)

    for symbol, success in results.items():
        status = "SUCCESS" if success else "FAILED"
        print(f"{symbol}: {status}")

    if not any(results.values()):
        print("\nWARNING: All models failed. Check backend logs and network access to Yahoo Finance.")


if __name__ == "__main__":
    asyncio.run(main())
