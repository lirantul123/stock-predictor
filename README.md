# Stock Predictor

A professional stock prediction platform combining LSTM deep learning with technical analysis indicators.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + TradingView Lightweight Charts
- **Backend**: FastAPI + Python + SQLAlchemy + Socket.io + PyTorch
- **Data**: Yahoo Finance via yfinance (no API key or daily request limit)
- **ML**: LSTM neural networks + ensemble with technical indicators
- **Real-time**: WebSocket for live price updates
- **Deployment**: Docker Compose (local development)

## Features

- 📈 **Professional Charts** - TradingView Lightweight Charts with candlesticks, volume, indicators
- 🤖 **ML Predictions** - LSTM models trained per symbol with 5-day forecast
- 📊 **Technical Indicators** - RSI, MACD, Bollinger Bands, SMA/EMA, Stochastic, ATR, ADX, OBV
- 🎯 **Ensemble Signals** - Combined ML + technical analysis with agreement scoring
- ⚡ **Real-time Updates** - WebSocket live price feeds
- 👁️ **Watchlist** - Persistent localStorage watchlist
- 🌙 **Dark/Light Theme** - System-aware with manual toggle

## Quick Start

### Prerequisites

- Docker & Docker Compose
- No market-data API key required (Yahoo Finance via yfinance)

### Development

```bash
# Clone and navigate
cd stock-predictor

# Copy env file
cp backend/.env.example backend/.env

# Start all services
docker-compose up --build

# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# WebSocket: ws://localhost:8000/ws
```

### Train Initial Models

```bash
# After backend is running, train models for popular symbols
docker-compose exec backend python scripts/train_models.py
```

## Project Structure

```
stock-predictor/
├── docker-compose.yml
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/       # Chart, Indicators, Predictions, Header, Dashboard
│   │   ├── hooks/            # useMarketData, useWebSocket
│   │   ├── services/         # api.ts, websocket.ts
│   │   ├── stores/           # Zustand state management
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # Helpers
│   └── Dockerfile
├── backend/                  # FastAPI + Python
│   ├── app/
│   │   ├── api/              # Routes + WebSocket
│   │   ├── services/         # Yahoo Finance, Indicators, Predictions
│   │   ├── ml/               # LSTM models, training
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── db/               # Database session
│   ├── scripts/              # Training scripts
│   └── Dockerfile
└── ml-artifacts/             # Trained model weights (gitignored)
```

## API Endpoints

### Market Data
- `GET /api/symbols/search?q={query}` - Search symbols
- `GET /api/symbols/popular` - Popular symbols
- `GET /api/symbols/{symbol}/quote` - Real-time quote
- `GET /api/symbols/{symbol}/history?timeframe=1Y` - Price history
- `GET /api/symbols/{symbol}/indicators?interval=daily` - Technical indicators

### Predictions
- `GET /api/predictions/{symbol}?horizon=5` - Ensemble prediction
- `POST /api/predictions/{symbol}/train` - Train model
- `GET /api/predictions/models/list` - List trained models

### Watchlist
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add symbol
- `DELETE /api/watchlist/{symbol}` - Remove symbol

### WebSocket Events
- `subscribe_price` / `unsubscribe_price` - Real-time quotes
- `subscribe_indicators` / `unsubscribe_indicators` - Indicator updates
- `subscribe_predictions` / `unsubscribe_predictions` - Prediction updates

## Technical Indicators (Pure Python)

All indicators implemented without TA-Lib dependency:

- **RSI (14)** - Relative Strength Index
- **MACD (12,26,9)** - Moving Average Convergence Divergence
- **Bollinger Bands (20,2)** - Volatility bands
- **SMA/EMA** - Simple/Exponential Moving Averages (20, 50, 200)
- **Stochastic (14,3)** - Momentum oscillator
- **ATR (14)** - Average True Range
- **ADX (14)** - Average Directional Index
- **OBV** - On-Balance Volume

## ML Model

- **Architecture**: 2-layer LSTM (128 hidden) → Dense(64) → Dense(32) → Dense(5)
- **Input**: 30 days × 20 features (OHLCV + 15 technical indicators)
- **Output**: 5-day forward returns prediction
- **Training**: Walk-forward validation, early stopping, ReduceLROnPlateau
- **Ensemble**: 60% LSTM + 40% Technical consensus

## Configuration

Key settings in `backend/app/config.py`:

- `market_data_provider`: yfinance (configured in `backend/app/config.py`)
- `sequence_length`: 30 days
- `prediction_horizon_default`: 5 days
- `model_retrain_schedule`: Weekly (Sunday 2 AM)

## License

MIT