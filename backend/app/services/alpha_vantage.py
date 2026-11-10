import asyncio
import hashlib
import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import httpx
import redis.asyncio as redis
from app.config import settings
from app.schemas import SymbolSearchResult, QuoteResponse, PricePoint, PriceHistoryResponse
import structlog

logger = structlog.get_logger()


class AlphaVantageClient:
    def __init__(self):
        self.api_key = settings.alpha_vantage_api_key
        self.base_url = settings.alpha_vantage_base_url
        self.rate_limit_per_day = settings.alpha_vantage_rate_limit
        self.rate_limit_per_minute = settings.alpha_vantage_rate_limit_per_minute
        self._redis: Optional[redis.Redis] = None
        self._request_times: List[float] = []
        self._daily_count = 0
        self._daily_reset_time = time.time() + 86400

    async def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def _check_rate_limit(self) -> bool:
        now = time.time()

        if now > self._daily_reset_time:
            self._daily_count = 0
            self._daily_reset_time = now + 86400

        if self._daily_count >= self.rate_limit_per_day:
            logger.warning("Daily rate limit exceeded")
            return False

        self._request_times = [t for t in self._request_times if now - t < 60]
        if len(self._request_times) >= self.rate_limit_per_minute:
            logger.warning("Per-minute rate limit exceeded")
            return False

        return True

    async def _record_request(self):
        now = time.time()
        self._request_times.append(now)
        self._daily_count += 1

    def _cache_key(self, prefix: str, *args) -> str:
        key_str = f"{prefix}:{':'.join(str(a) for a in args)}"
        return f"av:{hashlib.md5(key_str.encode()).hexdigest()}"

    async def _get_cached(self, key: str) -> Optional[Any]:
        try:
            r = await self._get_redis()
            data = await r.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning("Cache get failed", error=str(e))
        return None

    async def _set_cache(self, key: str, value: Any, ttl: int = 300):
        try:
            r = await self._get_redis()
            await r.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning("Cache set failed", error=str(e))

    async def _make_request(self, params: Dict[str, str]) -> Dict[str, Any]:
        if not await self._check_rate_limit():
            raise Exception("Rate limit exceeded")

        params["apikey"] = self.api_key
        cache_key = self._cache_key("request", *sorted(params.items()))

        cached = await self._get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit", params=params)
            return cached

        await self._record_request()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            if "Error Message" in data:
                raise Exception(f"API Error: {data['Error Message']}")
            if "Note" in data:
                logger.warning("API Note", note=data["Note"])

            await self._set_cache(cache_key, data, ttl=300)
            return data

    async def search_symbols(self, query: str) -> List[SymbolSearchResult]:
        data = await self._make_request({
            "function": "SYMBOL_SEARCH",
            "keywords": query,
        })

        results = []
        for match in data.get("bestMatches", [])[:10]:
            results.append(SymbolSearchResult(
                symbol=match.get("1. symbol", ""),
                name=match.get("2. name", ""),
                type=match.get("3. type", ""),
                region=match.get("4. region", ""),
                market_open=match.get("5. marketOpen", ""),
                market_close=match.get("6. marketClose", ""),
                timezone=match.get("7. timezone", ""),
                currency=match.get("8. currency", ""),
                match_score=match.get("9. matchScore", ""),
            ))
        return results

    async def get_global_quote(self, symbol: str) -> QuoteResponse:
        data = await self._make_request({
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
        })

        quote_data = data.get("Global Quote", {})
        if not quote_data:
            raise Exception(f"No quote data for {symbol}")

        return QuoteResponse(
            symbol=quote_data.get("01. symbol", symbol),
            price=float(quote_data.get("05. price", 0)),
            change=float(quote_data.get("09. change", 0)),
            change_percent=float(quote_data.get("10. change percent", "0%").rstrip("%")),
            volume=int(quote_data.get("06. volume", 0)),
            high=float(quote_data.get("03. high", 0)),
            low=float(quote_data.get("04. low", 0)),
            open=float(quote_data.get("02. open", 0)),
            previous_close=float(quote_data.get("08. previous close", 0)),
            timestamp=int(time.time() * 1000),
        )

    async def get_daily_adjusted(self, symbol: str, outputsize: str = "compact") -> List[PricePoint]:
        data = await self._make_request({
            "function": "TIME_SERIES_DAILY_ADJUSTED",
            "symbol": symbol,
            "outputsize": outputsize,
        })

        time_series = data.get("Time Series (Daily)", {})
        points = []

        for date_str, values in time_series.items():
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                timestamp = int(dt.timestamp() * 1000)
                points.append(PricePoint(
                    timestamp=timestamp,
                    open=float(values.get("1. open", 0)),
                    high=float(values.get("2. high", 0)),
                    low=float(values.get("3. low", 0)),
                    close=float(values.get("4. close", 0)),
                    volume=int(values.get("6. volume", 0)),
                ))
            except Exception as e:
                logger.warning("Failed to parse daily data", date=date_str, error=str(e))

        points.sort(key=lambda p: p.timestamp)
        return points

    async def get_intraday(self, symbol: str, interval: str = "60min", outputsize: str = "compact") -> List[PricePoint]:
        data = await self._make_request({
            "function": "TIME_SERIES_INTRADAY",
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize,
        })

        key = f"Time Series ({interval})"
        time_series = data.get(key, {})
        points = []

        for date_str, values in time_series.items():
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                timestamp = int(dt.timestamp() * 1000)
                points.append(PricePoint(
                    timestamp=timestamp,
                    open=float(values.get("1. open", 0)),
                    high=float(values.get("2. high", 0)),
                    low=float(values.get("3. low", 0)),
                    close=float(values.get("4. close", 0)),
                    volume=int(values.get("5. volume", 0)),
                ))
            except Exception as e:
                logger.warning("Failed to parse intraday data", date=date_str, error=str(e))

        points.sort(key=lambda p: p.timestamp)
        return points

    async def get_popular_symbols(self) -> List[SymbolSearchResult]:
        popular = [
            "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX",
            "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS", "PYPL",
            "ADBE", "CRM", "NFLX", "INTC", "CSCO", "PFE", "KO", "PEP", "TMO",
            "SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "VEA", "VWO", "GLD", "SLV",
        ]

        results = []
        for sym in popular:
            try:
                search_results = await self.search_symbols(sym)
                if search_results:
                    results.append(search_results[0])
            except Exception:
                pass

        return results


alpha_vantage = AlphaVantageClient()