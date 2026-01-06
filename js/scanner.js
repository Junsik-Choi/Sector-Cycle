/**
 * Stock Scanner Module
 * 종목 스캐너 모듈 - 여러 종목을 한 번에 스캔하여 신호 상태 요약
 */

const StockScanner = {
    // ============================================
    // Configuration
    // ============================================
    config: {
        defaultTimeframe: 'daily',
        maxConcurrent: 10,
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        pageSize: 20
    },

    // State
    state: {
        scanResults: [],
        sortBy: 'score',
        sortOrder: 'desc',
        filters: {
            market: 'all',
            sector: 'all',
            signal: 'all'
        },
        currentPage: 1,
        isScanning: false
    },

    // Cache
    cache: new Map(),

    // ============================================
    // Initialize
    // ============================================
    init() {
        this.setupEventListeners();
        this.loadUniverse();
    },

    setupEventListeners() {
        // Sort buttons
        document.querySelectorAll('.scanner-sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sortBy = e.target.dataset.sort;
                this.handleSort(sortBy);
            });
        });

        // Filter dropdowns
        document.getElementById('scannerMarketFilter')?.addEventListener('change', (e) => {
            this.state.filters.market = e.target.value;
            this.applyFilters();
        });

        document.getElementById('scannerSectorFilter')?.addEventListener('change', (e) => {
            this.state.filters.sector = e.target.value;
            this.applyFilters();
        });

        document.getElementById('scannerSignalFilter')?.addEventListener('change', (e) => {
            this.state.filters.signal = e.target.value;
            this.applyFilters();
        });

        // Search
        document.getElementById('scannerSearch')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
    },

    // ============================================
    // Data Loading
    // ============================================
    async loadUniverse() {
        try {
            const response = await fetch('./data/universe.json');
            this.universe = await response.json();
            console.log('Universe loaded:', Object.keys(this.universe.stocks).length, 'markets');
        } catch (error) {
            console.error('Failed to load universe:', error);
            this.universe = { stocks: {} };
        }
    },

    async loadSignalsData() {
        try {
            const response = await fetch('./data/signals_latest.json');
            return await response.json();
        } catch (error) {
            console.error('Failed to load signals:', error);
            return null;
        }
    },

    // ============================================
    // Scanning
    // ============================================
    async scanAll(tickers = null) {
        if (this.state.isScanning) return;
        
        this.state.isScanning = true;
        this.showScanningProgress();

        try {
            // Load pre-calculated signals if available
            const signalsData = await this.loadSignalsData();
            
            if (signalsData && signalsData.stocks) {
                this.state.scanResults = this.processSignalsData(signalsData);
            } else {
                // Fallback to demo data
                this.state.scanResults = this.generateDemoResults();
            }

            this.hideScanningProgress();
            this.renderResults();
            
        } catch (error) {
            console.error('Scan error:', error);
            this.hideScanningProgress();
            this.showError('스캔 중 오류가 발생했습니다.');
        } finally {
            this.state.isScanning = false;
        }
    },

    processSignalsData(signalsData) {
        const results = [];
        
        for (const [market, stocks] of Object.entries(signalsData.stocks || {})) {
            for (const [ticker, data] of Object.entries(stocks)) {
                results.push({
                    ticker,
                    name: data.name || ticker,
                    market,
                    sector_l1: data.sector_l1 || 'unknown',
                    sector_l2: data.sector_l2 || 'unknown',
                    price: data.price || 0,
                    change: data.change || 0,
                    changePercent: data.changePercent || 0,
                    score: data.signalScore?.score || 50,
                    fulfillmentRate: data.signalScore?.fulfillmentRate || 0,
                    status: data.signalScore?.status || { label: '중립', type: 'neutral' },
                    signals: data.signalScore?.signals || [],
                    indicators: {
                        rsi: data.rsi?.current,
                        macd: data.macd?.status?.label,
                        maCross: data.maCross?.lastCross?.label,
                        adx: data.adx?.current,
                        bollinger: data.bollinger?.status?.label
                    },
                    lastSignalDate: data.lastSignalDate,
                    vixWarning: signalsData.vix?.warning || false
                });
            }
        }
        
        return results;
    },

    generateDemoResults() {
        const results = [];
        const universe = this.universe?.stocks || {};
        
        for (const [market, stocks] of Object.entries(universe)) {
            for (const [ticker, meta] of Object.entries(stocks)) {
                // Generate random but realistic demo data
                const score = Math.floor(Math.random() * 60) + 20;
                const rsi = Math.floor(Math.random() * 60) + 20;
                const adx = Math.floor(Math.random() * 40) + 10;
                const change = (Math.random() - 0.5) * 10;
                
                let status = { label: '관찰', type: 'neutral' };
                if (score >= 70) status = { label: '우호', type: 'bullish' };
                else if (score >= 55) status = { label: '양호', type: 'positive' };
                else if (score <= 30) status = { label: '경고', type: 'bearish' };
                else if (score <= 45) status = { label: '주의', type: 'negative' };
                
                let rsiStatus = 'neutral';
                if (rsi >= 70) rsiStatus = 'overbought';
                else if (rsi <= 30) rsiStatus = 'oversold';
                
                const maStatus = Math.random() > 0.5 ? '상승 우세' : '하락 우세';
                const macdStatus = Math.random() > 0.5 ? '모멘텀 강화' : '모멘텀 약화';
                
                results.push({
                    ticker,
                    name: meta.name,
                    market,
                    sector_l1: meta.sector_l1,
                    sector_l2: meta.sector_l2,
                    price: market === 'kr' ? Math.floor(Math.random() * 500000) + 10000 : Math.floor(Math.random() * 500) + 50,
                    change,
                    changePercent: change,
                    score,
                    fulfillmentRate: Math.floor(Math.random() * 60) + 20,
                    status,
                    signals: [
                        { name: 'RSI', status: `${rsi}`, positive: rsi > 50 },
                        { name: 'MA', status: maStatus, positive: maStatus === '상승 우세' },
                        { name: 'MACD', status: macdStatus, positive: macdStatus === '모멘텀 강화' }
                    ],
                    indicators: {
                        rsi,
                        rsiStatus,
                        macd: macdStatus,
                        maCross: maStatus,
                        adx,
                        bollinger: Math.random() > 0.8 ? '스퀴즈' : '정상'
                    },
                    lastSignalDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    vixWarning: false
                });
            }
        }
        
        return results;
    },

    // ============================================
    // Filtering & Sorting
    // ============================================
    handleSort(sortBy) {
        if (this.state.sortBy === sortBy) {
            this.state.sortOrder = this.state.sortOrder === 'desc' ? 'asc' : 'desc';
        } else {
            this.state.sortBy = sortBy;
            this.state.sortOrder = 'desc';
        }
        
        this.renderResults();
        this.updateSortButtons();
    },

    applyFilters() {
        this.state.currentPage = 1;
        this.renderResults();
    },

    handleSearch(query) {
        this.state.searchQuery = query.toLowerCase();
        this.state.currentPage = 1;
        this.renderResults();
    },

    getFilteredAndSortedResults() {
        let results = [...this.state.scanResults];
        
        // Apply filters
        const { market, sector, signal } = this.state.filters;
        
        if (market !== 'all') {
            results = results.filter(r => r.market === market);
        }
        
        if (sector !== 'all') {
            results = results.filter(r => r.sector_l1 === sector);
        }
        
        if (signal !== 'all') {
            if (signal === 'bullish') {
                results = results.filter(r => r.status.type === 'bullish' || r.status.type === 'positive');
            } else if (signal === 'bearish') {
                results = results.filter(r => r.status.type === 'bearish' || r.status.type === 'negative');
            } else if (signal === 'overbought') {
                results = results.filter(r => r.indicators.rsiStatus === 'overbought');
            } else if (signal === 'oversold') {
                results = results.filter(r => r.indicators.rsiStatus === 'oversold');
            } else if (signal === 'golden') {
                results = results.filter(r => r.indicators.maCross?.includes('상승'));
            } else if (signal === 'dead') {
                results = results.filter(r => r.indicators.maCross?.includes('하락'));
            }
        }
        
        // Apply search
        if (this.state.searchQuery) {
            results = results.filter(r => 
                r.ticker.toLowerCase().includes(this.state.searchQuery) ||
                r.name.toLowerCase().includes(this.state.searchQuery)
            );
        }
        
        // Apply sorting
        const { sortBy, sortOrder } = this.state;
        results.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'score':
                    comparison = a.score - b.score;
                    break;
                case 'fulfillment':
                    comparison = a.fulfillmentRate - b.fulfillmentRate;
                    break;
                case 'rsi':
                    comparison = (a.indicators.rsi || 0) - (b.indicators.rsi || 0);
                    break;
                case 'adx':
                    comparison = (a.indicators.adx || 0) - (b.indicators.adx || 0);
                    break;
                case 'change':
                    comparison = a.changePercent - b.changePercent;
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                default:
                    comparison = a.score - b.score;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        return results;
    },

    // ============================================
    // Rendering
    // ============================================
    renderResults() {
        const container = document.getElementById('scannerResults');
        if (!container) return;
        
        const results = this.getFilteredAndSortedResults();
        const { currentPage } = this.state;
        const { pageSize } = this.config;
        
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pageResults = results.slice(startIdx, endIdx);
        
        // Update summary
        this.updateSummary(results);
        
        if (pageResults.length === 0) {
            container.innerHTML = `
                <div class="scanner-empty">
                    <span class="empty-icon">📊</span>
                    <p>조건에 맞는 종목이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pageResults.map(result => this.renderResultRow(result)).join('');
        
        // Render pagination
        this.renderPagination(results.length);
    },

    renderResultRow(result) {
        const changeClass = result.changePercent >= 0 ? 'positive' : 'negative';
        const changeSign = result.changePercent >= 0 ? '+' : '';
        const statusClass = this.getStatusClass(result.status.type);
        const priceDisplay = result.market === 'kr' 
            ? `₩${result.price.toLocaleString()}` 
            : `$${result.price.toFixed(2)}`;
        
        const signalBadges = result.signals.slice(0, 3).map(sig => {
            const badgeClass = sig.positive === true ? 'positive' : sig.positive === false ? 'negative' : 'neutral';
            return `<span class="signal-badge ${badgeClass}">${sig.name}: ${sig.status}</span>`;
        }).join('');
        
        const vixWarningBadge = result.vixWarning 
            ? '<span class="vix-warning-badge">⚠️ 변동성 높음</span>' 
            : '';
        
        return `
            <div class="scanner-row" data-ticker="${result.ticker}" onclick="StockScanner.showDetail('${result.ticker}', '${result.market}')">
                <div class="scanner-cell ticker-cell">
                    <span class="ticker">${result.ticker}</span>
                    <span class="name">${result.name}</span>
                    <span class="sector-tag">${this.getSectorName(result.sector_l1)}</span>
                </div>
                <div class="scanner-cell price-cell">
                    <span class="price">${priceDisplay}</span>
                    <span class="change ${changeClass}">${changeSign}${result.changePercent.toFixed(2)}%</span>
                </div>
                <div class="scanner-cell score-cell">
                    <div class="score-bar-container">
                        <div class="score-bar" style="width: ${result.score}%"></div>
                        <span class="score-value">${result.score}</span>
                    </div>
                    <span class="status-label ${statusClass}">${result.status.label}</span>
                </div>
                <div class="scanner-cell fulfillment-cell">
                    <span class="fulfillment-value">${result.fulfillmentRate}%</span>
                    <span class="fulfillment-detail">(${result.signals.filter(s => s.positive).length}/${result.signals.length})</span>
                </div>
                <div class="scanner-cell signals-cell">
                    ${signalBadges}
                    ${vixWarningBadge}
                </div>
                <div class="scanner-cell indicators-cell">
                    <span class="indicator-mini">RSI: ${result.indicators.rsi || 'N/A'}</span>
                    <span class="indicator-mini">ADX: ${result.indicators.adx?.toFixed(0) || 'N/A'}</span>
                </div>
            </div>
        `;
    },

    getStatusClass(type) {
        const classMap = {
            bullish: 'status-bullish',
            positive: 'status-positive',
            neutral: 'status-neutral',
            negative: 'status-negative',
            bearish: 'status-bearish'
        };
        return classMap[type] || 'status-neutral';
    },

    getSectorName(sectorId) {
        const sectorNames = {
            technology: '기술',
            financials: '금융',
            healthcare: '헬스케어',
            consumerDiscretionary: '임의소비재',
            industrials: '산업재',
            energy: '에너지',
            materials: '소재',
            utilities: '유틸리티',
            realEstate: '부동산',
            consumerStaples: '필수소비재',
            communication: '통신'
        };
        return sectorNames[sectorId] || sectorId;
    },

    updateSummary(results) {
        const summaryEl = document.getElementById('scannerSummary');
        if (!summaryEl) return;
        
        const bullish = results.filter(r => r.status.type === 'bullish' || r.status.type === 'positive').length;
        const bearish = results.filter(r => r.status.type === 'bearish' || r.status.type === 'negative').length;
        const neutral = results.length - bullish - bearish;
        const avgScore = results.length > 0 
            ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
            : 0;
        
        summaryEl.innerHTML = `
            <div class="summary-stat">
                <span class="stat-value">${results.length}</span>
                <span class="stat-label">종목</span>
            </div>
            <div class="summary-stat bullish">
                <span class="stat-value">${bullish}</span>
                <span class="stat-label">우호/양호</span>
            </div>
            <div class="summary-stat neutral">
                <span class="stat-value">${neutral}</span>
                <span class="stat-label">관찰</span>
            </div>
            <div class="summary-stat bearish">
                <span class="stat-value">${bearish}</span>
                <span class="stat-label">경고/주의</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${avgScore}</span>
                <span class="stat-label">평균 점수</span>
            </div>
        `;
    },

    renderPagination(totalItems) {
        const container = document.getElementById('scannerPagination');
        if (!container) return;
        
        const totalPages = Math.ceil(totalItems / this.config.pageSize);
        const { currentPage } = this.state;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="StockScanner.goToPage(${currentPage - 1})">‹</button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="StockScanner.goToPage(${i})">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<span class="page-ellipsis">...</span>`;
            }
        }
        
        // Next button
        html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="StockScanner.goToPage(${currentPage + 1})">›</button>`;
        
        container.innerHTML = html;
    },

    goToPage(page) {
        this.state.currentPage = page;
        this.renderResults();
    },

    updateSortButtons() {
        document.querySelectorAll('.scanner-sort-btn').forEach(btn => {
            btn.classList.remove('active', 'asc', 'desc');
            if (btn.dataset.sort === this.state.sortBy) {
                btn.classList.add('active', this.state.sortOrder);
            }
        });
    },

    // ============================================
    // Detail View
    // ============================================
    showDetail(ticker, market) {
        const result = this.state.scanResults.find(r => r.ticker === ticker && r.market === market);
        if (!result) return;
        
        const modal = document.getElementById('scannerDetailModal');
        if (!modal) return;
        
        const priceDisplay = market === 'kr' 
            ? `₩${result.price.toLocaleString()}` 
            : `$${result.price.toFixed(2)}`;
        const changeClass = result.changePercent >= 0 ? 'positive' : 'negative';
        const changeSign = result.changePercent >= 0 ? '+' : '';
        
        modal.innerHTML = `
            <div class="modal-overlay" onclick="StockScanner.closeDetail()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="StockScanner.closeDetail()">×</button>
                    
                    <div class="detail-header">
                        <div class="detail-title">
                            <h3>${result.name}</h3>
                            <span class="detail-ticker">${result.ticker}</span>
                            <span class="detail-market">${market.toUpperCase()}</span>
                        </div>
                        <div class="detail-price">
                            <span class="price">${priceDisplay}</span>
                            <span class="change ${changeClass}">${changeSign}${result.changePercent.toFixed(2)}%</span>
                        </div>
                    </div>
                    
                    <div class="detail-score-section">
                        <div class="score-display">
                            <div class="score-circle ${this.getStatusClass(result.status.type)}">
                                <span class="score-number">${result.score}</span>
                            </div>
                            <div class="score-info">
                                <span class="status-label">${result.status.label}</span>
                                <span class="fulfillment">신호 충족률: ${result.fulfillmentRate}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-signals">
                        <h4>📊 신호 상세</h4>
                        <div class="signals-grid">
                            ${result.signals.map(sig => `
                                <div class="signal-item ${sig.positive === true ? 'positive' : sig.positive === false ? 'negative' : 'neutral'}">
                                    <span class="signal-name">${sig.name}</span>
                                    <span class="signal-value">${sig.status}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-indicators">
                        <h4>📉 기술적 지표</h4>
                        <div class="indicators-grid">
                            <div class="indicator-item">
                                <span class="indicator-label">RSI (14)</span>
                                <span class="indicator-value">${result.indicators.rsi || 'N/A'}</span>
                                <div class="indicator-bar">
                                    <div class="bar-fill rsi" style="width: ${result.indicators.rsi || 0}%"></div>
                                    <div class="bar-markers">
                                        <span style="left: 30%">30</span>
                                        <span style="left: 70%">70</span>
                                    </div>
                                </div>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-label">MACD</span>
                                <span class="indicator-value">${result.indicators.macd || 'N/A'}</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-label">MA 크로스</span>
                                <span class="indicator-value">${result.indicators.maCross || 'N/A'}</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-label">ADX (14)</span>
                                <span class="indicator-value">${result.indicators.adx?.toFixed(1) || 'N/A'}</span>
                                <div class="indicator-bar">
                                    <div class="bar-fill adx" style="width: ${Math.min((result.indicators.adx || 0) * 2, 100)}%"></div>
                                    <div class="bar-markers">
                                        <span style="left: 40%">20</span>
                                        <span style="left: 50%">25</span>
                                    </div>
                                </div>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-label">볼린저밴드</span>
                                <span class="indicator-value">${result.indicators.bollinger || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${result.vixWarning ? `
                        <div class="detail-warning">
                            ⚠️ <strong>변동성 경고:</strong> 현재 VIX가 높아 시장 변동성이 큽니다. 
                            모든 신호는 추가적인 주의가 필요합니다.
                        </div>
                    ` : ''}
                    
                    <div class="detail-disclaimer">
                        ⚠️ 본 정보는 참고용이며 투자 조언이 아닙니다. 모든 투자 결정과 손익은 본인 책임입니다.
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn-chart" onclick="viewStockChart('${ticker}', '${market}')">
                            📊 차트 보기
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    },

    closeDetail() {
        const modal = document.getElementById('scannerDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // ============================================
    // Progress & Error
    // ============================================
    showScanningProgress() {
        const container = document.getElementById('scannerResults');
        if (container) {
            container.innerHTML = `
                <div class="scanner-loading">
                    <div class="loading-spinner"></div>
                    <p>종목 스캔 중...</p>
                </div>
            `;
        }
    },

    hideScanningProgress() {
        // Will be replaced by renderResults
    },

    showError(message) {
        const container = document.getElementById('scannerResults');
        if (container) {
            container.innerHTML = `
                <div class="scanner-error">
                    <span class="error-icon">❌</span>
                    <p>${message}</p>
                    <button onclick="StockScanner.scanAll()">다시 시도</button>
                </div>
            `;
        }
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    StockScanner.init();
});
