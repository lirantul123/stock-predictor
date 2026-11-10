#!/usr/bin/env python3
"""Initial model training script for popular symbols."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.alpha_vantage import alpha_vantage
from app.services.prediction_service import prediction_service
import structlog

logger = structlog.get_logger()

POPULAR_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
    "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD",
]

async def train_symbol(symbol: str):
    try:
        logger.info("Fetching data for training", symbol=symbol)
        points = await alpha_vantage.get_daily_adjusted(symbol, outputsize="full")
        
        if not points or len(points) < 500:
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
    logger.info("Starting initial model training")
    
    results = {}
    for symbol in POPULAR_SYMBOLS:
        success = await train_symbol(symbol)
        results[symbol] = success
        
        if not success:
            logger.warning("Symbol training failed, continuing", symbol=symbol)
        
        await asyncio.sleep(2)
    
    logger.info("Training complete", results=results)
    
    for symbol, success in results.items():
        status = "SUCCESS" if success else "FAILED"
        print(f"{symbol}: {status}")

if __name__ == "__main__":
    asyncio.run(main())