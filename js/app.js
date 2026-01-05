/**
 * Sector Cycle Dashboard - Main Application
 * 경기/업황/리스크 지표 대시보드
 */

// ============================================
// Configuration & Constants
// ============================================
const CONFIG = {
    dataPath: './data/',
    refreshInterval: 300000, // 5 minutes
    dateFormat: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
};

// Sector definitions with stocks
const SECTORS = {
    technology: {
        name: 'Technology',
        nameKr: '기술/IT',
        icon: '💻',
        cycle: 'expansion',
        stocks: {
            us: [
                { ticker: 'AAPL', name: 'Apple Inc.' },
                { ticker: 'MSFT', name: 'Microsoft' },
                { ticker: 'GOOGL', name: 'Alphabet' },
                { ticker: 'NVDA', name: 'NVIDIA' },
                { ticker: 'META', name: 'Meta Platforms' },
                { ticker: 'AMD', name: 'AMD' },
                { ticker: 'INTC', name: 'Intel' },
                { ticker: 'CRM', name: 'Salesforce' }
            ],
            kr: [
                { ticker: '005930', name: '삼성전자' },
                { ticker: '000660', name: 'SK하이닉스' },
                { ticker: '035420', name: 'NAVER' },
                { ticker: '035720', name: '카카오' },
                { ticker: '006400', name: '삼성SDI' },
                { ticker: '373220', name: 'LG에너지솔루션' }
            ]
        }
    },
    financials: {
        name: 'Financials',
        nameKr: '금융',
        icon: '🏦',
        cycle: 'recovery',
        stocks: {
            us: [
                { ticker: 'JPM', name: 'JPMorgan Chase' },
                { ticker: 'BAC', name: 'Bank of America' },
                { ticker: 'WFC', name: 'Wells Fargo' },
                { ticker: 'GS', name: 'Goldman Sachs' },
                { ticker: 'MS', name: 'Morgan Stanley' },
                { ticker: 'V', name: 'Visa' },
                { ticker: 'MA', name: 'Mastercard' }
            ],
            kr: [
                { ticker: '105560', name: 'KB금융' },
                { ticker: '055550', name: '신한지주' },
                { ticker: '086790', name: '하나금융지주' },
                { ticker: '316140', name: '우리금융지주' },
                { ticker: '032830', name: '삼성생명' }
            ]
        }
    },
    healthcare: {
        name: 'Healthcare',
        nameKr: '헬스케어',
        icon: '🏥',
        cycle: 'recovery',
        stocks: {
            us: [
                { ticker: 'JNJ', name: 'Johnson & Johnson' },
                { ticker: 'UNH', name: 'UnitedHealth' },
                { ticker: 'PFE', name: 'Pfizer' },
                { ticker: 'ABBV', name: 'AbbVie' },
                { ticker: 'MRK', name: 'Merck' },
                { ticker: 'LLY', name: 'Eli Lilly' }
            ],
            kr: [
                { ticker: '207940', name: '삼성바이오로직스' },
                { ticker: '068270', name: '셀트리온' },
                { ticker: '326030', name: 'SK바이오팜' },
                { ticker: '091990', name: '셀트리온헬스케어' }
            ]
        }
    },
    consumerDiscretionary: {
        name: 'Consumer Discretionary',
        nameKr: '임의소비재',
        icon: '🛍️',
        cycle: 'expansion',
        stocks: {
            us: [
                { ticker: 'AMZN', name: 'Amazon' },
                { ticker: 'TSLA', name: 'Tesla' },
                { ticker: 'HD', name: 'Home Depot' },
                { ticker: 'NKE', name: 'Nike' },
                { ticker: 'SBUX', name: 'Starbucks' },
                { ticker: 'MCD', name: 'McDonalds' }
            ],
            kr: [
                { ticker: '028260', name: '삼성물산' },
                { ticker: '004020', name: '현대제철' },
                { ticker: '012330', name: '현대모비스' },
                { ticker: '000270', name: '기아' }
            ]
        }
    },
    industrials: {
        name: 'Industrials',
        nameKr: '산업재',
        icon: '🏭',
        cycle: 'expansion',
        stocks: {
            us: [
                { ticker: 'CAT', name: 'Caterpillar' },
                { ticker: 'BA', name: 'Boeing' },
                { ticker: 'HON', name: 'Honeywell' },
                { ticker: 'UPS', name: 'UPS' },
                { ticker: 'GE', name: 'GE Aerospace' },
                { ticker: 'LMT', name: 'Lockheed Martin' }
            ],
            kr: [
                { ticker: '009540', name: '한국조선해양' },
                { ticker: '042660', name: '한화오션' },
                { ticker: '010140', name: '삼성중공업' },
                { ticker: '034020', name: '두산에너빌리티' }
            ]
        }
    },
    energy: {
        name: 'Energy',
        nameKr: '에너지',
        icon: '⚡',
        cycle: 'slowdown',
        stocks: {
            us: [
                { ticker: 'XOM', name: 'Exxon Mobil' },
                { ticker: 'CVX', name: 'Chevron' },
                { ticker: 'COP', name: 'ConocoPhillips' },
                { ticker: 'SLB', name: 'Schlumberger' },
                { ticker: 'OXY', name: 'Occidental' }
            ],
            kr: [
                { ticker: '096770', name: 'SK이노베이션' },
                { ticker: '010950', name: 'S-Oil' },
                { ticker: '267250', name: 'HD현대' }
            ]
        }
    },
    materials: {
        name: 'Materials',
        nameKr: '소재',
        icon: '🧱',
        cycle: 'slowdown',
        stocks: {
            us: [
                { ticker: 'LIN', name: 'Linde' },
                { ticker: 'APD', name: 'Air Products' },
                { ticker: 'SHW', name: 'Sherwin-Williams' },
                { ticker: 'FCX', name: 'Freeport-McMoRan' },
                { ticker: 'NEM', name: 'Newmont' }
            ],
            kr: [
                { ticker: '005490', name: 'POSCO홀딩스' },
                { ticker: '051910', name: 'LG화학' },
                { ticker: '010130', name: '고려아연' }
            ]
        }
    },
    utilities: {
        name: 'Utilities',
        nameKr: '유틸리티',
        icon: '💡',
        cycle: 'recovery',
        stocks: {
            us: [
                { ticker: 'NEE', name: 'NextEra Energy' },
                { ticker: 'DUK', name: 'Duke Energy' },
                { ticker: 'SO', name: 'Southern Company' },
                { ticker: 'D', name: 'Dominion Energy' }
            ],
            kr: [
                { ticker: '015760', name: '한국전력' },
                { ticker: '036460', name: '한국가스공사' }
            ]
        }
    },
    realEstate: {
        name: 'Real Estate',
        nameKr: '부동산',
        icon: '🏢',
        cycle: 'contraction',
        stocks: {
            us: [
                { ticker: 'PLD', name: 'Prologis' },
                { ticker: 'AMT', name: 'American Tower' },
                { ticker: 'EQIX', name: 'Equinix' },
                { ticker: 'SPG', name: 'Simon Property' }
            ],
            kr: [
                { ticker: '000720', name: '현대건설' },
                { ticker: '000210', name: '대림산업' }
            ]
        }
    },
    consumerStaples: {
        name: 'Consumer Staples',
        nameKr: '필수소비재',
        icon: '🛒',
        cycle: 'normal',
        stocks: {
            us: [
                { ticker: 'PG', name: 'Procter & Gamble' },
                { ticker: 'KO', name: 'Coca-Cola' },
                { ticker: 'PEP', name: 'PepsiCo' },
                { ticker: 'WMT', name: 'Walmart' },
                { ticker: 'COST', name: 'Costco' }
            ],
            kr: [
                { ticker: '051900', name: 'LG생활건강' },
                { ticker: '090430', name: '아모레퍼시픽' },
                { ticker: '004990', name: '롯데지주' }
            ]
        }
    },
    communication: {
        name: 'Communication',
        nameKr: '커뮤니케이션',
        icon: '📡',
        cycle: 'expansion',
        stocks: {
            us: [
                { ticker: 'GOOG', name: 'Alphabet' },
                { ticker: 'META', name: 'Meta' },
                { ticker: 'NFLX', name: 'Netflix' },
                { ticker: 'DIS', name: 'Disney' },
                { ticker: 'VZ', name: 'Verizon' },
                { ticker: 'T', name: 'AT&T' }
            ],
            kr: [
                { ticker: '017670', name: 'SK텔레콤' },
                { ticker: '030200', name: 'KT' },
                { ticker: '032640', name: 'LG유플러스' }
            ]
        }
    }
};

// ============================================
// State Management
// ============================================
let state = {
    currentTab: 'overview',
    latestData: null,
    historyData: null,
    selectedSector: null,
    selectedStock: null,
    chartInstance: null
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    console.log('🚀 Initializing Sector Cycle Dashboard...');
    
    // Setup event listeners
    setupNavigation();
    setupChartControls();
    setupTimeframeButtons();
    
    // Load initial data
    await loadData();
    
    // Render components
    renderSectorsGrid();
    initializeCharts();
    
    // Update timestamp
    updateLastUpdateTime();
    
    // Setup auto-refresh
    setInterval(refreshData, CONFIG.refreshInterval);
    
    console.log('✅ Dashboard initialized successfully');
}

// ============================================
// Data Loading
// ============================================
async function loadData() {
    try {
        const [latestRes, historyRes] = await Promise.all([
            fetch(`${CONFIG.dataPath}latest.json`),
            fetch(`${CONFIG.dataPath}history.json`)
        ]);
        
        if (latestRes.ok) {
            state.latestData = await latestRes.json();
            updateDashboardCards(state.latestData);
        }
        
        if (historyRes.ok) {
            state.historyData = await historyRes.json();
        }
    } catch (error) {
        console.warn('📦 Using sample data (API data not available):', error.message);
        loadSampleData();
    }
}

function loadSampleData() {
    // Sample data for demonstration
    state.latestData = {
        timestamp: new Date().toISOString(),
        macro: {
            regime: 'expansion',
            score: 72,
            cli: { us: 100.8, korea: 100.2, china: 99.5 },
            pmi: { manufacturing: 52.3, services: 54.1 }
        },
        risk: {
            vix: 18.5,
            vixChange: -2.3,
            regime: 'normal',
            range52w: { low: 12.1, high: 35.2 }
        },
        trade: {
            bdi: 1842,
            bdiChange: 5.2,
            wci: 2156,
            regime: 'recovery'
        },
        commodity: {
            index: 124.5,
            energy: -3.1,
            food: 1.8,
            regime: 'contraction'
        },
        oil: {
            price: 72.4,
            inventory: 2.1,
            vs5yAvg: -3.2,
            regime: 'normal'
        },
        korea: {
            kospi: 2645,
            kospiChange: 0.8,
            foreignNet: 'buy',
            regime: 'expansion'
        }
    };
    
    updateDashboardCards(state.latestData);
}

function updateDashboardCards(data) {
    if (!data) return;
    
    // Update Macro card
    if (data.macro) {
        updateElement('macroRegime', data.macro.regime, `regime-label ${data.macro.regime}`);
        updateElement('macroScore', data.macro.score);
        updateElement('cliValue', data.macro.cli?.us?.toFixed(1) || 'N/A');
        updateElement('pmiValue', data.macro.pmi?.manufacturing?.toFixed(1) || 'N/A');
    }
    
    // Update Risk/VIX card
    if (data.risk) {
        updateElement('riskRegime', data.risk.regime, `regime-label ${data.risk.regime}`);
        updateElement('vixValue', data.risk.vix?.toFixed(1) || 'N/A');
        updateElement('vixChange', formatChange(data.risk.vixChange), 
            `metric-value ${data.risk.vixChange >= 0 ? 'positive' : 'negative'}`);
        updateVixGauge(data.risk.vix);
    }
    
    // Update Trade card
    if (data.trade) {
        updateElement('tradeRegime', data.trade.regime, `regime-label ${data.trade.regime}`);
        updateElement('bdiValue', formatNumber(data.trade.bdi));
        updateElement('bdiChange', formatChange(data.trade.bdiChange),
            `metric-value ${data.trade.bdiChange >= 0 ? 'positive' : 'negative'}`);
        updateElement('wciValue', formatNumber(data.trade.wci));
    }
    
    // Update Commodity card
    if (data.commodity) {
        updateElement('commodityRegime', data.commodity.regime === 'contraction' ? 'Pressure' : data.commodity.regime,
            `regime-label ${data.commodity.regime}`);
        updateElement('commodityIndex', data.commodity.index?.toFixed(1) || 'N/A');
    }
    
    // Update Oil card
    if (data.oil) {
        updateElement('oilRegime', data.oil.regime === 'normal' ? 'Balanced' : data.oil.regime,
            `regime-label ${data.oil.regime}`);
        updateElement('oilPrice', `$${data.oil.price?.toFixed(1) || 'N/A'}`);
        updateElement('oilInventory', `${data.oil.inventory >= 0 ? '+' : ''}${data.oil.inventory?.toFixed(1) || 'N/A'}M bbl`);
    }
    
    // Update Korea card
    if (data.korea) {
        updateElement('koreaRegime', data.korea.regime === 'expansion' ? 'Risk-On' : data.korea.regime,
            `regime-label ${data.korea.regime}`);
        updateElement('kospiValue', formatNumber(data.korea.kospi));
    }
}

function updateElement(id, value, className = null) {
    const el = document.getElementById(id);
    if (el) {
        if (value !== undefined && value !== null) {
            el.textContent = typeof value === 'string' ? capitalizeFirst(value) : value;
        }
        if (className) {
            el.className = className;
        }
    }
}

function updateVixGauge(vix) {
    const gauge = document.querySelector('.gauge-fill');
    if (gauge && vix) {
        const percentage = Math.min((vix / 50) * 100, 100);
        gauge.style.width = `${percentage}%`;
    }
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
    
    state.currentTab = tabId;
    
    // Initialize tab-specific components
    if (tabId === 'stocks') {
        initTradingViewWidget();
    }
}

// ============================================
// Sectors Grid
// ============================================
function renderSectorsGrid() {
    const grid = document.getElementById('sectorsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    Object.entries(SECTORS).forEach(([key, sector]) => {
        const card = document.createElement('div');
        card.className = 'sector-card';
        card.onclick = () => showSectorDetail(key);
        
        const cycleClass = sector.cycle;
        const stockCount = (sector.stocks.us?.length || 0) + (sector.stocks.kr?.length || 0);
        
        card.innerHTML = `
            <div class="sector-card-header">
                <span class="sector-icon">${sector.icon}</span>
                <span class="sector-name">${sector.name}</span>
            </div>
            <div class="sector-korean">${sector.nameKr}</div>
            <div class="sector-status">
                <span class="sector-cycle regime-label ${cycleClass}">${capitalizeFirst(sector.cycle)}</span>
                <span class="sector-stocks-count">${stockCount} stocks</span>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function showSectorDetail(sectorKey) {
    const sector = SECTORS[sectorKey];
    if (!sector) return;
    
    state.selectedSector = sectorKey;
    
    const detail = document.getElementById('sectorDetail');
    const title = document.getElementById('sectorDetailTitle');
    const stocksList = document.getElementById('sectorStocksList');
    
    if (!detail || !title || !stocksList) return;
    
    title.textContent = `${sector.icon} ${sector.name} (${sector.nameKr})`;
    
    stocksList.innerHTML = '';
    
    // US Stocks
    if (sector.stocks.us?.length) {
        const usHeader = document.createElement('h4');
        usHeader.textContent = '🇺🇸 US Stocks';
        usHeader.style.cssText = 'grid-column: 1 / -1; margin: 16px 0 8px; color: var(--text-secondary);';
        stocksList.appendChild(usHeader);
        
        sector.stocks.us.forEach(stock => {
            stocksList.appendChild(createStockItem(stock, 'US'));
        });
    }
    
    // Korean Stocks
    if (sector.stocks.kr?.length) {
        const krHeader = document.createElement('h4');
        krHeader.textContent = '🇰🇷 Korean Stocks';
        krHeader.style.cssText = 'grid-column: 1 / -1; margin: 16px 0 8px; color: var(--text-secondary);';
        stocksList.appendChild(krHeader);
        
        sector.stocks.kr.forEach(stock => {
            stocksList.appendChild(createStockItem(stock, 'KR'));
        });
    }
    
    detail.style.display = 'block';
}

function createStockItem(stock, market) {
    const item = document.createElement('div');
    item.className = 'stock-item';
    item.onclick = () => openStockChart(stock.ticker, stock.name, market);
    
    const flag = market === 'US' ? '🇺🇸' : '🇰🇷';
    
    item.innerHTML = `
        <span class="stock-flag">${flag}</span>
        <div class="stock-info-mini">
            <div class="ticker">${stock.ticker}</div>
            <div class="name">${stock.name}</div>
        </div>
    `;
    
    return item;
}

function closeSectorDetail() {
    const detail = document.getElementById('sectorDetail');
    if (detail) {
        detail.style.display = 'none';
    }
    state.selectedSector = null;
}

// ============================================
// Stock Chart Functions
// ============================================
function openStockChart(ticker, name, market) {
    state.selectedStock = { ticker, name, market };
    
    // Switch to stocks tab
    switchTab('stocks');
    
    // Update stock info
    document.getElementById('stockName').textContent = name;
    document.getElementById('stockTicker').textContent = ticker;
    
    // Load TradingView widget
    setTimeout(() => initTradingViewWidget(ticker, market), 100);
}

function searchStock() {
    const input = document.getElementById('stockSearch');
    const query = input.value.trim().toUpperCase();
    
    if (!query) return;
    
    // Simple search - check if it's a known ticker
    let found = false;
    let market = 'US';
    let stockName = query;
    
    // Search in sectors
    for (const [key, sector] of Object.entries(SECTORS)) {
        const usStock = sector.stocks.us?.find(s => s.ticker.toUpperCase() === query);
        if (usStock) {
            found = true;
            market = 'US';
            stockName = usStock.name;
            break;
        }
        
        const krStock = sector.stocks.kr?.find(s => s.ticker === query);
        if (krStock) {
            found = true;
            market = 'KR';
            stockName = krStock.name;
            break;
        }
    }
    
    // Default behavior - try to load anyway
    openStockChart(query, stockName, found ? market : (query.match(/^\d+$/) ? 'KR' : 'US'));
}

// ============================================
// Chart Controls
// ============================================
function setupChartControls() {
    const indicatorSelect = document.getElementById('indicatorSelect');
    if (indicatorSelect) {
        indicatorSelect.addEventListener('change', (e) => {
            updateMainChart(e.target.value);
        });
    }
}

function setupTimeframeButtons() {
    // Main chart timeframes
    document.querySelectorAll('.main-chart-section .tf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.main-chart-section .tf-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateMainChartRange(e.target.dataset.range);
        });
    });
    
    // Stock chart timeframes
    document.querySelectorAll('.timeframe-selector .tf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.timeframe-selector .tf-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateStockChartInterval(e.target.dataset.interval);
        });
    });
}

function updateMainChartRange(range) {
    // Update chart with new range
    console.log('Updating chart range to:', range);
    initializeCharts();
}

function updateStockChartInterval(interval) {
    // Re-initialize TradingView widget with new interval
    if (state.selectedStock) {
        initTradingViewWidget(state.selectedStock.ticker, state.selectedStock.market, interval);
    }
}

// ============================================
// Utility Functions
// ============================================
function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString();
}

function formatChange(value) {
    if (value === null || value === undefined) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateLastUpdateTime() {
    const el = document.getElementById('lastUpdateTime');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleString('en-US', CONFIG.dateFormat);
    }
}

async function refreshData() {
    console.log('🔄 Refreshing data...');
    await loadData();
    updateLastUpdateTime();
}

// Make functions globally accessible
window.refreshData = refreshData;
window.searchStock = searchStock;
window.closeSectorDetail = closeSectorDetail;
