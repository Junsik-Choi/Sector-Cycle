#!/usr/bin/env python3
"""
Technical Indicators Calculation Module
기술적 지표 계산 모듈 (Python 버전)

This script calculates technical indicators for stocks and sectors:
- Moving Averages (SMA, EMA)
- MACD (12/26/9)
- RSI (14)
- Bollinger Bands (20, 2σ)
- ADX (14)
- ATR (14)

Usage:
    python calculate_signals.py

References:
- Golden Cross: https://www.investopedia.com/terms/g/goldencross.asp
- MACD: https://www.investopedia.com/terms/m/macd.asp
- RSI: https://www.investopedia.com/terms/r/rsi.asp
- Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import math

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
CONFIG = {
    'data_dir': Path(__file__).parent.parent / 'data',
    'ma_periods': [5, 10, 20, 50, 60, 120, 200],
    'macd': {'fast': 12, 'slow': 26, 'signal': 9},
    'rsi_period': 14,
    'bollinger': {'period': 20, 'std_dev': 2},
    'adx_period': 14,
    'atr_period': 14,
    'vix_thresholds': {'low': 15, 'normal': 20, 'elevated': 25, 'high': 30},
}


class TechnicalIndicators:
    """Technical indicators calculator"""
    
    @staticmethod
    def sma(prices: List[float], period: int) -> List[Optional[float]]:
        """Simple Moving Average"""
        result = []
        for i in range(len(prices)):
            if i < period - 1:
                result.append(None)
            else:
                window = prices[i - period + 1:i + 1]
                result.append(sum(window) / period)
        return result
    
    @staticmethod
    def ema(prices: List[float], period: int) -> List[Optional[float]]:
        """Exponential Moving Average"""
        result = []
        multiplier = 2 / (period + 1)
        
        # First EMA is SMA
        if len(prices) < period:
            return [None] * len(prices)
        
        # Initialize with SMA for first 'period' values
        sma_first = sum(prices[:period]) / period
        
        for i in range(period - 1):
            result.append(None)
        
        result.append(sma_first)
        
        # Calculate EMA for remaining values
        for i in range(period, len(prices)):
            ema_val = (prices[i] - result[i - 1]) * multiplier + result[i - 1]
            result.append(ema_val)
        
        return result
    
    @staticmethod
    def detect_cross(short_ma: List[Optional[float]], long_ma: List[Optional[float]]) -> Dict:
        """Detect Golden/Dead Cross"""
        crosses = []
        last_cross = None
        days_since_cross = 0
        days_above_long = 0
        days_below_long = 0
        
        for i in range(1, len(short_ma)):
            if short_ma[i] is None or long_ma[i] is None or short_ma[i-1] is None or long_ma[i-1] is None:
                continue
            
            was_below = short_ma[i-1] < long_ma[i-1]
            is_above = short_ma[i] > long_ma[i]
            
            if was_below and is_above:
                # Golden Cross
                last_cross = {
                    'type': 'golden',
                    'label': '상승 우세',
                    'labelEn': 'Bullish (Golden Cross)',
                    'index': i
                }
                crosses.append(dict(last_cross))
                days_since_cross = 0
            elif not was_below and not is_above:
                # Dead Cross
                last_cross = {
                    'type': 'dead',
                    'label': '하락 우세',
                    'labelEn': 'Bearish (Dead Cross)',
                    'index': i
                }
                crosses.append(dict(last_cross))
                days_since_cross = 0
            
            days_since_cross += 1
            
            if short_ma[i] > long_ma[i]:
                days_above_long += 1
                days_below_long = 0
            else:
                days_below_long += 1
                days_above_long = 0
        
        current_position = 'above' if (short_ma[-1] and long_ma[-1] and short_ma[-1] > long_ma[-1]) else 'below'
        
        return {
            'crosses': crosses,
            'lastCross': last_cross,
            'daysSinceCross': days_since_cross,
            'daysAboveLong': days_above_long,
            'daysBelowLong': days_below_long,
            'currentPosition': current_position
        }
    
    def macd(self, prices: List[float]) -> Dict:
        """Calculate MACD (12/26/9)"""
        fast = CONFIG['macd']['fast']
        slow = CONFIG['macd']['slow']
        signal_period = CONFIG['macd']['signal']
        
        ema_fast = self.ema(prices, fast)
        ema_slow = self.ema(prices, slow)
        
        # MACD Line = 12 EMA - 26 EMA
        macd_line = []
        for i in range(len(prices)):
            if ema_fast[i] is None or ema_slow[i] is None:
                macd_line.append(None)
            else:
                macd_line.append(ema_fast[i] - ema_slow[i])
        
        # Signal Line = 9 EMA of MACD
        valid_macd = [v for v in macd_line if v is not None]
        signal_ema = self.ema(valid_macd, signal_period) if len(valid_macd) >= signal_period else []
        
        # Map back to original length
        signal_line = []
        signal_idx = 0
        for m in macd_line:
            if m is None:
                signal_line.append(None)
            else:
                if signal_idx < len(signal_ema):
                    signal_line.append(signal_ema[signal_idx])
                else:
                    signal_line.append(None)
                signal_idx += 1
        
        # Histogram = MACD - Signal
        histogram = []
        for i in range(len(macd_line)):
            if macd_line[i] is None or signal_line[i] is None:
                histogram.append(None)
            else:
                histogram.append(macd_line[i] - signal_line[i])
        
        # Determine signal status
        last_macd = macd_line[-1] if macd_line else None
        last_signal = signal_line[-1] if signal_line else None
        last_hist = histogram[-1] if histogram else None
        prev_hist = histogram[-2] if len(histogram) > 1 else None
        
        status = {'label': '중립', 'labelEn': 'Neutral', 'type': 'neutral'}
        
        if last_macd is not None and last_signal is not None:
            if prev_hist is not None and prev_hist <= 0 and last_hist and last_hist > 0:
                status = {'label': '모멘텀 강화', 'labelEn': 'Momentum Strengthening', 'type': 'bullish'}
            elif prev_hist is not None and prev_hist >= 0 and last_hist and last_hist < 0:
                status = {'label': '모멘텀 약화', 'labelEn': 'Momentum Weakening', 'type': 'bearish'}
            elif last_macd > 0:
                status = {'label': '0선 상단 (강세)', 'labelEn': 'Above Zero (Bullish)', 'type': 'bullish'}
            else:
                status = {'label': '0선 하단 (약세)', 'labelEn': 'Below Zero (Bearish)', 'type': 'bearish'}
        
        return {
            'macdLine': macd_line,
            'signalLine': signal_line,
            'histogram': histogram,
            'current': {
                'macd': last_macd,
                'signal': last_signal,
                'histogram': last_hist
            },
            'status': status
        }
    
    @staticmethod
    def rsi(prices: List[float], period: int = 14) -> Dict:
        """Calculate RSI (Relative Strength Index)"""
        if len(prices) < period + 1:
            return {'values': [], 'current': None, 'status': {'label': '데이터 부족', 'type': 'unknown'}}
        
        # Calculate price changes
        changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        
        gains = [max(0, c) for c in changes]
        losses = [abs(min(0, c)) for c in changes]
        
        result = [None] * period
        
        # First RSI uses SMA
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        for i in range(period, len(changes)):
            if i == period:
                pass  # Use initial averages
            else:
                # Smoothed average
                avg_gain = (avg_gain * (period - 1) + gains[i]) / period
                avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            
            if avg_loss == 0:
                rsi_val = 100
            else:
                rs = avg_gain / avg_loss
                rsi_val = 100 - (100 / (1 + rs))
            
            result.append(rsi_val)
        
        # Add one more None at beginning to align with prices
        result.insert(0, None)
        
        last_rsi = result[-1]
        
        # Determine status
        status = {'label': '중립', 'labelEn': 'Neutral', 'type': 'neutral', 'value': last_rsi}
        
        if last_rsi is not None:
            if last_rsi >= 70:
                status = {'label': '과열 구간 (과매수)', 'labelEn': 'Overbought Zone', 'type': 'overbought', 'value': last_rsi}
            elif last_rsi <= 30:
                status = {'label': '과매도 구간', 'labelEn': 'Oversold Zone', 'type': 'oversold', 'value': last_rsi}
            elif last_rsi > 50:
                status = {'label': '상승 우세', 'labelEn': 'Bullish Bias', 'type': 'bullish', 'value': last_rsi}
            else:
                status = {'label': '하락 우세', 'labelEn': 'Bearish Bias', 'type': 'bearish', 'value': last_rsi}
        
        return {'values': result, 'current': last_rsi, 'status': status}
    
    @staticmethod
    def bollinger_bands(prices: List[float], period: int = 20, std_dev_mult: float = 2) -> Dict:
        """Calculate Bollinger Bands"""
        n = len(prices)
        middle = TechnicalIndicators.sma(prices, period)
        upper = []
        lower = []
        bandwidth = []
        percent_b = []
        
        for i in range(n):
            if i < period - 1:
                upper.append(None)
                lower.append(None)
                bandwidth.append(None)
                percent_b.append(None)
            else:
                window = prices[i - period + 1:i + 1]
                mean = middle[i]
                variance = sum((x - mean) ** 2 for x in window) / period
                std_dev = math.sqrt(variance)
                
                upper_band = mean + (std_dev_mult * std_dev)
                lower_band = mean - (std_dev_mult * std_dev)
                
                upper.append(upper_band)
                lower.append(lower_band)
                
                # Bandwidth = (Upper - Lower) / Middle * 100
                bw = ((upper_band - lower_band) / mean * 100) if mean else 0
                bandwidth.append(bw)
                
                # %B = (Price - Lower) / (Upper - Lower)
                band_range = upper_band - lower_band
                pb = ((prices[i] - lower_band) / band_range) if band_range else 0.5
                percent_b.append(pb)
        
        last_pb = percent_b[-1] if percent_b else None
        last_bw = bandwidth[-1] if bandwidth else None
        
        # Check for squeeze
        valid_bw = [b for b in bandwidth[-20:] if b is not None]
        avg_bw = sum(valid_bw) / len(valid_bw) if valid_bw else 0
        is_squeeze = last_bw and last_bw < avg_bw * 0.8
        
        # Determine status
        status = {'label': '밴드 내 정상', 'labelEn': 'Normal', 'type': 'normal'}
        
        if is_squeeze:
            status = {'label': '변동성 수축 (스퀴즈)', 'labelEn': 'Volatility Squeeze', 'type': 'squeeze'}
        elif last_pb and last_pb > 1:
            status = {'label': '상단 밴드 이탈 (과열)', 'labelEn': 'Above Upper Band', 'type': 'overbought'}
        elif last_pb and last_pb < 0:
            status = {'label': '하단 밴드 이탈 (과매도)', 'labelEn': 'Below Lower Band', 'type': 'oversold'}
        elif last_pb and last_pb > 0.8:
            status = {'label': '상단 밴드 근접', 'labelEn': 'Near Upper Band', 'type': 'elevated'}
        elif last_pb and last_pb < 0.2:
            status = {'label': '하단 밴드 근접', 'labelEn': 'Near Lower Band', 'type': 'low'}
        
        return {
            'upper': upper,
            'middle': middle,
            'lower': lower,
            'bandwidth': bandwidth,
            'percentB': percent_b,
            'current': {
                'upper': upper[-1] if upper else None,
                'middle': middle[-1] if middle else None,
                'lower': lower[-1] if lower else None,
                'percentB': last_pb,
                'bandwidth': last_bw
            },
            'isSqueeze': is_squeeze,
            'status': status
        }
    
    @staticmethod
    def wilder_smooth(data: List[float], period: int) -> List[float]:
        """Wilder's Smoothing Method"""
        result = []
        total = 0
        
        for i, val in enumerate(data):
            if i < period:
                total += val
                result.append(total / (i + 1))
            else:
                smoothed = result[i - 1] - (result[i - 1] / period) + val
                result.append(smoothed)
        
        return result
    
    def adx(self, candles: List[Dict], period: int = 14) -> Dict:
        """Calculate ADX (Average Directional Index)"""
        if len(candles) < period * 2:
            return {'values': [], 'plusDI': [], 'minusDI': [], 'current': None, 
                    'status': {'label': '데이터 부족', 'type': 'unknown'}}
        
        true_range = []
        plus_dm = []
        minus_dm = []
        
        for i in range(1, len(candles)):
            high = candles[i]['high']
            low = candles[i]['low']
            prev_high = candles[i-1]['high']
            prev_low = candles[i-1]['low']
            prev_close = candles[i-1]['close']
            
            # True Range
            tr = max(
                high - low,
                abs(high - prev_close),
                abs(low - prev_close)
            )
            true_range.append(tr)
            
            # Directional Movement
            up_move = high - prev_high
            down_move = prev_low - low
            
            plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0)
            minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0)
        
        # Smoothed values
        smooth_tr = self.wilder_smooth(true_range, period)
        smooth_plus_dm = self.wilder_smooth(plus_dm, period)
        smooth_minus_dm = self.wilder_smooth(minus_dm, period)
        
        # +DI and -DI
        plus_di = []
        minus_di = []
        dx = []
        
        for i in range(len(smooth_tr)):
            if smooth_tr[i] == 0:
                plus_di.append(0)
                minus_di.append(0)
            else:
                plus_di.append((smooth_plus_dm[i] / smooth_tr[i]) * 100)
                minus_di.append((smooth_minus_dm[i] / smooth_tr[i]) * 100)
            
            di_sum = plus_di[i] + minus_di[i]
            if di_sum == 0:
                dx.append(0)
            else:
                dx.append(abs(plus_di[i] - minus_di[i]) / di_sum * 100)
        
        # ADX = Smoothed DX
        adx_values = self.wilder_smooth(dx, period)
        
        last_adx = adx_values[-1] if adx_values else None
        
        # Determine status
        status = {'label': '횡보 가능 (추세 약함)', 'labelEn': 'Ranging (Weak Trend)', 'type': 'weak'}
        
        if last_adx and last_adx >= 25:
            status = {'label': '추세 강도 높음', 'labelEn': 'Strong Trend', 'type': 'strong'}
        elif last_adx and last_adx >= 20:
            status = {'label': '추세 형성 중', 'labelEn': 'Developing Trend', 'type': 'moderate'}
        
        return {
            'values': adx_values,
            'plusDI': plus_di,
            'minusDI': minus_di,
            'current': last_adx,
            'status': status
        }
    
    def atr(self, candles: List[Dict], period: int = 14) -> Dict:
        """Calculate ATR (Average True Range)"""
        if len(candles) < period + 1:
            return {'values': [], 'current': None, 'percent': None, 
                    'status': {'label': '데이터 부족', 'type': 'unknown'}}
        
        true_range = []
        
        for i in range(1, len(candles)):
            high = candles[i]['high']
            low = candles[i]['low']
            prev_close = candles[i-1]['close']
            
            tr = max(
                high - low,
                abs(high - prev_close),
                abs(low - prev_close)
            )
            true_range.append(tr)
        
        atr_values = self.wilder_smooth(true_range, period)
        
        last_atr = atr_values[-1] if atr_values else None
        last_price = candles[-1]['close']
        atr_percent = (last_atr / last_price * 100) if last_atr and last_price else None
        
        # Determine status
        status_type = 'normal'
        label = '변동성 보통'
        
        if atr_percent:
            if atr_percent > 3:
                status_type = 'high'
                label = '변동성 높음'
            elif atr_percent < 1.5:
                status_type = 'low'
                label = '변동성 낮음'
        
        return {
            'values': atr_values,
            'current': last_atr,
            'percent': atr_percent,
            'status': {'label': label, 'type': status_type}
        }
    
    def calculate_signal_score(self, indicators: Dict) -> Dict:
        """Calculate composite signal score (0-100)"""
        score = 50  # Start neutral
        signals = []
        fulfilled = []
        total = []
        
        # MA Cross (weight: 20)
        if 'maCross' in indicators and indicators['maCross']:
            total.append('MA크로스')
            if indicators['maCross'].get('currentPosition') == 'above':
                score += 10
                signals.append({'name': 'MA위치', 'status': '장기MA 위', 'positive': True})
                fulfilled.append('MA크로스')
            else:
                score -= 10
                signals.append({'name': 'MA위치', 'status': '장기MA 아래', 'positive': False})
            
            last_cross = indicators['maCross'].get('lastCross')
            days = indicators['maCross'].get('daysSinceCross', 999)
            if last_cross and days < 30:
                if last_cross.get('type') == 'golden':
                    score += 10
                    signals.append({'name': '골든크로스', 'status': f'{days}일 전', 'positive': True})
                elif last_cross.get('type') == 'dead':
                    score -= 10
                    signals.append({'name': '데드크로스', 'status': f'{days}일 전', 'positive': False})
        
        # RSI (weight: 15)
        if 'rsi' in indicators and indicators['rsi']:
            total.append('RSI')
            rsi_val = indicators['rsi'].get('current')
            if rsi_val is not None:
                if rsi_val <= 30:
                    score += 5  # Oversold = potential buy
                    signals.append({'name': 'RSI', 'status': f'{rsi_val:.1f} (과매도)', 'positive': True})
                    fulfilled.append('RSI')
                elif rsi_val >= 70:
                    score -= 5  # Overbought = potential sell
                    signals.append({'name': 'RSI', 'status': f'{rsi_val:.1f} (과매수)', 'positive': False})
                elif rsi_val > 50:
                    score += 3
                    signals.append({'name': 'RSI', 'status': f'{rsi_val:.1f} (상승우세)', 'positive': True})
                    fulfilled.append('RSI')
                else:
                    score -= 3
                    signals.append({'name': 'RSI', 'status': f'{rsi_val:.1f} (하락우세)', 'positive': False})
        
        # MACD (weight: 15)
        if 'macd' in indicators and indicators['macd']:
            total.append('MACD')
            macd_status = indicators['macd'].get('status', {})
            if macd_status.get('type') == 'bullish':
                score += 10
                signals.append({'name': 'MACD', 'status': macd_status.get('label', ''), 'positive': True})
                fulfilled.append('MACD')
            elif macd_status.get('type') == 'bearish':
                score -= 10
                signals.append({'name': 'MACD', 'status': macd_status.get('label', ''), 'positive': False})
        
        # Bollinger Bands (weight: 10)
        if 'bollinger' in indicators and indicators['bollinger']:
            total.append('볼린저')
            bb_status = indicators['bollinger'].get('status', {})
            if bb_status.get('type') == 'oversold':
                score += 5
                signals.append({'name': '볼린저', 'status': '하단이탈 (반등가능)', 'positive': True})
                fulfilled.append('볼린저')
            elif bb_status.get('type') == 'overbought':
                score -= 5
                signals.append({'name': '볼린저', 'status': '상단이탈 (조정가능)', 'positive': False})
            elif indicators['bollinger'].get('isSqueeze'):
                signals.append({'name': '볼린저', 'status': '스퀴즈 (변동성 수축)', 'positive': None})
        
        # ADX (weight: 10)
        if 'adx' in indicators and indicators['adx']:
            total.append('ADX')
            adx_val = indicators['adx'].get('current')
            adx_status = indicators['adx'].get('status', {})
            if adx_status.get('type') == 'strong':
                score += 5
                signals.append({'name': 'ADX', 'status': f"{adx_val:.1f} (강한추세)" if adx_val else "강한추세", 'positive': True})
                fulfilled.append('ADX')
            elif adx_status.get('type') == 'weak':
                signals.append({'name': 'ADX', 'status': f"{adx_val:.1f} (횡보)" if adx_val else "횡보", 'positive': None})
        
        # Clamp score
        score = max(0, min(100, score))
        
        # Determine status label
        status_label = '관찰'
        status_type = 'neutral'
        
        if score >= 75:
            status_label = '우호'
            status_type = 'bullish'
        elif score >= 60:
            status_label = '양호'
            status_type = 'positive'
        elif score <= 25:
            status_label = '경고'
            status_type = 'bearish'
        elif score <= 40:
            status_label = '주의'
            status_type = 'negative'
        
        fulfillment_rate = round((len(fulfilled) / len(total)) * 100) if total else 0
        
        return {
            'score': round(score),
            'fulfillmentRate': fulfillment_rate,
            'fulfilled': len(fulfilled),
            'total': len(total),
            'status': {
                'label': status_label,
                'type': status_type
            },
            'signals': signals
        }
    
    def calculate_all(self, candles: List[Dict]) -> Dict:
        """Calculate all indicators for a stock"""
        if not candles or len(candles) < 30:
            return {
                'error': 'Insufficient data',
                'message': '데이터 부족 (최소 30일 필요)'
            }
        
        closes = [c['close'] for c in candles]
        
        # Calculate all indicators
        sma50 = self.sma(closes, 50)
        sma200 = self.sma(closes, 200)
        ma_cross = self.detect_cross(sma50, sma200)
        rsi_data = self.rsi(closes)
        macd_data = self.macd(closes)
        bollinger_data = self.bollinger_bands(closes)
        adx_data = self.adx(candles)
        atr_data = self.atr(candles)
        
        # Volume analysis
        volumes = [c.get('volume', 0) for c in candles]
        avg_volume_20 = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
        current_volume = volumes[-1] if volumes else 0
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1
        
        indicators = {
            'maCross': ma_cross,
            'rsi': rsi_data,
            'macd': macd_data,
            'bollinger': bollinger_data,
            'adx': adx_data,
            'atr': atr_data,
            'volume': {
                'current': current_volume,
                'avg20': avg_volume_20,
                'ratio': volume_ratio,
                'status': '거래량 증가' if volume_ratio > 1.5 else '거래량 감소' if volume_ratio < 0.5 else '보통'
            }
        }
        
        # Calculate composite score
        signal_score = self.calculate_signal_score(indicators)
        
        return {
            **indicators,
            'signalScore': signal_score,
            'lastUpdate': datetime.now().isoformat()
        }


def generate_signals_data():
    """Generate signals data for all stocks"""
    logger.info("Generating signals data...")
    
    data_dir = CONFIG['data_dir']
    
    # Load universe
    universe_path = data_dir / 'universe.json'
    if universe_path.exists():
        with open(universe_path, 'r', encoding='utf-8') as f:
            universe = json.load(f)
    else:
        logger.warning("universe.json not found, using empty universe")
        universe = {'stocks': {}}
    
    # Load latest data for VIX
    latest_path = data_dir / 'latest.json'
    vix_value = 18.5
    vix_warning = False
    
    if latest_path.exists():
        with open(latest_path, 'r', encoding='utf-8') as f:
            latest_data = json.load(f)
            vix_value = latest_data.get('risk', {}).get('vix', 18.5) or 18.5
            vix_warning = vix_value >= CONFIG['vix_thresholds']['elevated']
    
    # Generate demo signals for each stock
    calculator = TechnicalIndicators()
    signals_data = {
        'metadata': {
            'version': '1.0',
            'lastUpdate': datetime.now().isoformat(),
            'description': 'Technical signals for stocks and sectors'
        },
        'vix': {
            'value': vix_value,
            'warning': vix_warning
        },
        'stocks': {}
    }
    
    # Generate demo data for stocks (since we don't have actual price data)
    import random
    random.seed(42)  # For reproducibility
    
    for market, stocks in universe.get('stocks', {}).items():
        signals_data['stocks'][market] = {}
        
        for ticker, meta in stocks.items():
            # Generate random but realistic demo data
            score = random.randint(25, 85)
            rsi = random.randint(25, 75)
            adx = random.randint(15, 45)
            
            status = {'label': '관찰', 'type': 'neutral'}
            if score >= 70:
                status = {'label': '우호', 'type': 'bullish'}
            elif score >= 55:
                status = {'label': '양호', 'type': 'positive'}
            elif score <= 30:
                status = {'label': '경고', 'type': 'bearish'}
            elif score <= 45:
                status = {'label': '주의', 'type': 'negative'}
            
            ma_type = random.choice(['golden', 'dead', None])
            ma_position = 'above' if score > 50 else 'below'
            
            macd_type = 'bullish' if score > 55 else 'bearish' if score < 45 else 'neutral'
            macd_label = '모멘텀 강화' if macd_type == 'bullish' else '모멘텀 약화' if macd_type == 'bearish' else '중립'
            
            signals_data['stocks'][market][ticker] = {
                'name': meta.get('name', ticker),
                'sector_l1': meta.get('sector_l1', 'unknown'),
                'sector_l2': meta.get('sector_l2', 'unknown'),
                'price': random.randint(50, 500) if market == 'us' else random.randint(10000, 500000),
                'change': round(random.uniform(-5, 5), 2),
                'changePercent': round(random.uniform(-5, 5), 2),
                'signalScore': {
                    'score': score,
                    'fulfillmentRate': random.randint(30, 80),
                    'fulfilled': random.randint(2, 5),
                    'total': 6,
                    'status': status,
                    'signals': [
                        {'name': 'RSI', 'status': f'{rsi}', 'positive': rsi > 50},
                        {'name': 'MA', 'status': '상승 우세' if ma_position == 'above' else '하락 우세', 'positive': ma_position == 'above'},
                        {'name': 'MACD', 'status': macd_label, 'positive': macd_type == 'bullish'}
                    ]
                },
                'rsi': {
                    'current': rsi,
                    'status': {
                        'type': 'overbought' if rsi >= 70 else 'oversold' if rsi <= 30 else 'neutral',
                        'label': '과매수' if rsi >= 70 else '과매도' if rsi <= 30 else '중립'
                    }
                },
                'macd': {
                    'status': {
                        'type': macd_type,
                        'label': macd_label
                    }
                },
                'maCross': {
                    'lastCross': {'type': ma_type, 'label': '상승 우세' if ma_type == 'golden' else '하락 우세'} if ma_type else None,
                    'currentPosition': ma_position,
                    'daysSinceCross': random.randint(1, 60)
                },
                'adx': {
                    'current': adx,
                    'status': {
                        'type': 'strong' if adx >= 25 else 'weak',
                        'label': '추세 강도 높음' if adx >= 25 else '횡보 가능'
                    }
                },
                'bollinger': {
                    'status': {
                        'type': 'normal',
                        'label': '밴드 내 정상'
                    }
                },
                'lastSignalDate': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat()
            }
    
    # Save signals data
    output_path = data_dir / 'signals_latest.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(signals_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Signals data saved to {output_path}")
    
    return signals_data


if __name__ == '__main__':
    generate_signals_data()
