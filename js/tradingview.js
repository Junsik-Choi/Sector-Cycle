/**
 * TradingView Widget Integration
 * Real-time stock charts with multiple timeframes
 */

// ============================================
// TradingView Widget Configuration
// ============================================
let tvWidget = null;

function initTradingViewWidget(symbol = 'AAPL', market = 'US', interval = 'D') {
    const container = document.getElementById('tradingviewWidget');
    if (!container) return;
    
    // Clear existing widget
    container.innerHTML = '';
    
    // Format symbol based on market
    let formattedSymbol;
    if (market === 'KR') {
        formattedSymbol = `KRX:${symbol}`;
    } else {
        formattedSymbol = `NASDAQ:${symbol}`;
        // Try to detect exchange
        if (['JPM', 'BAC', 'WFC', 'GS', 'MS', 'XOM', 'CVX', 'JNJ', 'PG', 'KO', 'WMT', 'V', 'MA', 'HD', 'DIS', 'VZ', 'T', 'PFE', 'MRK', 'CAT', 'BA', 'HON', 'UPS', 'GE', 'LMT'].includes(symbol)) {
            formattedSymbol = `NYSE:${symbol}`;
        }
    }
    
    // Map interval to TradingView format
    const intervalMap = {
        '10': '10',
        '30': '30',
        '60': '60',
        '180': '180',
        'D': 'D',
        'W': 'W',
        'M': 'M'
    };
    
    const tvInterval = intervalMap[interval] || 'D';
    
    // Create TradingView widget
    const widgetOptions = {
        autosize: true,
        symbol: formattedSymbol,
        interval: tvInterval,
        timezone: "Asia/Seoul",
        theme: "dark",
        style: "1", // Candlestick
        locale: "kr",
        toolbar_bg: "#1c2128",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingviewWidget",
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        studies: [
            "MASimple@tv-basicstudies",  // MA
            "MAExp@tv-basicstudies",     // EMA
            "RSI@tv-basicstudies",       // RSI
            "MACD@tv-basicstudies",      // MACD
            "BB@tv-basicstudies"         // Bollinger Bands
        ],
        studies_overrides: {
            "moving average.length": 20,
            "moving average.plot.color": "#58a6ff",
            "moving average exponential.length": 12,
            "moving average exponential.plot.color": "#a371f7",
            "relative strength index.length": 14,
            "relative strength index.plot.color": "#d29922",
            "bollinger bands.length": 20,
        },
        overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#3fb950",
            "mainSeriesProperties.candleStyle.downColor": "#f85149",
            "mainSeriesProperties.candleStyle.borderUpColor": "#3fb950",
            "mainSeriesProperties.candleStyle.borderDownColor": "#f85149",
            "mainSeriesProperties.candleStyle.wickUpColor": "#3fb950",
            "mainSeriesProperties.candleStyle.wickDownColor": "#f85149",
            "paneProperties.background": "#0d1117",
            "paneProperties.vertGridProperties.color": "#21262d",
            "paneProperties.horzGridProperties.color": "#21262d",
            "scalesProperties.textColor": "#8b949e",
        }
    };
    
    // Load TradingView library and create widget
    if (typeof TradingView !== 'undefined') {
        tvWidget = new TradingView.widget(widgetOptions);
    } else {
        // Fallback: Load via script and create advanced chart
        loadTradingViewScript().then(() => {
            createAdvancedChartWidget(container, formattedSymbol, tvInterval);
        });
    }
}

function loadTradingViewScript() {
    return new Promise((resolve, reject) => {
        if (typeof TradingView !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
            console.warn('TradingView script failed to load, using fallback chart');
            resolve(); // Still resolve to use fallback
        };
        document.head.appendChild(script);
    });
}

function createAdvancedChartWidget(container, symbol, interval) {
    // Create TradingView Advanced Chart Widget (embedded)
    container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container" style="height:100%;width:100%">
            <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
            <div class="tradingview-widget-copyright">
                <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
                    <span class="blue-text">Track all markets on TradingView</span>
                </a>
            </div>
        </div>
        <!-- TradingView Widget END -->
    `;
    
    const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
    
    // Create widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: symbol,
        interval: interval,
        timezone: "Asia/Seoul",
        theme: "dark",
        style: "1",
        locale: "kr",
        enable_publishing: false,
        allow_symbol_change: true,
        calendar: false,
        studies: [
            "STD;SMA",
            "STD;EMA", 
            "STD;RSI",
            "STD;MACD",
            "STD;Bollinger_Bands"
        ],
        support_host: "https://www.tradingview.com"
    });
    
    widgetContainer.appendChild(script);
}

// ============================================
// Symbol Info Widget
// ============================================
function createSymbolInfoWidget(containerId, symbol) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget"></div>
        </div>
        <!-- TradingView Widget END -->
    `;
    
    const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        symbol: symbol,
        width: "100%",
        locale: "kr",
        colorTheme: "dark",
        isTransparent: true
    });
    
    widgetContainer.appendChild(script);
}

// ============================================
// Technical Analysis Widget
// ============================================
function createTechnicalAnalysisWidget(containerId, symbol) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget"></div>
        </div>
        <!-- TradingView Widget END -->
    `;
    
    const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        interval: "1D",
        width: "100%",
        isTransparent: true,
        height: 400,
        symbol: symbol,
        showIntervalTabs: true,
        locale: "kr",
        colorTheme: "dark"
    });
    
    widgetContainer.appendChild(script);
}

// ============================================
// Mini Chart Widget
// ============================================
function createMiniChartWidget(containerId, symbol) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget"></div>
        </div>
        <!-- TradingView Widget END -->
    `;
    
    const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        symbol: symbol,
        width: "100%",
        height: "100%",
        locale: "kr",
        dateRange: "1M",
        colorTheme: "dark",
        isTransparent: true,
        autosize: true,
        largeChartUrl: ""
    });
    
    widgetContainer.appendChild(script);
}

// ============================================
// Market Overview Widget
// ============================================
function createMarketOverviewWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget"></div>
        </div>
        <!-- TradingView Widget END -->
    `;
    
    const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        colorTheme: "dark",
        dateRange: "1D",
        showChart: true,
        locale: "kr",
        width: "100%",
        height: "100%",
        largeChartUrl: "",
        isTransparent: true,
        showSymbolLogo: true,
        showFloatingTooltip: true,
        plotLineColorGrowing: "#3fb950",
        plotLineColorFalling: "#f85149",
        gridLineColor: "#21262d",
        scaleFontColor: "#8b949e",
        belowLineFillColorGrowing: "rgba(63, 185, 80, 0.12)",
        belowLineFillColorFalling: "rgba(248, 81, 73, 0.12)",
        belowLineFillColorGrowingBottom: "rgba(63, 185, 80, 0)",
        belowLineFillColorFallingBottom: "rgba(248, 81, 73, 0)",
        symbolActiveColor: "rgba(88, 166, 255, 0.12)",
        tabs: [
            {
                title: "US Market",
                symbols: [
                    { s: "NASDAQ:AAPL", d: "Apple" },
                    { s: "NASDAQ:MSFT", d: "Microsoft" },
                    { s: "NASDAQ:GOOGL", d: "Alphabet" },
                    { s: "NASDAQ:NVDA", d: "NVIDIA" },
                    { s: "NASDAQ:AMZN", d: "Amazon" },
                    { s: "NASDAQ:META", d: "Meta" }
                ]
            },
            {
                title: "Korean Market",
                symbols: [
                    { s: "KRX:005930", d: "삼성전자" },
                    { s: "KRX:000660", d: "SK하이닉스" },
                    { s: "KRX:035420", d: "NAVER" },
                    { s: "KRX:035720", d: "카카오" },
                    { s: "KRX:207940", d: "삼성바이오로직스" }
                ]
            },
            {
                title: "Indices",
                symbols: [
                    { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
                    { s: "FOREXCOM:NSXUSD", d: "NASDAQ 100" },
                    { s: "KRX:KOSPI", d: "KOSPI" },
                    { s: "TVC:VIX", d: "VIX" }
                ]
            }
        ]
    });
    
    widgetContainer.appendChild(script);
}

// ============================================
// Ticker Tape Widget
// ============================================
function createTickerTapeWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
            <div class="tradingview-widget-container__widget"></div>
        </div>
        <!-- TradingView Widget END -->
    `;
    
    const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        symbols: [
            { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
            { proName: "FOREXCOM:NSXUSD", title: "NASDAQ" },
            { proName: "KRX:KOSPI", title: "KOSPI" },
            { proName: "TVC:VIX", title: "VIX" },
            { proName: "NASDAQ:AAPL", title: "Apple" },
            { proName: "NASDAQ:NVDA", title: "NVIDIA" },
            { proName: "KRX:005930", title: "삼성전자" }
        ],
        showSymbolLogo: true,
        colorTheme: "dark",
        isTransparent: true,
        displayMode: "adaptive",
        locale: "kr"
    });
    
    widgetContainer.appendChild(script);
}

// Make functions globally accessible
window.initTradingViewWidget = initTradingViewWidget;
window.createSymbolInfoWidget = createSymbolInfoWidget;
window.createTechnicalAnalysisWidget = createTechnicalAnalysisWidget;
window.createMiniChartWidget = createMiniChartWidget;
window.createMarketOverviewWidget = createMarketOverviewWidget;
window.createTickerTapeWidget = createTickerTapeWidget;
