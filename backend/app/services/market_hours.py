"""Exchange trading sessions derived from Yahoo Finance quote metadata.

The Yahoo chart API returns, for every symbol, the exchange's IANA timezone and
the *current* trading period (``pre`` / ``regular`` / ``post``) as absolute UTC
epoch seconds. That is enough to say whether a specific exchange is open right
now, when it opens next, and which wall-clock times the session runs on in the
exchange's own region - without shipping a holiday calendar.

Limitation: public holidays are not modelled. On a holiday Yahoo simply reports
the next real session, so the computed "opens at" time can be a day later than
the regular weekly schedule would suggest.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

STATE_REGULAR = "REGULAR"
STATE_PRE = "PRE"
STATE_POST = "POST"
STATE_CLOSED = "CLOSED"
STATE_UNKNOWN = "UNKNOWN"

_OPEN_STATES = {STATE_REGULAR}


@dataclass(frozen=True)
class MarketSession:
    """A single exchange's trading session at a point in time."""

    state: str
    is_open: bool
    exchange: Optional[str] = None
    exchange_name: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    session_start: Optional[int] = None
    session_end: Optional[int] = None
    next_open: Optional[int] = None
    next_close: Optional[int] = None
    trading_day: Optional[str] = None
    is_weekend: bool = False
    is_unknown: bool = False


def _epoch(value: Any) -> Optional[int]:
    if isinstance(value, (int, float)) and value:
        return int(value)
    return None


def _zone(name: Any) -> Optional[ZoneInfo]:
    if not isinstance(name, str) or not name:
        return None
    try:
        return ZoneInfo(name)
    except Exception:
        return None


def _next_weekday_start(tz: ZoneInfo, session_start: int, now_ts: float) -> Optional[int]:
    """Epoch of the first Mon-Fri session start strictly after ``now``.

    Reuses the session's local open time (so DST shifts are respected) and walks
    forward a day at a time, skipping Saturday and Sunday.
    """
    open_time = datetime.fromtimestamp(session_start, tz=tz).time()
    day = datetime.fromtimestamp(now_ts, tz=tz).date() + timedelta(days=1)
    for _ in range(21):
        if day.weekday() < 5:
            candidate = datetime.combine(day, open_time, tzinfo=tz)
            ts = candidate.timestamp()
            if ts > now_ts:
                return int(ts)
        day += timedelta(days=1)
    return None


def _session_date(session_start: Optional[int], tz: Optional[ZoneInfo]) -> Optional[str]:
    if session_start is None or tz is None:
        return None
    return datetime.fromtimestamp(session_start, tz=tz).date().isoformat()


def market_session(meta: dict[str, Any], now: Optional[datetime] = None) -> MarketSession:
    """Compute the trading state for the symbol described by Yahoo ``meta``."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now_ts = now.timestamp()

    tz_name = meta.get("exchangeTimezoneName")
    tz = _zone(tz_name)

    exchange = meta.get("exchangeName")
    exchange_name = meta.get("fullExchangeName")
    currency = meta.get("currency")

    period = meta.get("currentTradingPeriod") or {}
    pre = period.get("pre") or {}
    regular = period.get("regular") or {}
    post = period.get("post") or {}

    pre_start, pre_end = _epoch(pre.get("start")), _epoch(pre.get("end"))
    reg_start, reg_end = _epoch(regular.get("start")), _epoch(regular.get("end"))
    post_start, post_end = _epoch(post.get("start")), _epoch(post.get("end"))

    is_weekend = False
    if tz is not None:
        is_weekend = now.astimezone(tz).weekday() >= 5

    base = {
        "exchange": exchange,
        "exchange_name": exchange_name,
        "timezone": tz_name,
        "currency": currency,
        "is_weekend": is_weekend,
        "trading_day": _session_date(reg_start, tz),
    }

    # No session window at all: fall back to "closed" and say we don't know.
    if not reg_start or not reg_end:
        if is_weekend:
            return MarketSession(state=STATE_CLOSED, is_open=False, is_unknown=True, **base)
        return MarketSession(state=STATE_UNKNOWN, is_open=False, is_unknown=True, **base)

    state = STATE_CLOSED
    is_open = False
    next_open: Optional[int] = None
    next_close: Optional[int] = None

    if reg_start <= now_ts < reg_end:
        state = STATE_REGULAR
        is_open = True
        next_close = reg_end
    elif pre_start and pre_end and pre_start <= now_ts < pre_end:
        state = STATE_PRE
        next_open = reg_start
        next_close = reg_end
    elif post_start and post_end and post_start <= now_ts < post_end:
        state = STATE_POST
        next_open = _next_weekday_start(tz, reg_start, now_ts) if tz else None
        if next_open is not None:
            next_close = next_open + (reg_end - reg_start)
    elif now_ts < reg_start:
        state = STATE_CLOSED
        next_open = reg_start
        next_close = reg_end
    else:
        state = STATE_CLOSED
        if tz is not None:
            next_open = _next_weekday_start(tz, reg_start, now_ts)
            if next_open is not None:
                next_close = next_open + (reg_end - reg_start)

    return MarketSession(
        state=state,
        is_open=is_open,
        session_start=reg_start,
        session_end=reg_end,
        next_open=next_open,
        next_close=next_close,
        **base,
    )


def is_market_open(meta: dict[str, Any], now: Optional[datetime] = None) -> bool:
    """Convenience wrapper used to gate work that only makes sense live."""
    return market_session(meta, now).is_open


def next_trading_days(count: int, start: Optional[date] = None) -> list[date]:
    """Return ``count`` Mon-Fri dates beginning on/after ``start``.

    Calendar-only: exchange holidays are not excluded.
    """
    if count <= 0:
        return []
    cursor = start or datetime.now(timezone.utc).date()
    days: list[date] = []
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor += timedelta(days=1)
    return days


def session_window(session: MarketSession) -> Optional[tuple[time, time]]:
    """Exchange-local (open, close) wall-clock times, when known."""
    if session.session_start is None or session.session_end is None or not session.timezone:
        return None
    tz = _zone(session.timezone)
    if tz is None:
        return None
    start = datetime.fromtimestamp(session.session_start, tz=tz).time()
    end = datetime.fromtimestamp(session.session_end, tz=tz).time()
    return start, end