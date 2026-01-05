/**
 * Sector Cycle Dashboard - Charts Module
 * Lightweight Charts + Custom Indicators
 */

// ============================================
// Chart Instances
// ============================================
let mainChart = null;
let miniCharts = {};

// ============================================
// Main Chart Initialization
// ============================================
function initializeCharts() {
    initMainChart();
    initMiniCharts();
}

function initMainChart() {
    const container = document.getElementById('mainChart');
    if (!container) return;
    
    // Clear existing chart
    container.innerHTML = '';
    
    // Create chart
    mainChart = LightweightCharts.createChart(container, {
        layout: {
            background: { type: 'solid', color: '#1c2128' },
            textColor: '#8b949e',
        },
        grid: {
            vertLines: { color: '#21262d' },
            horzLines: { color: '#21262d' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#30363d',
        },
        timeScale: {
            borderColor: '#30363d',
            timeVisible: true,
        },
        handleScroll: {
            vertTouchDrag: false,
        },
    });
    
    // Add VIX series by default
    const vixSeries = mainChart.addAreaSeries({
        lineColor: '#d29922',
        topColor: 'rgba(210, 153, 34, 0.4)',
        bottomColor: 'rgba(210, 153, 34, 0.0)',
        lineWidth: 2,
    });
    
    // Generate sample VIX data
    const vixData = generateSampleTimeSeriesData(365, 15, 25);
    vixSeries.setData(vixData);
    
    // Add reference lines
    addReferenceLine(mainChart, 20, 'VIX 20 (Normal)', '#3fb950');
    addReferenceLine(mainChart, 30, 'VIX 30 (High)', '#f85149');
    
    // Fit content
    mainChart.timeScale().fitContent();
    
    // Handle resize
    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) return;
        const { width, height } = entries[0].contentRect;
        mainChart.applyOptions({ width, height });
    }).observe(container);
}

function updateMainChart(indicator) {
    if (!mainChart) return;
    
    // Remove all series
    mainChart.removeSeries(mainChart.getSeries ? mainChart.getSeries() : []);
    
    // Clear and reinitialize
    const container = document.getElementById('mainChart');
    container.innerHTML = '';
    
    mainChart = LightweightCharts.createChart(container, {
        layout: {
            background: { type: 'solid', color: '#1c2128' },
            textColor: '#8b949e',
        },
        grid: {
            vertLines: { color: '#21262d' },
            horzLines: { color: '#21262d' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#30363d',
        },
        timeScale: {
            borderColor: '#30363d',
            timeVisible: true,
        },
    });
    
    let series;
    let data;
    
    switch (indicator) {
        case 'vix':
            series = mainChart.addAreaSeries({
                lineColor: '#d29922',
                topColor: 'rgba(210, 153, 34, 0.4)',
                bottomColor: 'rgba(210, 153, 34, 0.0)',
                lineWidth: 2,
            });
            data = generateSampleTimeSeriesData(365, 15, 25);
            addReferenceLine(mainChart, 20, 'Normal', '#3fb950');
            addReferenceLine(mainChart, 30, 'High Risk', '#f85149');
            break;
            
        case 'cli':
            series = mainChart.addLineSeries({
                color: '#58a6ff',
                lineWidth: 2,
            });
            data = generateSampleTimeSeriesData(365, 99, 101);
            addReferenceLine(mainChart, 100, 'Baseline', '#8b949e');
            break;
            
        case 'pmi':
            series = mainChart.addLineSeries({
                color: '#a371f7',
                lineWidth: 2,
            });
            data = generateSampleTimeSeriesData(365, 48, 55);
            addReferenceLine(mainChart, 50, 'Expansion/Contraction', '#d29922');
            break;
            
        case 'bdi':
            series = mainChart.addAreaSeries({
                lineColor: '#3fb950',
                topColor: 'rgba(63, 185, 80, 0.4)',
                bottomColor: 'rgba(63, 185, 80, 0.0)',
                lineWidth: 2,
            });
            data = generateSampleTimeSeriesData(365, 1200, 2200);
            break;
            
        case 'yield':
            series = mainChart.addAreaSeries({
                lineColor: '#f85149',
                topColor: 'rgba(248, 81, 73, 0.4)',
                bottomColor: 'rgba(248, 81, 73, 0.0)',
                lineWidth: 2,
            });
            data = generateSampleTimeSeriesData(365, -0.5, 1.5);
            addReferenceLine(mainChart, 0, 'Yield Curve Inversion', '#d29922');
            break;
            
        default:
            series = mainChart.addLineSeries({
                color: '#58a6ff',
                lineWidth: 2,
            });
            data = generateSampleTimeSeriesData(365, 0, 100);
    }
    
    series.setData(data);
    mainChart.timeScale().fitContent();
}

function addReferenceLine(chart, value, title, color) {
    // Create a horizontal line using price line
    const series = chart.addLineSeries({
        color: 'transparent',
        lineWidth: 0,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    
    // Set data with single point (hack for reference line)
    const now = Math.floor(Date.now() / 1000);
    series.setData([{ time: now - 365 * 24 * 60 * 60, value: value }]);
    
    series.createPriceLine({
        price: value,
        color: color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: title,
    });
}

// ============================================
// Mini Charts for Cards
// ============================================
function initMiniCharts() {
    const miniChartConfigs = [
        { id: 'macroMiniChart', type: 'line', color: '#3fb950', data: generateSparklineData(30, 65, 75) },
        { id: 'tradeMiniChart', type: 'area', color: '#58a6ff', data: generateSparklineData(30, 1500, 1900) },
        { id: 'commodityMiniChart', type: 'line', color: '#d29922', data: generateSparklineData(30, 115, 130) },
        { id: 'oilMiniChart', type: 'area', color: '#a371f7', data: generateSparklineData(30, 65, 80) },
        { id: 'koreaMiniChart', type: 'line', color: '#f85149', data: generateSparklineData(30, 2500, 2700) },
    ];
    
    miniChartConfigs.forEach(config => {
        const container = document.getElementById(config.id);
        if (!container) return;
        
        container.innerHTML = '';
        
        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: 'solid', color: '#21262d' },
                textColor: 'transparent',
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            rightPriceScale: { visible: false },
            timeScale: { visible: false },
            crosshair: { mode: LightweightCharts.CrosshairMode.Hidden },
            handleScroll: false,
            handleScale: false,
        });
        
        let series;
        if (config.type === 'area') {
            series = chart.addAreaSeries({
                lineColor: config.color,
                topColor: `${config.color}40`,
                bottomColor: `${config.color}00`,
                lineWidth: 1,
            });
        } else {
            series = chart.addLineSeries({
                color: config.color,
                lineWidth: 1,
            });
        }
        
        series.setData(config.data);
        chart.timeScale().fitContent();
        
        miniCharts[config.id] = chart;
    });
}

// ============================================
// Candlestick Chart with Indicators
// ============================================
function createCandlestickChart(containerId, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    container.innerHTML = '';
    
    const chart = LightweightCharts.createChart(container, {
        layout: {
            background: { type: 'solid', color: '#0d1117' },
            textColor: '#8b949e',
        },
        grid: {
            vertLines: { color: '#21262d' },
            horzLines: { color: '#21262d' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#30363d',
            scaleMargins: {
                top: 0.1,
                bottom: 0.2,
            },
        },
        timeScale: {
            borderColor: '#30363d',
            timeVisible: true,
            secondsVisible: false,
        },
    });
    
    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
        upColor: '#3fb950',
        downColor: '#f85149',
        borderUpColor: '#3fb950',
        borderDownColor: '#f85149',
        wickUpColor: '#3fb950',
        wickDownColor: '#f85149',
    });
    
    candleSeries.setData(data);
    
    // Add Moving Averages
    if (options.showMA) {
        const ma5 = calculateMA(data, 5);
        const ma20 = calculateMA(data, 20);
        const ma60 = calculateMA(data, 60);
        const ma120 = calculateMA(data, 120);
        
        const ma5Series = chart.addLineSeries({
            color: '#d29922',
            lineWidth: 1,
            title: 'MA5',
        });
        ma5Series.setData(ma5);
        
        const ma20Series = chart.addLineSeries({
            color: '#58a6ff',
            lineWidth: 1,
            title: 'MA20',
        });
        ma20Series.setData(ma20);
        
        const ma60Series = chart.addLineSeries({
            color: '#a371f7',
            lineWidth: 1,
            title: 'MA60',
        });
        ma60Series.setData(ma60);
        
        const ma120Series = chart.addLineSeries({
            color: '#3fb950',
            lineWidth: 1,
            title: 'MA120',
        });
        ma120Series.setData(ma120);
        
        // Detect Golden/Dead Cross
        if (options.showCross) {
            const crossSignals = detectCrossSignals(ma5, ma20);
            crossSignals.forEach(signal => {
                candleSeries.setMarkers([{
                    time: signal.time,
                    position: signal.type === 'golden' ? 'belowBar' : 'aboveBar',
                    color: signal.type === 'golden' ? '#3fb950' : '#f85149',
                    shape: signal.type === 'golden' ? 'arrowUp' : 'arrowDown',
                    text: signal.type === 'golden' ? 'Golden Cross' : 'Dead Cross',
                }]);
            });
        }
    }
    
    // Add Bollinger Bands
    if (options.showBB) {
        const bb = calculateBollingerBands(data, 20, 2);
        
        const upperBand = chart.addLineSeries({
            color: '#8b949e',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
        });
        upperBand.setData(bb.upper);
        
        const lowerBand = chart.addLineSeries({
            color: '#8b949e',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
        });
        lowerBand.setData(bb.lower);
    }
    
    // Add Volume
    if (options.showVolume) {
        const volumeSeries = chart.addHistogramSeries({
            color: '#58a6ff',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });
        
        const volumeData = data.map(d => ({
            time: d.time,
            value: d.volume || Math.random() * 1000000,
            color: d.close >= d.open ? '#3fb95080' : '#f8514980',
        }));
        
        volumeSeries.setData(volumeData);
    }
    
    chart.timeScale().fitContent();
    
    return chart;
}

// ============================================
// Technical Indicators
// ============================================
function calculateMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        result.push({
            time: data[i].time,
            value: sum / period,
        });
    }
    return result;
}

function calculateEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;
    
    for (let i = 0; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
        result.push({
            time: data[i].time,
            value: ema,
        });
    }
    return result;
}

function calculateRSI(data, period = 14) {
    const result = [];
    let gains = [];
    let losses = [];
    
    for (let i = 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
        
        if (i >= period) {
            const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            
            result.push({
                time: data[i].time,
                value: rsi,
            });
        }
    }
    return result;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    const macdLine = [];
    for (let i = slowPeriod - 1; i < data.length; i++) {
        macdLine.push({
            time: data[i].time,
            value: fastEMA[i].value - slowEMA[i - (slowPeriod - fastPeriod)].value,
        });
    }
    
    const signalLine = calculateEMA(macdLine.map(d => ({ ...d, close: d.value })), signalPeriod);
    
    const histogram = [];
    for (let i = signalPeriod - 1; i < macdLine.length; i++) {
        histogram.push({
            time: macdLine[i].time,
            value: macdLine[i].value - signalLine[i - (signalPeriod - 1)].value,
        });
    }
    
    return { macdLine, signalLine, histogram };
}

function calculateBollingerBands(data, period = 20, stdDev = 2) {
    const ma = calculateMA(data, period);
    const upper = [];
    const lower = [];
    
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += Math.pow(data[i - j].close - ma[i - period + 1].value, 2);
        }
        const std = Math.sqrt(sum / period);
        
        upper.push({
            time: data[i].time,
            value: ma[i - period + 1].value + (stdDev * std),
        });
        lower.push({
            time: data[i].time,
            value: ma[i - period + 1].value - (stdDev * std),
        });
    }
    
    return { ma, upper, lower };
}

function detectCrossSignals(shortMA, longMA) {
    const signals = [];
    
    for (let i = 1; i < Math.min(shortMA.length, longMA.length); i++) {
        const prevShort = shortMA[i - 1]?.value;
        const prevLong = longMA[i - 1]?.value;
        const currShort = shortMA[i]?.value;
        const currLong = longMA[i]?.value;
        
        if (prevShort && prevLong && currShort && currLong) {
            // Golden Cross: Short MA crosses above Long MA
            if (prevShort < prevLong && currShort > currLong) {
                signals.push({
                    time: shortMA[i].time,
                    type: 'golden',
                });
            }
            // Dead Cross: Short MA crosses below Long MA
            if (prevShort > prevLong && currShort < currLong) {
                signals.push({
                    time: shortMA[i].time,
                    type: 'dead',
                });
            }
        }
    }
    
    return signals;
}

// ============================================
// Data Generation (Sample)
// ============================================
function generateSampleTimeSeriesData(days, min, max) {
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    
    let value = (min + max) / 2;
    
    for (let i = days; i >= 0; i--) {
        const time = now - (i * dayInSeconds);
        value += (Math.random() - 0.5) * ((max - min) * 0.1);
        value = Math.max(min, Math.min(max, value));
        
        data.push({
            time: time,
            value: value,
        });
    }
    
    return data;
}

function generateSparklineData(days, min, max) {
    return generateSampleTimeSeriesData(days, min, max);
}

function generateCandlestickData(days, startPrice = 100) {
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const dayInSeconds = 24 * 60 * 60;
    
    let price = startPrice;
    
    for (let i = days; i >= 0; i--) {
        const time = now - (i * dayInSeconds);
        const change = (Math.random() - 0.48) * price * 0.03;
        const volatility = price * 0.02;
        
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;
        const volume = Math.floor(Math.random() * 10000000) + 1000000;
        
        data.push({
            time: time,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume,
        });
        
        price = close;
    }
    
    return data;
}

// Make functions globally accessible
window.initializeCharts = initializeCharts;
window.updateMainChart = updateMainChart;
window.createCandlestickChart = createCandlestickChart;
window.generateCandlestickData = generateCandlestickData;
