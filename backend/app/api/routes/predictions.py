from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timedelta, timezone
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

            # The dashboard refetches the prediction on a timer, so the same
            # forecast would otherwise be inserted over and over. Keep one row
            # per symbol+horizon per day and refresh it in place.
            day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            existing = (
                await db.execute(
                    select(Prediction)
                    .where(
                        Prediction.symbol_id == sym_row.id,
                        Prediction.horizon == f"{horizon}d",
                        Prediction.generated_at >= day_start,
                    )
                    .order_by(Prediction.generated_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()

            if existing is not None:
                existing.current_price = closes[-1]
                existing.ensemble_signal = ensemble["ensemble_signal"]
                existing.ml_signal = ensemble["ml_signal"]
                existing.technical_signal = ensemble["technical_signal"]
                existing.agreement = ensemble["agreement"]
                existing.confidence = ensemble["confidence"]
                existing.model_version = ensemble["model_version"]
                existing.predictions_json = json.dumps(ml_predictions)
                existing.baseline_price = closes[-1]
                existing.baseline_timestamp = points[-1].timestamp
                existing.expires_at = datetime.now(timezone.utc) + timedelta(days=horizon)
            else:
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
                    # expires_at is NOT NULL; without it the insert rolls back and
                    # no forecast is ever recorded.
                    expires_at=datetime.now(timezone.utc) + timedelta(days=horizon),
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

        # Daily closes let us score each forecast against what really happened.
        closes_by_date: dict[str, float] = {}
        try:
            daily = await yfinance.get_daily_adjusted(symbol, outputsize="compact")
            for p in daily:
                closes_by_date[datetime.fromtimestamp(p.timestamp / 1000, tz=timezone.utc).date().isoformat()] = p.close
        except Exception:
            daily = []

        latest_close = daily[-1].close if daily else None

        out = []
        for r in rows:
            try:
                points = json.loads(r.predictions_json)
            except Exception:
                points = []

            # The stored JSON is snake_case (it comes straight from the model),
            # but the frontend types expect camelCase. Normalise here so the
            # history view can read predictedClose without a translation layer.
            normalised = [
                {
                    "date": p.get("date"),
                    "predictedClose": p.get("predicted_close"),
                    "upperBound": p.get("upper_bound"),
                    "lowerBound": p.get("lower_bound"),
                    "confidence": p.get("confidence"),
                    "direction": p.get("direction"),
                }
                for p in points
                if isinstance(p, dict)
            ]
            points = normalised

            # Score the final target: what the model expected for that date
            # versus the close that actually printed (or the latest close if
            # the target date has not arrived yet).
            actual_price = None
            target_date = None
            if points:
                target_date = points[-1].get("date")
                actual_price = closes_by_date.get(target_date)
            if actual_price is None and target_date and latest_close is not None:
                # Target is in the future — mark it pending rather than wrong.
                actual_price = None

            predicted_target = points[-1].get("predictedClose") if points else None
            error_pct = None
            if actual_price is not None and predicted_target:
                error_pct = (actual_price - predicted_target) / predicted_target * 100

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
                # Scoring: what the model expected vs what the market did.
                "targetDate": target_date,
                "predictedTarget": predicted_target,
                "actualPrice": actual_price,
                "errorPct": error_pct,
                "latestClose": latest_close,
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