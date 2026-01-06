/**
 * Technical Indicators Module
 * 기술적 지표 계산 모듈
 * 
 * Reference:
 * - Golden Cross: https://www.investopedia.com/terms/g/goldencross.asp
 * - MACD: https://www.investopedia.com/terms/m/macd.asp
 * - RSI: https://www.investopedia.com/terms/r/rsi.asp
 * - Bollinger Bands: https://en.wikipedia.org/wiki/Bollinger_Bands
 */

const TechnicalIndicators = {
    // ============================================
    // Configuration
    // ============================================
    config: {
        ma: {
            periods: [5, 10, 20, 50, 60, 120, 200],
            defaultShort: 50,
            defaultLong: 200
        },
        macd: {
            fast: 12,
            slow: 26,
            signal: 9
        },
        rsi: {
            period: 14,
            overbought: 70,
            oversold: 30
        },
        bollinger: {
            period: 20,
            stdDev: 2
        },
        adx: {
            period: 14,
            trendStrong: 25,
            trendWeak: 20
        },
        atr: {
            period: 14
        },
        vix: {
            low: 15,
            normal: 20,
            elevated: 25,
            high: 30
        }
    },

    // ============================================
    // Moving Averages
    // ============================================
    
    /**
     * Simple Moving Average
     * @param {number[]} prices - Array of closing prices
     * @param {number} period - MA period
     * @returns {number[]} - SMA values
     */
    sma(prices, period) {
        const result = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                result.push(null);
            } else {
                const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                result.push(sum / period);
            }
        }
        return result;
    },

    /**
     * Exponential Moving Average
     * @param {number[]} prices - Array of closing prices
     * @param {number} period - EMA period
     * @returns {number[]} - EMA values
     */
    ema(prices, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        
        // First EMA is SMA
        let sum = 0;
        for (let i = 0; i < period && i < prices.length; i++) {
            sum += prices[i];
            result.push(null);
        }
        
        if (prices.length >= period) {
            result[period - 1] = sum / period;
            
            for (let i = period; i < prices.length; i++) {
                const ema = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
                result.push(ema);
            }
        }
        
        return result;
    },

    /**
     * Detect Golden/Dead Cross
     * @param {number[]} shortMA - Short period MA
     * @param {number[]} longMA - Long period MA
     * @returns {Object} - Cross information
     */
    detectCross(shortMA, longMA) {
        const crosses = [];
        let lastCross = null;
        let daysSinceCross = 0;
        let daysAboveLong = 0;
        let daysBelowLong = 0;
        
        for (let i = 1; i < shortMA.length; i++) {
            if (shortMA[i] === null || longMA[i] === null || 
                shortMA[i - 1] === null || longMA[i - 1] === null) {
                continue;
            }
            
            const wasBelow = shortMA[i - 1] < longMA[i - 1];
            const isAbove = shortMA[i] > longMA[i];
            
            if (wasBelow && isAbove) {
                // Golden Cross - 상승 우세
                lastCross = {
                    type: 'golden',
                    label: '상승 우세',
                    labelEn: 'Bullish (Golden Cross)',
                    index: i,
                    date: null // Will be filled by caller
                };
                crosses.push({ ...lastCross });
                daysSinceCross = 0;
            } else if (!wasBelow && !isAbove) {
                // Dead Cross - 하락 우세
                lastCross = {
                    type: 'dead',
                    label: '하락 우세',
                    labelEn: 'Bearish (Dead Cross)',
                    index: i,
                    date: null
                };
                crosses.push({ ...lastCross });
                daysSinceCross = 0;
            }
            
            daysSinceCross++;
            
            if (shortMA[i] > longMA[i]) {
                daysAboveLong++;
                daysBelowLong = 0;
            } else {
                daysBelowLong++;
                daysAboveLong = 0;
            }
        }
        
        return {
            crosses,
            lastCross,
            daysSinceCross,
            daysAboveLong,
            daysBelowLong,
            currentPosition: shortMA[shortMA.length - 1] > longMA[longMA.length - 1] ? 'above' : 'below'
        };
    },

    // ============================================
    // MACD (12/26/9)
    // ============================================
    
    /**
     * Calculate MACD
     * @param {number[]} prices - Array of closing prices
     * @returns {Object} - MACD line, Signal line, Histogram
     */
    macd(prices) {
        const { fast, slow, signal } = this.config.macd;
        
        const emaFast = this.ema(prices, fast);
        const emaSlow = this.ema(prices, slow);
        
        // MACD Line = 12 EMA - 26 EMA
        const macdLine = emaFast.map((val, i) => {
            if (val === null || emaSlow[i] === null) return null;
            return val - emaSlow[i];
        });
        
        // Signal Line = 9 EMA of MACD
        const validMacd = macdLine.filter(v => v !== null);
        const signalValues = this.ema(validMacd, signal);
        
        // Map back to original length
        const signalLine = [];
        let signalIdx = 0;
        for (let i = 0; i < macdLine.length; i++) {
            if (macdLine[i] === null) {
                signalLine.push(null);
            } else {
                signalLine.push(signalValues[signalIdx] || null);
                signalIdx++;
            }
        }
        
        // Histogram = MACD - Signal
        const histogram = macdLine.map((val, i) => {
            if (val === null || signalLine[i] === null) return null;
            return val - signalLine[i];
        });
        
        // Detect signal
        const lastMACD = macdLine[macdLine.length - 1];
        const lastSignal = signalLine[signalLine.length - 1];
        const lastHist = histogram[histogram.length - 1];
        const prevHist = histogram[histogram.length - 2];
        
        let signal_status = {
            label: '중립',
            labelEn: 'Neutral',
            type: 'neutral'
        };
        
        if (lastMACD !== null && lastSignal !== null) {
            if (prevHist !== null && prevHist <= 0 && lastHist > 0) {
                signal_status = {
                    label: '모멘텀 강화',
                    labelEn: 'Momentum Strengthening',
                    type: 'bullish'
                };
            } else if (prevHist !== null && prevHist >= 0 && lastHist < 0) {
                signal_status = {
                    label: '모멘텀 약화',
                    labelEn: 'Momentum Weakening',
                    type: 'bearish'
                };
            } else if (lastMACD > 0) {
                signal_status = {
                    label: '0선 상단 (강세)',
                    labelEn: 'Above Zero (Bullish)',
                    type: 'bullish'
                };
            } else {
                signal_status = {
                    label: '0선 하단 (약세)',
                    labelEn: 'Below Zero (Bearish)',
                    type: 'bearish'
                };
            }
        }
        
        return {
            macdLine,
            signalLine,
            histogram,
            current: {
                macd: lastMACD,
                signal: lastSignal,
                histogram: lastHist
            },
            status: signal_status
        };
    },

    // ============================================
    // RSI (Relative Strength Index)
    // ============================================
    
    /**
     * Calculate RSI
     * @param {number[]} prices - Array of closing prices
     * @param {number} period - RSI period (default 14)
     * @returns {Object} - RSI values and status
     */
    rsi(prices, period = 14) {
        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }
        
        const gains = changes.map(c => c > 0 ? c : 0);
        const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
        
        const result = [];
        
        // First RSI uses SMA
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        // Fill nulls for first period
        for (let i = 0; i < period; i++) {
            result.push(null);
        }
        
        // Calculate RSI
        for (let i = period; i < changes.length; i++) {
            if (i === period) {
                // First RSI value
            } else {
                // Smoothed average
                avgGain = (avgGain * (period - 1) + gains[i]) / period;
                avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
            }
            
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            result.push(rsi);
        }
        
        // Add one more null at the beginning to align with prices
        result.unshift(null);
        
        const lastRSI = result[result.length - 1];
        
        let status = {
            label: '중립',
            labelEn: 'Neutral',
            type: 'neutral',
            value: lastRSI
        };
        
        if (lastRSI !== null) {
            if (lastRSI >= this.config.rsi.overbought) {
                status = {
                    label: '과열 구간 (과매수)',
                    labelEn: 'Overbought Zone',
                    type: 'overbought',
                    value: lastRSI
                };
            } else if (lastRSI <= this.config.rsi.oversold) {
                status = {
                    label: '과매도 구간',
                    labelEn: 'Oversold Zone',
                    type: 'oversold',
                    value: lastRSI
                };
            } else if (lastRSI > 50) {
                status = {
                    label: '상승 우세',
                    labelEn: 'Bullish Bias',
                    type: 'bullish',
                    value: lastRSI
                };
            } else {
                status = {
                    label: '하락 우세',
                    labelEn: 'Bearish Bias',
                    type: 'bearish',
                    value: lastRSI
                };
            }
        }
        
        return {
            values: result,
            current: lastRSI,
            status
        };
    },

    // ============================================
    // Bollinger Bands (20, 2σ)
    // ============================================
    
    /**
     * Calculate Bollinger Bands
     * @param {number[]} prices - Array of closing prices
     * @param {number} period - MA period (default 20)
     * @param {number} stdDevMultiplier - Standard deviation multiplier (default 2)
     * @returns {Object} - Upper, Middle, Lower bands
     */
    bollingerBands(prices, period = 20, stdDevMultiplier = 2) {
        const middle = this.sma(prices, period);
        const upper = [];
        const lower = [];
        const bandwidth = [];
        const percentB = [];
        
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                upper.push(null);
                lower.push(null);
                bandwidth.push(null);
                percentB.push(null);
            } else {
                const slice = prices.slice(i - period + 1, i + 1);
                const mean = middle[i];
                const squaredDiffs = slice.map(x => Math.pow(x - mean, 2));
                const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
                const stdDev = Math.sqrt(variance);
                
                const upperBand = mean + (stdDevMultiplier * stdDev);
                const lowerBand = mean - (stdDevMultiplier * stdDev);
                
                upper.push(upperBand);
                lower.push(lowerBand);
                
                // Bandwidth = (Upper - Lower) / Middle
                bandwidth.push((upperBand - lowerBand) / mean * 100);
                
                // %B = (Price - Lower) / (Upper - Lower)
                const pB = (prices[i] - lowerBand) / (upperBand - lowerBand);
                percentB.push(pB);
            }
        }
        
        const lastPrice = prices[prices.length - 1];
        const lastUpper = upper[upper.length - 1];
        const lastLower = lower[lower.length - 1];
        const lastPercentB = percentB[percentB.length - 1];
        const lastBandwidth = bandwidth[bandwidth.length - 1];
        
        // Detect squeeze (low bandwidth)
        const avgBandwidth = bandwidth.filter(b => b !== null).slice(-20).reduce((a, b) => a + b, 0) / 20;
        const isSqueeze = lastBandwidth < avgBandwidth * 0.8;
        
        let status = {
            label: '밴드 내 정상',
            labelEn: 'Normal',
            type: 'normal'
        };
        
        if (isSqueeze) {
            status = {
                label: '변동성 수축 (스퀴즈)',
                labelEn: 'Volatility Squeeze',
                type: 'squeeze'
            };
        } else if (lastPercentB > 1) {
            status = {
                label: '상단 밴드 이탈 (과열)',
                labelEn: 'Above Upper Band',
                type: 'overbought'
            };
        } else if (lastPercentB < 0) {
            status = {
                label: '하단 밴드 이탈 (과매도)',
                labelEn: 'Below Lower Band',
                type: 'oversold'
            };
        } else if (lastPercentB > 0.8) {
            status = {
                label: '상단 밴드 근접',
                labelEn: 'Near Upper Band',
                type: 'elevated'
            };
        } else if (lastPercentB < 0.2) {
            status = {
                label: '하단 밴드 근접',
                labelEn: 'Near Lower Band',
                type: 'low'
            };
        }
        
        return {
            upper,
            middle,
            lower,
            bandwidth,
            percentB,
            current: {
                upper: lastUpper,
                middle: middle[middle.length - 1],
                lower: lastLower,
                percentB: lastPercentB,
                bandwidth: lastBandwidth
            },
            isSqueeze,
            status
        };
    },

    // ============================================
    // ADX (Average Directional Index)
    // ============================================
    
    /**
     * Calculate ADX
     * @param {Object[]} candles - Array of {high, low, close}
     * @param {number} period - ADX period (default 14)
     * @returns {Object} - ADX values and status
     */
    adx(candles, period = 14) {
        if (candles.length < period * 2) {
            return {
                values: [],
                plusDI: [],
                minusDI: [],
                current: null,
                status: { label: '데이터 부족', type: 'unknown' }
            };
        }
        
        const trueRange = [];
        const plusDM = [];
        const minusDM = [];
        
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevHigh = candles[i - 1].high;
            const prevLow = candles[i - 1].low;
            const prevClose = candles[i - 1].close;
            
            // True Range
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRange.push(tr);
            
            // Directional Movement
            const upMove = high - prevHigh;
            const downMove = prevLow - low;
            
            plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
            minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
        }
        
        // Smoothed TR and DM
        const smoothTR = this.wilderSmooth(trueRange, period);
        const smoothPlusDM = this.wilderSmooth(plusDM, period);
        const smoothMinusDM = this.wilderSmooth(minusDM, period);
        
        // +DI and -DI
        const plusDI = smoothPlusDM.map((dm, i) => {
            if (smoothTR[i] === 0) return 0;
            return (dm / smoothTR[i]) * 100;
        });
        
        const minusDI = smoothMinusDM.map((dm, i) => {
            if (smoothTR[i] === 0) return 0;
            return (dm / smoothTR[i]) * 100;
        });
        
        // DX
        const dx = plusDI.map((pdi, i) => {
            const sum = pdi + minusDI[i];
            if (sum === 0) return 0;
            return Math.abs(pdi - minusDI[i]) / sum * 100;
        });
        
        // ADX = Smoothed DX
        const adxValues = this.wilderSmooth(dx, period);
        
        const lastADX = adxValues[adxValues.length - 1];
        
        let status = {
            label: '횡보 가능 (추세 약함)',
            labelEn: 'Ranging (Weak Trend)',
            type: 'weak'
        };
        
        if (lastADX >= this.config.adx.trendStrong) {
            status = {
                label: '추세 강도 높음',
                labelEn: 'Strong Trend',
                type: 'strong'
            };
        } else if (lastADX >= this.config.adx.trendWeak) {
            status = {
                label: '추세 형성 중',
                labelEn: 'Developing Trend',
                type: 'moderate'
            };
        }
        
        return {
            values: adxValues,
            plusDI,
            minusDI,
            current: lastADX,
            status
        };
    },
    
    /**
     * Wilder's Smoothing Method
     */
    wilderSmooth(data, period) {
        const result = [];
        let sum = 0;
        
        for (let i = 0; i < data.length; i++) {
            if (i < period) {
                sum += data[i];
                result.push(sum / (i + 1));
            } else {
                const smoothed = result[i - 1] - (result[i - 1] / period) + data[i];
                result.push(smoothed);
            }
        }
        
        return result;
    },

    // ============================================
    // ATR (Average True Range)
    // ============================================
    
    /**
     * Calculate ATR
     * @param {Object[]} candles - Array of {high, low, close}
     * @param {number} period - ATR period (default 14)
     * @returns {Object} - ATR values
     */
    atr(candles, period = 14) {
        const trueRange = [];
        
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;
            
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRange.push(tr);
        }
        
        const atrValues = this.wilderSmooth(trueRange, period);
        const lastATR = atrValues[atrValues.length - 1];
        const lastPrice = candles[candles.length - 1].close;
        const atrPercent = (lastATR / lastPrice) * 100;
        
        return {
            values: atrValues,
            current: lastATR,
            percent: atrPercent,
            status: {
                label: atrPercent > 3 ? '변동성 높음' : atrPercent > 1.5 ? '변동성 보통' : '변동성 낮음',
                type: atrPercent > 3 ? 'high' : atrPercent > 1.5 ? 'normal' : 'low'
            }
        };
    },

    // ============================================
    // VIX Analysis
    // ============================================
    
    /**
     * Analyze VIX level
     * @param {number} vixValue - Current VIX value
     * @param {number} vixChange5D - 5-day change percentage
     * @returns {Object} - VIX status
     */
    analyzeVix(vixValue, vixChange5D = 0) {
        let status = {
            level: 'normal',
            label: '변동성 보통',
            labelEn: 'Normal Volatility',
            warning: false
        };
        
        if (vixValue < this.config.vix.low) {
            status = {
                level: 'low',
                label: '변동성 낮음',
                labelEn: 'Low Volatility',
                warning: false
            };
        } else if (vixValue >= this.config.vix.high) {
            status = {
                level: 'extreme',
                label: '변동성 높음 (경고)',
                labelEn: 'High Volatility Warning',
                warning: true
            };
        } else if (vixValue >= this.config.vix.elevated) {
            status = {
                level: 'elevated',
                label: '변동성 주의',
                labelEn: 'Elevated Volatility',
                warning: true
            };
        }
        
        // Check for VIX spike
        if (vixChange5D > 20) {
            status.spike = true;
            status.label += ' (급등)';
            status.warning = true;
        }
        
        return status;
    },

    // ============================================
    // Composite Signal Score
    // ============================================
    
    /**
     * Calculate composite signal score (0-100)
     * @param {Object} indicators - All calculated indicators
     * @returns {Object} - Score and status
     */
    calculateSignalScore(indicators) {
        let score = 50; // Start neutral
        const signals = [];
        const fulfilled = [];
        const total = [];
        
        // MA Cross (weight: 20)
        if (indicators.maCross) {
            total.push('MA크로스');
            if (indicators.maCross.currentPosition === 'above') {
                score += 10;
                signals.push({ name: 'MA위치', status: '장기MA 위', positive: true });
                fulfilled.push('MA크로스');
            } else {
                score -= 10;
                signals.push({ name: 'MA위치', status: '장기MA 아래', positive: false });
            }
            
            if (indicators.maCross.lastCross?.type === 'golden' && indicators.maCross.daysSinceCross < 30) {
                score += 10;
                signals.push({ name: '골든크로스', status: `${indicators.maCross.daysSinceCross}일 전`, positive: true });
            } else if (indicators.maCross.lastCross?.type === 'dead' && indicators.maCross.daysSinceCross < 30) {
                score -= 10;
                signals.push({ name: '데드크로스', status: `${indicators.maCross.daysSinceCross}일 전`, positive: false });
            }
        }
        
        // RSI (weight: 15)
        if (indicators.rsi) {
            total.push('RSI');
            const rsi = indicators.rsi.current;
            if (rsi !== null) {
                if (rsi <= 30) {
                    score += 5; // Oversold = potential buy
                    signals.push({ name: 'RSI', status: `${rsi.toFixed(1)} (과매도)`, positive: true });
                    fulfilled.push('RSI');
                } else if (rsi >= 70) {
                    score -= 5; // Overbought = potential sell
                    signals.push({ name: 'RSI', status: `${rsi.toFixed(1)} (과매수)`, positive: false });
                } else if (rsi > 50) {
                    score += 3;
                    signals.push({ name: 'RSI', status: `${rsi.toFixed(1)} (상승우세)`, positive: true });
                    fulfilled.push('RSI');
                } else {
                    score -= 3;
                    signals.push({ name: 'RSI', status: `${rsi.toFixed(1)} (하락우세)`, positive: false });
                }
            }
        }
        
        // MACD (weight: 15)
        if (indicators.macd) {
            total.push('MACD');
            if (indicators.macd.status.type === 'bullish') {
                score += 10;
                signals.push({ name: 'MACD', status: indicators.macd.status.label, positive: true });
                fulfilled.push('MACD');
            } else if (indicators.macd.status.type === 'bearish') {
                score -= 10;
                signals.push({ name: 'MACD', status: indicators.macd.status.label, positive: false });
            }
        }
        
        // Bollinger Bands (weight: 10)
        if (indicators.bollinger) {
            total.push('볼린저');
            const bb = indicators.bollinger;
            if (bb.status.type === 'oversold') {
                score += 5;
                signals.push({ name: '볼린저', status: '하단이탈 (반등가능)', positive: true });
                fulfilled.push('볼린저');
            } else if (bb.status.type === 'overbought') {
                score -= 5;
                signals.push({ name: '볼린저', status: '상단이탈 (조정가능)', positive: false });
            } else if (bb.isSqueeze) {
                signals.push({ name: '볼린저', status: '스퀴즈 (변동성 수축)', positive: null });
            }
        }
        
        // ADX (weight: 10)
        if (indicators.adx) {
            total.push('ADX');
            if (indicators.adx.status.type === 'strong') {
                score += 5; // Strong trend is positive (assuming trend direction)
                signals.push({ name: 'ADX', status: `${indicators.adx.current?.toFixed(1)} (강한추세)`, positive: true });
                fulfilled.push('ADX');
            } else if (indicators.adx.status.type === 'weak') {
                signals.push({ name: 'ADX', status: `${indicators.adx.current?.toFixed(1)} (횡보)`, positive: null });
            }
        }
        
        // Clamp score to 0-100
        score = Math.max(0, Math.min(100, score));
        
        // Determine status label
        let statusLabel = '관찰';
        let statusType = 'neutral';
        
        if (score >= 75) {
            statusLabel = '우호';
            statusType = 'bullish';
        } else if (score >= 60) {
            statusLabel = '양호';
            statusType = 'positive';
        } else if (score <= 25) {
            statusLabel = '경고';
            statusType = 'bearish';
        } else if (score <= 40) {
            statusLabel = '주의';
            statusType = 'negative';
        }
        
        return {
            score: Math.round(score),
            fulfillmentRate: total.length > 0 ? Math.round((fulfilled.length / total.length) * 100) : 0,
            fulfilled: fulfilled.length,
            total: total.length,
            status: {
                label: statusLabel,
                type: statusType
            },
            signals
        };
    },

    // ============================================
    // Calculate All Indicators
    // ============================================
    
    /**
     * Calculate all indicators for a stock
     * @param {Object[]} candles - Array of {date, open, high, low, close, volume}
     * @returns {Object} - All indicators
     */
    calculateAll(candles) {
        if (!candles || candles.length < 30) {
            return {
                error: 'Insufficient data',
                message: '데이터 부족 (최소 30일 필요)'
            };
        }
        
        const closes = candles.map(c => c.close);
        
        // Calculate all indicators
        const sma50 = this.sma(closes, 50);
        const sma200 = this.sma(closes, 200);
        const maCross = this.detectCross(sma50, sma200);
        const rsi = this.rsi(closes);
        const macd = this.macd(closes);
        const bollinger = this.bollingerBands(closes);
        const adx = this.adx(candles);
        const atr = this.atr(candles);
        
        // Volume analysis
        const volumes = candles.map(c => c.volume || 0);
        const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const currentVolume = volumes[volumes.length - 1];
        const volumeRatio = avgVolume20 > 0 ? currentVolume / avgVolume20 : 1;
        
        const indicators = {
            maCross,
            rsi,
            macd,
            bollinger,
            adx,
            atr,
            volume: {
                current: currentVolume,
                avg20: avgVolume20,
                ratio: volumeRatio,
                status: volumeRatio > 1.5 ? '거래량 증가' : volumeRatio < 0.5 ? '거래량 감소' : '보통'
            }
        };
        
        // Calculate composite score
        const signalScore = this.calculateSignalScore(indicators);
        
        return {
            ...indicators,
            signalScore,
            lastUpdate: new Date().toISOString()
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechnicalIndicators;
}
