from app.api.websocket import camelize
from app.schemas import (
    PredictionPoint,
    QuoteResponse,
    SymbolSearchResult,
    TechnicalIndicatorsResponse,
)
from app.services.indicator_engine import IndicatorEngine
from app.services.market_data import YahooFinanceClient


def test_quote_serializes_with_camel_case_aliases():
    quote = QuoteResponse(
        symbol="AAPL",
        price=100.0,
        change=1.5,
        change_percent=1.52,
        volume=1000,
        high=101.0,
        low=99.0,
        open=99.5,
        previous_close=98.5,
        timestamp=1_700_000_000_000,
    )

    dumped = quote.model_dump(by_alias=True)

    assert dumped["changePercent"] == 1.52
    assert dumped["previousClose"] == 98.5
    assert "change_percent" not in dumped


def test_prediction_point_serializes_with_camel_case_aliases():
    point = PredictionPoint(
        date="2026-11-15",
        predicted_close=101.0,
        upper_bound=102.0,
        lower_bound=100.0,
        confidence=0.9,
        direction="up",
    )

    dumped = point.model_dump(by_alias=True)

    assert dumped["predictedClose"] == 101.0
    assert dumped["upperBound"] == 102.0
    assert dumped["lowerBound"] == 100.0


def test_symbol_search_result_has_safe_defaults():
    result = SymbolSearchResult(symbol="AAPL", name="Apple Inc.")

    assert result.type is None
    assert result.region is None
    assert result.currency == "USD"


def test_technical_indicators_response_uses_camel_case():
    response = TechnicalIndicatorsResponse(
        symbol="AAPL",
        interval="daily",
        timestamp=1_700_000_000_000,
        sma_20=1.0,
        bollinger_bands=None,
    )

    dumped = response.model_dump(by_alias=True)

    assert "sma20" in dumped
    assert "bollingerBands" in dumped


def test_camelize_converts_nested_payloads():
    payload = {
        "ensemble_signal": "buy",
        "ml_predictions": [{"predicted_close": 1.0, "upper_bound": 2.0}],
        "nested": {"model_version": "v1"},
    }

    assert camelize(payload) == {
        "ensembleSignal": "buy",
        "mlPredictions": [{"predictedClose": 1.0, "upperBound": 2.0}],
        "nested": {"modelVersion": "v1"},
    }


def test_rsi_is_fully_overbought_for_monotonic_increase():
    prices = [float(i) for i in range(1, 31)]

    values = IndicatorEngine.rsi(prices, period=14)

    assert values[-1] == 100.0


def test_sma_and_ema_values():
    prices = [float(i) for i in range(1, 11)]

    assert IndicatorEngine.sma(prices, 5)[-1] == 8.0
    assert IndicatorEngine.ema(prices, 5)[-1] > 0


def test_chart_points_timestamps_are_milliseconds():
    result = {
        "timestamp": [1_700_000_000],
        "indicators": {
            "quote": [
                {
                    "open": [100.0],
                    "high": [101.0],
                    "low": [99.0],
                    "close": [100.5],
                    "volume": [1000],
                }
            ]
        },
    }

    points = YahooFinanceClient._chart_points(result)

    assert len(points) == 1
    assert points[0].timestamp == 1_700_000_000_000