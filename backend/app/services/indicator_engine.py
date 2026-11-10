import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class IndicatorResult:
    rsi_value: Optional[float] = None
    rsi_signal: Optional[str] = None
    macd_value: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    macd_trend: Optional[str] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_position: Optional[str] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    stochastic_k: Optional[float] = None
    stochastic_d: Optional[float] = None
    stochastic_signal: Optional[str] = None
    atr: Optional[float] = None
    adx_value: Optional[float] = None
    adx_trend: Optional[str] = None
    obv: Optional[float] = None


class IndicatorEngine:
    @staticmethod
    def sma(prices: List[float], period: int) -> List[Optional[float]]:
        if len(prices) < period:
            return [None] * len(prices)
        result = [None] * (period - 1)
        for i in range(period - 1, len(prices)):
            result.append(np.mean(prices[i - period + 1:i + 1]))
        return result

    @staticmethod
    def ema(prices: List[float], period: int) -> List[Optional[float]]:
        if len(prices) < period:
            return [None] * len(prices)
        multiplier = 2 / (period + 1)
        result = [None] * (period - 1)
        result.append(np.mean(prices[:period]))
        for i in range(period, len(prices)):
            result.append((prices[i] - result[-1]) * multiplier + result[-1])
        return result

    @staticmethod
    def rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
        if len(prices) < period + 1:
            return [None] * len(prices)
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[:period])
        avg_loss = np.mean(losses[:period])
        
        result = [None] * period
        
        if avg_loss == 0:
            result.append(100.0)
        else:
            rs = avg_gain / avg_loss
            result.append(100 - (100 / (1 + rs)))
        
        for i in range(period + 1, len(prices)):
            gain = max(prices[i] - prices[i-1], 0)
            loss = max(prices[i-1] - prices[i], 0)
            avg_gain = (avg_gain * (period - 1) + gain) / period
            avg_loss = (avg_loss * (period - 1) + loss) / period
            
            if avg_loss == 0:
                result.append(100.0)
            else:
                rs = avg_gain / avg_loss
                result.append(100 - (100 / (1 + rs)))
        
        return result

    @staticmethod
    def macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
        ema_fast = IndicatorEngine.ema(prices, fast)
        ema_slow = IndicatorEngine.ema(prices, slow)
        
        macd_line = [None] * len(prices)
        for i in range(len(prices)):
            if ema_fast[i] is not None and ema_slow[i] is not None:
                macd_line[i] = ema_fast[i] - ema_slow[i]
        
        signal_line = IndicatorEngine.ema([v for v in macd_line if v is not None], signal)
        signal_line = [None] * (len(prices) - len(signal_line)) + signal_line
        
        histogram = [None] * len(prices)
        for i in range(len(prices)):
            if macd_line[i] is not None and signal_line[i] is not None:
                histogram[i] = macd_line[i] - signal_line[i]
        
        return macd_line, signal_line, histogram

    @staticmethod
    def bollinger_bands(prices: List[float], period: int = 20, std_dev: float = 2.0) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
        sma = IndicatorEngine.sma(prices, period)
        upper = [None] * len(prices)
        middle = [None] * len(prices)
        lower = [None] * len(prices)
        
        for i in range(period - 1, len(prices)):
            window = prices[i - period + 1:i + 1]
            std = np.std(window)
            middle[i] = sma[i]
            upper[i] = sma[i] + (std_dev * std)
            lower[i] = sma[i] - (std_dev * std)
        
        return upper, middle, lower

    @staticmethod
    def stochastic(highs: List[float], lows: List[float], closes: List[float], k_period: int = 14, d_period: int = 3) -> Tuple[List[Optional[float]], List[Optional[float]]]:
        if len(closes) < k_period:
            return [None] * len(closes), [None] * len(closes)
        
        k_values = [None] * (k_period - 1)
        
        for i in range(k_period - 1, len(closes)):
            highest_high = max(highs[i - k_period + 1:i + 1])
            lowest_low = min(lows[i - k_period + 1:i + 1])
            
            if highest_high == lowest_low:
                k_values.append(50.0)
            else:
                k_values.append(((closes[i] - lowest_low) / (highest_high - lowest_low)) * 100)
        
        d_values = IndicatorEngine.sma([v for v in k_values if v is not None], d_period)
        d_values = [None] * (len(closes) - len(d_values)) + d_values
        
        return k_values, d_values

    @staticmethod
    def atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> List[Optional[float]]:
        if len(closes) < 2:
            return [None] * len(closes)
        
        true_ranges = [None]
        for i in range(1, len(closes)):
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i-1]),
                abs(lows[i] - closes[i-1])
            )
            true_ranges.append(tr)
        
        return IndicatorEngine.sma([v for v in true_ranges if v is not None], period)

    @staticmethod
    def adx(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> Tuple[List[Optional[float]], List[Optional[str]]]:
        if len(closes) < period + 1:
            return [None] * len(closes), [None] * len(closes)
        
        plus_dm = [0.0]
        minus_dm = [0.0]
        tr = [0.0]
        
        for i in range(1, len(closes)):
            up_move = highs[i] - highs[i-1]
            down_move = lows[i-1] - lows[i]
            
            plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0)
            minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0)
            
            tr.append(max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i-1]),
                abs(lows[i] - closes[i-1])
            ))
        
        atr_values = IndicatorEngine.sma(tr, period)
        plus_di = [None] * len(closes)
        minus_di = [None] * len(closes)
        
        for i in range(period, len(closes)):
            if atr_values[i] and atr_values[i] > 0:
                plus_di[i] = 100 * (IndicatorEngine.sma(plus_dm, period)[i] / atr_values[i])
                minus_di[i] = 100 * (IndicatorEngine.sma(minus_dm, period)[i] / atr_values[i])
        
        dx = [None] * len(closes)
        for i in range(len(closes)):
            if plus_di[i] is not None and minus_di[i] is not None:
                di_sum = plus_di[i] + minus_di[i]
                if di_sum > 0:
                    dx[i] = 100 * abs(plus_di[i] - minus_di[i]) / di_sum
        
        adx_values = IndicatorEngine.sma([v for v in dx if v is not None], period)
        
        trend = [None] * len(closes)
        for i in range(len(closes)):
            if adx_values[i] is not None:
                trend[i] = "strong" if adx_values[i] > 25 else "weak"
        
        return adx_values, trend

    @staticmethod
    def obv(closes: List[float], volumes: List[float]) -> List[Optional[float]]:
        if len(closes) != len(volumes) or len(closes) == 0:
            return [None] * len(closes)
        
        obv_values = [0.0]
        for i in range(1, len(closes)):
            if closes[i] > closes[i-1]:
                obv_values.append(obv_values[-1] + volumes[i])
            elif closes[i] < closes[i-1]:
                obv_values.append(obv_values[-1] - volumes[i])
            else:
                obv_values.append(obv_values[-1])
        
        return obv_values

    @classmethod
    def calculate_all(
        cls,
        opens: List[float],
        highs: List[float],
        lows: List[float],
        closes: List[float],
        volumes: List[float],
    ) -> IndicatorResult:
        result = IndicatorResult()
        
        # RSI
        rsi_values = cls.rsi(closes)
        if rsi_values[-1] is not None:
            result.rsi_value = rsi_values[-1]
            if rsi_values[-1] < 30:
                result.rsi_signal = "oversold"
            elif rsi_values[-1] > 70:
                result.rsi_signal = "overbought"
            else:
                result.rsi_signal = "neutral"
        
        # MACD
        macd_line, signal_line, histogram = cls.macd(closes)
        if macd_line[-1] is not None:
            result.macd_value = macd_line[-1]
            result.macd_signal = signal_line[-1] if signal_line[-1] is not None else 0
            result.macd_histogram = histogram[-1] if histogram[-1] is not None else 0
            
            if len(macd_line) >= 2 and macd_line[-2] is not None:
                if macd_line[-1] > signal_line[-1] and macd_line[-2] <= signal_line[-2]:
                    result.macd_trend = "bullish"
                elif macd_line[-1] < signal_line[-1] and macd_line[-2] >= signal_line[-2]:
                    result.macd_trend = "bearish"
                else:
                    result.macd_trend = "bullish" if macd_line[-1] > signal_line[-1] else "bearish"
        
        # Bollinger Bands
        bb_upper, bb_middle, bb_lower = cls.bollinger_bands(closes)
        if bb_upper[-1] is not None:
            result.bb_upper = bb_upper[-1]
            result.bb_middle = bb_middle[-1]
            result.bb_lower = bb_lower[-1]
            
            current_price = closes[-1]
            if current_price >= bb_upper[-1]:
                result.bb_position = "upper"
            elif current_price <= bb_lower[-1]:
                result.bb_position = "lower"
            else:
                result.bb_position = "middle"
        
        # SMAs
        result.sma_20 = cls.sma(closes, 20)[-1]
        result.sma_50 = cls.sma(closes, 50)[-1]
        result.sma_200 = cls.sma(closes, 200)[-1]
        
        # EMAs
        result.ema_20 = cls.ema(closes, 20)[-1]
        result.ema_50 = cls.ema(closes, 50)[-1]
        
        # Stochastic
        stoch_k, stoch_d = cls.stochastic(highs, lows, closes)
        if stoch_k[-1] is not None:
            result.stochastic_k = stoch_k[-1]
            result.stochastic_d = stoch_d[-1] if stoch_d[-1] is not None else 0
            
            if stoch_k[-1] < 20:
                result.stochastic_signal = "oversold"
            elif stoch_k[-1] > 80:
                result.stochastic_signal = "overbought"
            else:
                result.stochastic_signal = "neutral"
        
        # ATR
        atr_values = cls.atr(highs, lows, closes)
        result.atr = atr_values[-1]
        
        # ADX
        adx_values, adx_trend = cls.adx(highs, lows, closes)
        result.adx_value = adx_values[-1]
        result.adx_trend = adx_trend[-1]
        
        # OBV
        obv_values = cls.obv(closes, volumes)
        result.obv = obv_values[-1]
        
        return result


def get_technical_signal(result: IndicatorResult) -> Tuple[str, float]:
    signals = []
    weights = []
    
    if result.rsi_signal:
        if result.rsi_signal == "oversold":
            signals.append(1)
            weights.append(1.0)
        elif result.rsi_signal == "overbought":
            signals.append(-1)
            weights.append(1.0)
        else:
            signals.append(0)
            weights.append(0.5)
    
    if result.macd_trend:
        if result.macd_trend == "bullish":
            signals.append(1)
            weights.append(1.5)
        elif result.macd_trend == "bearish":
            signals.append(-1)
            weights.append(1.5)
        else:
            signals.append(0)
            weights.append(0.5)
    
    if result.bb_position:
        if result.bb_position == "lower":
            signals.append(1)
            weights.append(0.5)
        elif result.bb_position == "upper":
            signals.append(-1)
            weights.append(0.5)
        else:
            signals.append(0)
            weights.append(0.3)
    
    if result.stochastic_signal:
        if result.stochastic_signal == "oversold":
            signals.append(1)
            weights.append(0.8)
        elif result.stochastic_signal == "overbought":
            signals.append(-1)
            weights.append(0.8)
        else:
            signals.append(0)
            weights.append(0.3)
    
    if result.sma_20 and result.sma_50:
        if result.sma_20 > result.sma_50:
            signals.append(1)
            weights.append(1.0)
        else:
            signals.append(-1)
            weights.append(1.0)
    
    if not signals:
        return "hold", 0.0
    
    weighted_sum = sum(s * w for s, w in zip(signals, weights))
    total_weight = sum(weights)
    score = weighted_sum / total_weight
    
    if score > 0.3:
        return "buy", min(abs(score), 1.0)
    elif score < -0.3:
        return "sell", min(abs(score), 1.0)
    else:
        return "hold", min(abs(score), 1.0)


indicator_engine = IndicatorEngine()