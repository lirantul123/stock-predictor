from datetime import datetime, timezone

from app.services.market_hours import (
    STATE_CLOSED,
    STATE_POST,
    STATE_PRE,
    STATE_REGULAR,
    STATE_UNKNOWN,
    market_session,
    next_trading_days,
    session_window,
)


def _meta(tz, regular_start, regular_end, pre=None, post=None):
    """Build the minimal Yahoo chart ``meta`` payload market_session reads."""
    meta = {
        "exchangeName": "NMS",
        "fullExchangeName": "NasdaqGS",
        "currency": "USD",
        "exchangeTimezoneName": tz,
    }
    period = {"regular": {"start": regular_start, "end": regular_end}}
    if pre is not None:
        period["pre"] = pre
    if post is not None:
        period["post"] = post
    meta["currentTradingPeriod"] = period
    return meta


def _utc(y, m, d, hh, mm):
    return int(datetime(y, m, d, hh, mm, tzinfo=timezone.utc).timestamp())


# US session: 14:30 -> 21:00 UTC (09:30 -> 16:00 America/New_York, EST)
US_START = _utc(2026, 11, 16, 14, 30)
US_END = _utc(2026, 11, 16, 21, 0)
US_PRE_START = _utc(2026, 11, 16, 9, 0)


def test_open_during_regular_session():
    meta = _meta(
        "America/New_York",
        US_START,
        US_END,
        pre={"start": US_PRE_START, "end": US_START},
        post={"start": US_END, "end": _utc(2026, 11, 17, 1, 0)},
    )
    session = market_session(meta, now=datetime.fromtimestamp(US_START + 3600, timezone.utc))

    assert session.state == STATE_REGULAR
    assert session.is_open is True
    assert session.exchange == "NMS"
    assert session.exchange_name == "NasdaqGS"
    assert session.timezone == "America/New_York"
    assert session.session_start == US_START
    assert session.session_end == US_END
    assert session.trading_day == "2026-11-16"


def test_closed_before_open_reports_next_open():
    meta = _meta("America/New_York", US_START, US_END, pre={"start": US_PRE_START, "end": US_START})
    session = market_session(meta, now=datetime.fromtimestamp(US_PRE_START - 1800, timezone.utc))

    assert session.state == STATE_CLOSED
    assert session.is_open is False
    assert session.next_open == US_START
    assert session.next_close == US_END


def test_pre_market_is_not_regular():
    meta = _meta("America/New_York", US_START, US_END, pre={"start": US_PRE_START, "end": US_START})
    session = market_session(meta, now=datetime.fromtimestamp(US_PRE_START + 600, timezone.utc))

    assert session.state == STATE_PRE
    assert session.is_open is False
    assert session.next_open == US_START


def test_after_close_rolls_to_next_weekday():
    # Friday 2026-11-13 21:00 UTC close; next session should be Monday 14:30 UTC.
    fri_start = _utc(2026, 11, 13, 14, 30)
    fri_end = _utc(2026, 11, 13, 21, 0)
    meta = _meta("America/New_York", fri_start, fri_end)

    session = market_session(meta, now=datetime.fromtimestamp(fri_end + 3600, timezone.utc))

    assert session.state == STATE_CLOSED
    assert session.is_open is False
    assert session.next_open == _utc(2026, 11, 16, 14, 30)
    assert session.next_close == _utc(2026, 11, 16, 21, 0)


def test_weekend_is_closed_even_without_a_session():
    meta = _meta("America/New_York", US_START, US_END)
    sunday = datetime(2026, 11, 15, 18, 0, tzinfo=timezone.utc)

    session = market_session(meta, now=sunday)

    assert session.is_weekend is True
    assert session.is_open is False


def test_post_market_reports_state():
    meta = _meta("America/New_York", US_START, US_END, post={"start": US_END, "end": _utc(2026, 11, 17, 1, 0)})
    session = market_session(meta, now=datetime.fromtimestamp(US_END + 900, timezone.utc))

    assert session.state == STATE_POST
    assert session.is_open is False


def test_missing_session_is_unknown_but_never_open():
    session = market_session({"exchangeTimezoneName": "America/New_York"})

    assert session.state == STATE_UNKNOWN
    assert session.is_open is False
    assert session.is_unknown is True


def test_weekend_without_session_is_closed():
    meta = _meta("America/New_York", None, None)
    sunday = datetime(2026, 11, 15, 18, 0, tzinfo=timezone.utc)

    session = market_session(meta, now=sunday)

    assert session.state == STATE_CLOSED
    assert session.is_weekend is True


def test_tokyo_session_uses_exchange_timezone():
    # Tokyo regular session 00:00 -> 06:30 UTC (09:00 -> 15:30 JST).
    tokyo_start = _utc(2026, 11, 16, 0, 0)
    tokyo_end = _utc(2026, 11, 16, 6, 30)
    meta = _meta("Asia/Tokyo", tokyo_start, tokyo_end)

    session = market_session(meta, now=datetime.fromtimestamp(tokyo_start + 1800, timezone.utc))

    assert session.timezone == "Asia/Tokyo"
    assert session.state == STATE_REGULAR
    assert session.is_open is True
    assert session_window(session) is not None
    assert session.trading_day == "2026-11-16"


def test_next_trading_days_skip_weekends():
    # Sunday 2026-11-15 -> Mon..Fri
    days = next_trading_days(5, start=datetime(2026, 11, 15).date())

    assert [d.isoformat() for d in days] == [
        "2026-11-16",
        "2026-11-17",
        "2026-11-18",
        "2026-11-19",
        "2026-11-20",
    ]


def test_next_trading_days_starting_saturday():
    days = next_trading_days(3, start=datetime(2026, 11, 14).date())

    assert [d.isoformat() for d in days] == ["2026-11-16", "2026-11-17", "2026-11-18"]


def test_next_trading_days_handles_zero():
    assert next_trading_days(0) == []