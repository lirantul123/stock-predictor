from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.db.session import get_db
from app.models import Symbol, PriceHistory, Prediction, ModelArtifact
from app.schemas import PredictionResponse, PredictionPoint
from app.services.prediction_service import prediction_service
from app.services.indicator_engine import indicator_engine
from app.services.market_data import yfinance
from app.config import settings
import structlog
import time

logger = structlog.get_logger()
router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/{symbol}", response_model=PredictionResponse)
async def get_prediction(
    symbol: str,
    horizon: int = Query(5, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    symbol = symbol.upper()
    
    try:
        points = await yfinance.get_daily_adjusted(symbol, outputsize="compact")
        
        if not points or len(points) < 100:
            raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")
        
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
        
        ensemble = prediction_service.get_ensemble_prediction(
            symbol, price_history, indicators, horizon
        )
        
        ml_predictions = ensemble.get("ml_predictions", [])
        
        if not ml_predictions:
            raise HTTPException(status_code=503, detail="ML model not available")
        
        return PredictionResponse(
            symbol=symbol,
            horizon=f"{horizon}d",
            current_price=closes[-1],
            predictions=[PredictionPoint(**p) for p in ml_predictions],
            ensemble_signal=ensemble["ensemble_signal"],
            ml_signal=ensemble["ml_signal"],
            technical_signal=ensemble["technical_signal"],
            agreement=ensemble["agreement"],
            confidence=ensemble["confidence"],
            model_version=ensemble["model_version"],
            generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prediction failed", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail="Prediction failed")


@router.post("/{symbol}/train")
async def train_model(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    symbol = symbol.upper()
    
    try:
        points = await yfinance.get_daily_adjusted(symbol, outputsize="compact")
        
        if not points or len(points) < 80:
            raise HTTPException(status_code=400, detail=f"Insufficient data for training {symbol}")
        
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
        
        metadata = prediction_service.train_model(symbol, price_history)
        
        return {
            "message": f"Model trained for {symbol}",
            "metadata": metadata,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Training failed", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail="Training failed")


@router.get("/models/list")
async def list_models(db: AsyncSession = Depends(get_db)):
    models = prediction_service.model_store.list_models()
    return {"models": models}