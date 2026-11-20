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
import json

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

        # Persist the forecast so it can be scored later against the actual close.
        try:
            sym_row = (await db.execute(select(Symbol).where(Symbol.symbol == symbol))).scalar_one_or_none()
            if sym_row is None:
                sym_row = Symbol(symbol=symbol, name=symbol)
                db.add(sym_row)
                await db.flush()

            record = Prediction(
                symbol_id=sym_row.id,
                horizon=f"{horizon}d",
                current_price=closes[-1],
                ensemble_signal=ensemble["ensemble_signal"],
                ml_signal=ensemble["ml_signal"],
                technical_signal=ensemble["technical_signal"],
                agreement=ensemble["agreement"],
                confidence=ensemble["confidence"],
                model_version=ensemble["model_version"],
                predictions_json=json.dumps(ml_predictions),
                baseline_price=closes[-1],
                baseline_timestamp=points[-1].timestamp,
            )
            db.add(record)
            await db.commit()
        except Exception as exc:
            logger.error("Prediction record failed", symbol=symbol, error=str(exc))
            await db.rollback()

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


@router.get("/{symbol}/history")
async def prediction_history(
    symbol: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Past forecasts for a symbol, newest first.

    Each entry carries the forecast points and the baseline price the model
    was built from, so the UI can score accuracy as the market moves.
    """
    symbol = symbol.upper()
    try:
        rows = (
            await db.execute(
                select(Prediction)
                .join(Symbol, Prediction.symbol_id == Symbol.id)
                .where(Symbol.symbol == symbol)
                .order_by(Prediction.generated_at.desc())
                .limit(limit)
            )
        ).scalars().all()

        out = []
        for r in rows:
            try:
                points = json.loads(r.predictions_json)
            except Exception:
                points = []
            out.append({
                "id": r.id,
                "horizon": r.horizon,
                "currentPrice": r.current_price,
                "baselinePrice": r.baseline_price,
                "baselineTimestamp": r.baseline_timestamp,
                "ensembleSignal": r.ensemble_signal,
                "mlSignal": r.ml_signal,
                "technicalSignal": r.technical_signal,
                "agreement": r.agreement,
                "confidence": r.confidence,
                "modelVersion": r.model_version,
                "generatedAt": r.generated_at.isoformat() if r.generated_at else None,
                "predictions": points,
                "userNote": r.user_note,
                "userExpectedDirection": r.user_expected_direction,
            })
        return {"symbol": symbol, "forecasts": out}
    except Exception as e:
        logger.error("Prediction history failed", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch prediction history")


@router.patch("/{symbol}/{prediction_id}")
async def update_prediction_note(
    symbol: str,
    prediction_id: int,
    note: Optional[str] = Query(None),
    expected_direction: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Attach a user annotation to a past forecast.

    Lets you record what you expected and why, so you can review later
    whether the model was right.
    """
    symbol = symbol.upper()
    try:
        row = (
            await db.execute(
                select(Prediction)
                .join(Symbol, Prediction.symbol_id == Symbol.id)
                .where(Symbol.symbol == symbol, Prediction.id == prediction_id)
            )
        ).scalar_one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail="Forecast not found")

        if note is not None:
            row.user_note = note
        if expected_direction is not None:
            row.user_expected_direction = expected_direction

        await db.commit()
        return {"ok": True, "id": row.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prediction note failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update note")