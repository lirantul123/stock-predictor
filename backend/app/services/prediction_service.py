import torch
import torch.nn as nn
import time
import numpy as np
import pandas as pd
from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path
import joblib
import json
import hashlib
from datetime import datetime, timedelta
from app.config import settings
from app.services.indicator_engine import IndicatorEngine, IndicatorResult, get_technical_signal
import structlog

logger = structlog.get_logger()


class LSTMModel(nn.Module):
    def __init__(
        self,
        input_size: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        output_size: int = 5,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
        )
        
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_size, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, output_size)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        out = lstm_out[:, -1, :]
        out = self.dropout(out)
        out = self.relu(self.fc1(out))
        out = self.dropout(out)
        out = self.relu(self.fc2(out))
        out = self.fc3(out)
        return out


class ModelStore:
    def __init__(self, artifacts_path: str = "./ml-artifacts"):
        self.artifacts_path = Path(artifacts_path)
        self.artifacts_path.mkdir(parents=True, exist_ok=True)
        self._models: Dict[str, LSTMModel] = {}
        self._scalers: Dict[str, Any] = {}
    
    def _get_model_path(self, symbol: str) -> Path:
        return self.artifacts_path / f"{symbol}_lstm.pth"
    
    def _get_scaler_path(self, symbol: str) -> Path:
        return self.artifacts_path / f"{symbol}_scaler.pkl"
    
    def _get_metadata_path(self, symbol: str) -> Path:
        return self.artifacts_path / f"{symbol}_metadata.json"
    
    def save_model(self, symbol: str, model: LSTMModel, scaler: Any, metadata: Dict[str, Any]):
        torch.save(model.state_dict(), self._get_model_path(symbol))
        joblib.dump(scaler, self._get_scaler_path(symbol))
        with open(self._get_metadata_path(symbol), 'w') as f:
            json.dump(metadata, f)
        logger.info("Model saved", symbol=symbol)
    
    def load_model(self, symbol: str, input_size: int) -> Tuple[Optional[LSTMModel], Optional[Any], Optional[Dict]]:
        model_path = self._get_model_path(symbol)
        scaler_path = self._get_scaler_path(symbol)
        metadata_path = self._get_metadata_path(symbol)
        
        if not model_path.exists() or not scaler_path.exists():
            return None, None, None
        
        model = LSTMModel(
            input_size=input_size,
            hidden_size=settings.lstm_hidden_size,
            num_layers=settings.lstm_num_layers,
            dropout=settings.dropout,
        )
        model.load_state_dict(torch.load(model_path, map_location='cpu'))
        model.eval()
        
        scaler = joblib.load(scaler_path)
        
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        return model, scaler, metadata
    
    def list_models(self) -> List[Dict[str, Any]]:
        models = []
        for metadata_file in self.artifacts_path.glob("*_metadata.json"):
            symbol = metadata_file.stem.replace("_metadata", "")
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            metadata['symbol'] = symbol
            models.append(metadata)
        return models


class FeatureEngineer:
    def __init__(self, sequence_length: int = 30):
        self.sequence_length = sequence_length
        self.indicator_engine = IndicatorEngine()
    
    def create_features(
        self,
        opens: np.ndarray,
        highs: np.ndarray,
        lows: np.ndarray,
        closes: np.ndarray,
        volumes: np.ndarray,
    ) -> np.ndarray:
        n = len(closes)
        if n < self.sequence_length + 50:
            raise ValueError(f"Need at least {self.sequence_length + 50} data points")
        
        features = []
        started_at = time.monotonic()

        for i in range(n):
            if i < 50:
                features.append([0.0] * 20)
                continue
            
            window_opens = opens[i-50:i+1]
            window_highs = highs[i-50:i+1]
            window_lows = lows[i-50:i+1]
            window_closes = closes[i-50:i+1]
            window_volumes = volumes[i-50:i+1]
            
            indicators = self.indicator_engine.calculate_all(
                window_opens.tolist(),
                window_highs.tolist(),
                window_lows.tolist(),
                window_closes.tolist(),
                window_volumes.tolist(),
            )
            
            returns = np.diff(window_closes[-11:]) / window_closes[-11:-1]
            volatility = np.std(returns) if len(returns) > 1 else 0
            volume_ratio = volumes[i] / np.mean(volumes[i-20:i]) if np.mean(volumes[i-20:i]) > 0 else 1
            
            feat = [
                indicators.rsi_value or 50,
                indicators.macd_value or 0,
                indicators.macd_histogram or 0,
                indicators.bb_position == "upper" and 1 or (indicators.bb_position == "lower" and -1 or 0),
                (indicators.sma_20 - indicators.sma_50) / indicators.sma_50 if indicators.sma_20 and indicators.sma_50 else 0,
                (indicators.ema_20 - indicators.ema_50) / indicators.ema_50 if indicators.ema_20 and indicators.ema_50 else 0,
                indicators.stochastic_k or 50,
                indicators.atr / window_closes[-1] if indicators.atr else 0,
                indicators.adx_value or 0,
                indicators.obv / 1e6 if indicators.obv else 0,
                returns[-1] if len(returns) > 0 else 0,
                np.mean(returns) if len(returns) > 0 else 0,
                volatility,
                volume_ratio,
                (window_closes[-1] - indicators.sma_20) / indicators.sma_20 if indicators.sma_20 else 0,
                (window_closes[-1] - indicators.sma_50) / indicators.sma_50 if indicators.sma_50 else 0,
                (window_highs[-1] - window_lows[-1]) / window_closes[-1],
                volumes[i] / np.mean(volumes[-10:]) if np.mean(volumes[-10:]) > 0 else 1,
                1 if indicators.macd_trend == "bullish" else (-1 if indicators.macd_trend == "bearish" else 0),
                1 if indicators.rsi_signal == "oversold" else (-1 if indicators.rsi_signal == "overbought" else 0),
            ]
            features.append(feat)
            if i == 0 or (i + 1) % 25 == 0:
                logger.info("Feature engineering progress", point=i + 1, total=n, elapsed_seconds=round(time.monotonic() - started_at, 1))

        return np.array(features, dtype=np.float32)
    
    def prepare_sequences(
        self,
        features: np.ndarray,
        targets: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        X, y = [], []
        for i in range(self.sequence_length, len(features)):
            X.append(features[i - self.sequence_length:i])
            y.append(targets[i])
        return np.array(X), np.array(y)


class PredictionService:
    def __init__(self):
        self.model_store = ModelStore(settings.ml_artifacts_path)
        self.feature_engineer = FeatureEngineer(settings.sequence_length)
        self.indicator_engine = IndicatorEngine()
    
    def prepare_training_data(
        self,
        symbol: str,
        price_history: List[Dict],
    ) -> Tuple[np.ndarray, np.ndarray, Any]:
        df = pd.DataFrame(price_history)
        df = df.sort_values('timestamp')
        
        opens = df['open'].values
        highs = df['high'].values
        lows = df['low'].values
        closes = df['close'].values
        volumes = df['volume'].values

        features = self.feature_engineer.create_features(opens, highs, lows, closes, volumes)

        horizon = 5
        valid_len = len(closes) - horizon
        if valid_len <= self.feature_engineer.sequence_length:
            raise ValueError("Insufficient training data")

        features = features[:valid_len]

        scaler_path = self.model_store._get_scaler_path(symbol)
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        joblib.dump(scaler, scaler_path)

        targets = np.zeros((valid_len, horizon), dtype=np.float32)
        for step in range(horizon):
            current = closes[step:valid_len + step]
            following = closes[step + 1:valid_len + step + 1]
            targets[:, step] = (following - current) / current

        X, y = self.feature_engineer.prepare_sequences(features_scaled, targets)

        return X, y, scaler

    def train_model(self, symbol: str, price_history: List[Dict]) -> Dict[str, Any]:
        logger.info("Training model", symbol=symbol)
        
        X, y, scaler = self.prepare_training_data(symbol, price_history)
        
        if len(X) < 10:
            raise ValueError("Insufficient training data")
        
        split_idx = int(len(X) * 0.8)
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        X_train_t = torch.FloatTensor(X_train)
        y_train_t = torch.FloatTensor(y_train)
        X_val_t = torch.FloatTensor(X_val)
        y_val_t = torch.FloatTensor(y_val)
        
        train_dataset = torch.utils.data.TensorDataset(X_train_t, y_train_t)
        train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=32, shuffle=True)
        
        model = LSTMModel(
            input_size=X.shape[2],
            hidden_size=settings.lstm_hidden_size,
            num_layers=settings.lstm_num_layers,
            dropout=settings.dropout,
        )
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
        
        best_val_loss = float('inf')
        patience = 15
        patience_counter = 0
        
        for epoch in range(100):
            model.train()
            train_loss = 0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                pred = model(batch_X)
                loss = criterion(pred, batch_y)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                train_loss += loss.item()
            
            model.eval()
            with torch.no_grad():
                val_pred = model(X_val_t)
                val_loss = criterion(val_pred, y_val_t).item()
            
            scheduler.step(val_loss)
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                best_model_state = model.state_dict().copy()
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    break
        
        model.load_state_dict(best_model_state)
        
        metadata = {
            "symbol": symbol,
            "model_type": "lstm",
            "version": datetime.utcnow().isoformat(),
            "input_size": X.shape[2],
            "hidden_size": settings.lstm_hidden_size,
            "num_layers": settings.lstm_num_layers,
            "sequence_length": settings.sequence_length,
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "best_val_loss": best_val_loss,
            "features": 20,
            "horizon": 5,
            "trained_at": datetime.utcnow().isoformat(),
        }
        
        self.model_store.save_model(symbol, model, scaler, metadata)
        
        return metadata
    
    def predict(
        self,
        symbol: str,
        price_history: List[Dict],
        horizon: int = 5,
    ) -> Dict[str, Any]:
        model, scaler, metadata = self.model_store.load_model(symbol, 20)
        
        if model is None or scaler is None:
            raise ValueError(f"No trained model for {symbol}")
        
        df = pd.DataFrame(price_history)
        df = df.sort_values('timestamp')
        
        opens = df['open'].values
        highs = df['high'].values
        lows = df['low'].values
        closes = df['close'].values
        volumes = df['volume'].values
        
        features = self.feature_engineer.create_features(opens, highs, lows, closes, volumes)
        features_scaled = scaler.transform(features)
        
        last_sequence = features_scaled[-self.feature_engineer.sequence_length:]
        X = torch.FloatTensor(last_sequence).unsqueeze(0)
        
        model.eval()
        with torch.no_grad():
            pred = model(X).numpy()[0]
        
        current_price = closes[-1]
        predictions = []

        base_uncertainty = float(np.sqrt(max(metadata.get("best_val_loss", 0.0001), 1e-8)))

        model_steps = min(horizon, len(pred))

        for i in range(model_steps):
            pred_return = float(pred[i])
            pred_price = current_price * (1 + pred_return)

            uncertainty = base_uncertainty * (1 + i * 0.15)
            upper = pred_price * (1 + uncertainty)
            lower = pred_price * (1 - uncertainty)
            confidence = max(0.3, min(0.95, 1.0 - base_uncertainty * 10 - i * 0.02))

            pred_date = datetime.utcnow() + timedelta(days=i + 1)
            direction = "up" if pred_return > 0.005 else ("down" if pred_return < -0.005 else "flat")

            predictions.append({
                "date": pred_date.strftime("%Y-%m-%d"),
                "predicted_close": round(pred_price, 2),
                "upper_bound": round(upper, 2),
                "lower_bound": round(lower, 2),
                "confidence": round(confidence, 2),
                "direction": direction,
            })

            current_price = pred_price

        # Extrapolate beyond the model's native horizon using a damped continuation
        # of the last predicted return, so horizons > 5 are still useful.
        if horizon > model_steps:
            last_return = float(pred[-1]) if model_steps > 0 else 0.0
            damped_return = last_return
            for i in range(model_steps, horizon):
                damped_return *= 0.5
                pred_price = current_price * (1 + damped_return)

                uncertainty = base_uncertainty * (1 + i * 0.18)
                upper = pred_price * (1 + uncertainty)
                lower = pred_price * (1 - uncertainty)
                confidence = max(0.2, min(0.95, 1.0 - base_uncertainty * 10 - i * 0.03))

                pred_date = datetime.utcnow() + timedelta(days=i + 1)
                direction = "up" if damped_return > 0.003 else ("down" if damped_return < -0.003 else "flat")

                predictions.append({
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predicted_close": round(pred_price, 2),
                    "upper_bound": round(upper, 2),
                    "lower_bound": round(lower, 2),
                    "confidence": round(confidence, 2),
                    "direction": direction,
                })

                current_price = pred_price
        
        return {
            "predictions": predictions,
            "model_version": metadata.get("version", "unknown"),
        }
    
    def get_ensemble_prediction(
        self,
        symbol: str,
        price_history: List[Dict],
        indicators: IndicatorResult,
        horizon: int = 5,
    ) -> Dict[str, Any]:
        ml_result = None
        try:
            ml_result = self.predict(symbol, price_history, horizon)
        except Exception as e:
            logger.warning("ML prediction failed", symbol=symbol, error=str(e))
        
        technical_signal, technical_confidence = get_technical_signal(indicators)
        
        if ml_result and ml_result.get("predictions"):
            ml_predictions = ml_result["predictions"]
            ml_direction = ml_predictions[-1]["direction"]
            ml_confidence = np.mean([p["confidence"] for p in ml_predictions])
            
            if ml_direction == "up":
                ml_signal = "buy"
            elif ml_direction == "down":
                ml_signal = "sell"
            else:
                ml_signal = "hold"
        else:
            ml_signal = "hold"
            ml_confidence = 0.0
        
        if ml_signal == technical_signal:
            if ml_signal == "buy":
                ensemble = "strong_buy" if ml_confidence > 0.6 and technical_confidence > 0.5 else "buy"
            elif ml_signal == "sell":
                ensemble = "strong_sell" if ml_confidence > 0.6 and technical_confidence > 0.5 else "sell"
            else:
                ensemble = "hold"
            agreement = "strong" if ml_confidence > 0.6 and technical_confidence > 0.5 else "moderate"
        else:
            if ml_confidence > technical_confidence:
                ensemble = "buy" if ml_signal == "buy" else ("sell" if ml_signal == "sell" else "hold")
                agreement = "weak"
            else:
                ensemble = "buy" if technical_signal == "buy" else ("sell" if technical_signal == "sell" else "hold")
                agreement = "weak"
        
        if ml_signal != "hold" and technical_signal != "hold" and ml_signal != technical_signal:
            agreement = "conflict"
            ensemble = "hold"
        
        final_confidence = max(ml_confidence, technical_confidence) * 0.7 + min(ml_confidence, technical_confidence) * 0.3
        
        return {
            "ensemble_signal": ensemble,
            "ml_signal": ml_signal,
            "technical_signal": technical_signal,
            "agreement": agreement,
            "confidence": round(final_confidence, 2),
            "ml_predictions": ml_result.get("predictions", []) if ml_result else [],
            "model_version": ml_result.get("model_version", "unknown") if ml_result else "unknown",
        }


prediction_service = PredictionService()