import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

import pandas as pd
import requests

from app.config import settings
from app.schemas import QuoteResponse, PricePoint, SymbolSearchResult
from app.services.market_hours import market_session


POPULAR_SYMBOLS = [
    ("AAPL", "Apple Inc."),
    ("MSFT", "Microsoft Corporation"),
    ("GOOGL", "Alphabet Inc."),
    ("AMZN", "Amazon.com, Inc."),
    ("TSLA", "Tesla, Inc."),
    ("NVDA", "NVIDIA Corporation"),
    ("META", "Meta Platforms, Inc."),
    ("NFLX", "Netflix, Inc."),
    ("AMD", "Advanced Micro Devices, Inc."),
    ("INTC", "Intel Corporation"),
    ("AVGO", "Broadcom Inc."),
    ("ORCL", "Oracle Corporation"),
    ("CRM", "Salesforce, Inc."),
    ("ADBE", "Adobe Inc."),
    ("CSCO", "Cisco Systems, Inc."),
    ("QCOM", "Qualcomm Inc."),
    ("TXN", "Texas Instruments Inc."),
    ("AMAT", "Applied Materials, Inc."),
    ("MU", "Micron Technology, Inc."),
    ("IBM", "International Business Machines Corp."),
    ("DELL", "Dell Technologies Inc."),
    ("SMCI", "Super Micro Computer, Inc."),
    ("ARM", "Arm Holdings plc"),
    ("PLTR", "Palantir Technologies Inc."),
    ("TTWO", "Take-Two Interactive Software, Inc."),
    ("EA", "Electronic Arts Inc."),
    ("RBLX", "Roblox Corporation"),
    ("SPOT", "Spotify Technology S.A."),
    ("UBER", "Uber Technologies, Inc."),
    ("ABNB", "Airbnb, Inc."),
    ("SHOP", "Shopify Inc."),
    ("COIN", "Coinbase Global, Inc."),
    ("HOOD", "Robinhood Markets, Inc."),
    ("SOFI", "SoFi Technologies, Inc."),
    ("JPM", "JPMorgan Chase & Co."),
    ("V", "Visa Inc."),
    ("MA", "Mastercard Inc."),
    ("BAC", "Bank of America Corp."),
    ("GS", "Goldman Sachs Group, Inc."),
    ("MS", "Morgan Stanley"),
    ("WMT", "Walmart Inc."),
    ("COST", "Costco Wholesale Corp."),
    ("PG", "Procter & Gamble Co."),
    ("KO", "Coca-Cola Co."),
    ("PEP", "PepsiCo, Inc."),
    ("JNJ", "Johnson & Johnson"),
    ("LLY", "Eli Lilly and Co."),
    ("UNH", "UnitedHealth Group Inc."),
    ("MRK", "Merck & Co., Inc."),
    ("PFE", "Pfizer Inc."),
    ("ABBV", "AbbVie Inc."),
    ("TMO", "Thermo Fisher Scientific Inc."),
    ("DIS", "Walt Disney Co."),
    ("BA", "Boeing Co."),
    ("CAT", "Caterpillar Inc."),
    ("GE", "General Electric Co."),
    ("F", "Ford Motor Co."),
    ("SBUX", "Starbucks Corp."),
    ("MCD", "McDonald's Corp."),
    ("NKE", "Nike, Inc."),
    ("HD", "Home Depot, Inc."),
    ("LOW", "Lowe's Companies, Inc."),
    ("XOM", "Exxon Mobil Corp."),
    ("CVX", "Chevron Corp."),
    ("BABA", "Alibaba Group Holding Ltd."),
    ("TSM", "Taiwan Semiconductor Manufacturing Co."),
    ("NVO", "Novo Nordisk A/S"),
    ("SAP", "SAP SE"),
    ("TM", "Toyota Motor Corp."),
    ("SONY", "Sony Group Corp."),
]


class YahooFinanceClient:
    """Yahoo Finance market-data provider using its public chart/search APIs."""

    base_url = "https://query1.finance.yahoo.com"
    user_agent = "Mozilla/5.0 (compatible; StockPredictor/1.0)"

    def __init__(self) -> None:
        self.request_timeout = settings.market_data_timeout_seconds
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": self.user_agent, "Accept": "application/json"})

    async def _run(self, func, *args, **kwargs):
        return await asyncio.to_thread(func, *args, **kwargs)

    def _get_json(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        response = self._session.get(
            f"{self.base_url}{path}",
            params=params,
            timeout=self.request_timeout,
        )
        response.raise_for_status()
        return response.json()

    def _chart(self, symbol: str, range_: str, interval: str) -> dict[str, Any]:
        payload = self._get_json(
            f"/v8/finance/chart/{requests.utils.quote(symbol)}",
            {"range": range_, "interval": interval, "includePrePost": "false"},
        )
        chart = payload.get("chart") or {}
        if chart.get("error"):
            raise ValueError(f"Yahoo Finance returned an error for {symbol}")
        results = chart.get("result") or []
        if not results:
            raise ValueError(f"No market data for {symbol}")
        return results[0]

    @staticmethod
    def _chart_points(result: dict[str, Any]) -> List[PricePoint]:
        timestamps = result.get("timestamp") or []
        quote = ((result.get("indicators") or {}).get("quote") or [{}])[0]
        opens = quote.get("open") or []
        highs = quote.get("high") or []
        lows = quote.get("low") or []
        closes = quote.get("close") or []
        volumes = quote.get("volume") or []

        points: List[PricePoint] = []
        for i, timestamp in enumerate(timestamps):
            try:
                open_price = float(opens[i])
                high = float(highs[i])
                low = float(lows[i])
                close = float(closes[i])
                volume = int(volumes[i] or 0)
            except (IndexError, TypeError, ValueError):
                continue
            if any(pd.isna(value) for value in (open_price, high, low, close)):
                continue
            points.append(PricePoint(
                timestamp=int(timestamp) * 1000,
                open=round(open_price, 2),
                high=round(high, 2),
                low=round(low, 2),
                close=round(close, 2),
                volume=volume,
            ))
        return points

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        query = query.strip()
        if not query:
            return []

        def fetch() -> List[SymbolSearchResult]:
            payload = self._get_json(
                "/v1/finance/search",
                {
                    "q": query,
                    "quotesCount": 10,
                    "newsCount": 0,
                    "listsCount": 0,
                    "enableFuzzyQuery": "false",
                },
            )
            results: List[SymbolSearchResult] = []
            for quote in payload.get("quotes") or []:
                symbol = quote.get("symbol")
                if not symbol:
                    continue
                name = quote.get("longname") or quote.get("shortname") or symbol
                results.append(SymbolSearchResult(
                    symbol=symbol,
                    name=name,
                    type=quote.get("quoteType"),
                    region=quote.get("exchange"),
                    currency="USD",
                ))
            return results[:10]

        return await self._run(fetch)

    async def get_popular_symbols(self) -> List[SymbolSearchResult]:
        return [
            SymbolSearchResult(
                symbol=symbol,
                name=name,
                type="EQUITY",
                region="NMS",
                currency="USD",
            )
            for symbol, name in POPULAR_SYMBOLS
        ]

    async def get_global_quote(self, symbol: str) -> QuoteResponse:
        symbol = symbol.upper()

        def fetch() -> QuoteResponse:
            result = self._chart(symbol, "5d", "1d")
            meta = result.get("meta") or {}
            points = self._chart_points(result)
            if not points:
                raise ValueError(f"No quote data for {symbol}")

            latest = points[-1]
            previous_close = float(
                meta.get("chartPreviousClose")
                or meta.get("previousClose")
                or (points[-2].close if len(points) > 1 else latest.close)
            )
            change = latest.close - previous_close
            change_percent = (change / previous_close * 100) if previous_close else 0.0
            timestamp = int(meta.get("regularMarketTime") or latest.timestamp) * 1000

            session = market_session(meta)

            return QuoteResponse(
                symbol=symbol,
                price=latest.close,
                change=round(change, 2),
                change_percent=round(change_percent, 2),
                volume=latest.volume,
                high=float(meta.get("regularMarketDayHigh") or latest.high),
                low=float(meta.get("regularMarketDayLow") or latest.low),
                open=float(meta.get("regularMarketOpen") or latest.open),
                previous_close=round(previous_close, 2),
                timestamp=timestamp,
                exchange=session.exchange,
                exchange_name=session.exchange_name,
                currency=session.currency,
                market_state=session.state,
                market_is_open=session.is_open,
                market_session_start=session.session_start,
                market_session_end=session.session_end,
                market_next_open=session.next_open,
                market_timezone=session.timezone,
                market_trading_day=session.trading_day,
            )

        return await self._run(fetch)

    async def get_daily_adjusted(
        self,
        symbol: str,
        outputsize: str = "compact",
        range_: Optional[str] = None,
    ) -> List[PricePoint]:
        symbol = symbol.upper()
        if range_ is None:
            range_ = "1y" if outputsize == "compact" else "max"

        def fetch() -> List[PricePoint]:
            return self._chart_points(self._chart(symbol, range_, "1d"))

        return await self._run(fetch)

    async def get_intraday(
        self,
        symbol: str,
        interval: str = "5m",
        outputsize: str = "compact",
        range_: Optional[str] = None,
    ) -> List[PricePoint]:
        symbol = symbol.upper()
        if range_ is None:
            range_ = "5d" if outputsize == "compact" else "60d"

        def fetch() -> List[PricePoint]:
            return self._chart_points(self._chart(symbol, range_, interval))

        return await self._run(fetch)


yfinance = YahooFinanceClient()
market_data = yfinance