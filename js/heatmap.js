/**
 * Sector Heatmap Module
 * 섹터 히트맵 모듈 - 섹터별 상태 점수/충족률/경고 시각화
 */

const SectorHeatmap = {
    // ============================================
    // Configuration
    // ============================================
    config: {
        colors: {
            bullish: { bg: '#22c55e', text: '#fff' },
            positive: { bg: '#86efac', text: '#15803d' },
            neutral: { bg: '#6b7280', text: '#fff' },
            negative: { bg: '#fca5a5', text: '#991b1b' },
            bearish: { bg: '#ef4444', text: '#fff' }
        },
        minStocksForSector: 3
    },

    // State
    state: {
        sectors: {},
        selectedLevel: 'l1', // 'l1' or 'l2'
        viewMode: 'heatmap', // 'heatmap' or 'table'
        sortBy: 'score'
    },

    // ============================================
    // Initialize
    // ============================================
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.render();
    },

    async loadData() {
        try {
            // Load sector classification
            const sectorsRes = await fetch('./data/sectors_l2.json');
            this.sectorData = await sectorsRes.json();
            
            // Load signals data
            const signalsRes = await fetch('./data/signals_latest.json');
            this.signalsData = await signalsRes.json();
            
            // Process sector aggregations
            this.aggregateSectorData();
            this.calculateMarketBreadth();
            
        } catch (error) {
            console.error('Failed to load heatmap data:', error);
            this.generateDemoData();
        }
    },

    setupEventListeners() {
        // Level toggle (L1/L2)
        document.querySelectorAll('.btn-toggle[data-level]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.state.selectedLevel = target.dataset.level;
                document.querySelectorAll('.btn-toggle[data-level]').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                this.render();
            });
        });

        // View mode toggle
        document.querySelectorAll('.btn-toggle[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.state.viewMode = target.dataset.view;
                document.querySelectorAll('.btn-toggle[data-view]').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                this.render();
            });
        });

        // Sort selector
        document.getElementById('heatmapSort')?.addEventListener('change', (e) => {
            this.state.sortBy = e.target.value;
            this.render();
        });
    },

    // ============================================
    // Data Processing
    // ============================================
    aggregateSectorData() {
        this.state.sectors = {};
        
        const sectors = this.sectorData?.sectors || {};
        const stockSignals = this.signalsData?.stocks || {};
        
        // Process each L1 sector
        for (const [sectorId, sectorInfo] of Object.entries(sectors)) {
            const l1Data = {
                id: sectorId,
                name: sectorInfo.name,
                nameKr: sectorInfo.nameKr,
                icon: sectorInfo.icon,
                stocks: [],
                l2Sectors: {},
                score: 0,
                fulfillmentRate: 0,
                breadth: {
                    goldenCross: 0,
                    above200MA: 0,
                    oversold: 0,
                    overbought: 0
                }
            };
            
            // Process L2 sectors
            for (const [l2Id, l2Info] of Object.entries(sectorInfo.l2 || {})) {
                const l2Data = {
                    id: l2Id,
                    parentId: sectorId,
                    name: l2Info.name,
                    nameKr: l2Info.nameKr,
                    icon: l2Info.icon,
                    stocks: [],
                    score: 0,
                    fulfillmentRate: 0,
                    breadth: {
                        goldenCross: 0,
                        above200MA: 0,
                        oversold: 0,
                        overbought: 0
                    }
                };
                
                // Collect stocks for this L2 sector
                const allStocks = [...(l2Info.stocks?.us || []), ...(l2Info.stocks?.kr || [])];
                
                for (const ticker of allStocks) {
                    // Find stock signals
                    const signal = this.findStockSignal(ticker, stockSignals);
                    if (signal) {
                        l2Data.stocks.push(signal);
                        l1Data.stocks.push(signal);
                    }
                }
                
                // Calculate L2 metrics
                this.calculateSectorMetrics(l2Data);
                l1Data.l2Sectors[l2Id] = l2Data;
            }
            
            // Calculate L1 metrics
            this.calculateSectorMetrics(l1Data);
            this.state.sectors[sectorId] = l1Data;
        }
    },

    findStockSignal(ticker, stockSignals) {
        // Check US stocks
        if (stockSignals.us?.[ticker]) {
            return { ticker, market: 'us', ...stockSignals.us[ticker] };
        }
        // Check KR stocks
        if (stockSignals.kr?.[ticker]) {
            return { ticker, market: 'kr', ...stockSignals.kr[ticker] };
        }
        return null;
    },

    calculateSectorMetrics(sectorData) {
        const stocks = sectorData.stocks;
        if (stocks.length === 0) {
            sectorData.score = 50;
            sectorData.fulfillmentRate = 0;
            sectorData.status = { label: '데이터 없음', type: 'neutral' };
            return;
        }
        
        // Calculate average score
        const scores = stocks.map(s => s.signalScore?.score || 50);
        sectorData.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        
        // Calculate fulfillment rate
        const fulfillments = stocks.map(s => s.signalScore?.fulfillmentRate || 0);
        sectorData.fulfillmentRate = Math.round(fulfillments.reduce((a, b) => a + b, 0) / fulfillments.length);
        
        // Calculate breadth metrics
        let goldenCross = 0, above200MA = 0, oversold = 0, overbought = 0;
        
        for (const stock of stocks) {
            if (stock.maCross?.lastCross?.type === 'golden') goldenCross++;
            if (stock.maCross?.currentPosition === 'above') above200MA++;
            if (stock.rsi?.status?.type === 'oversold') oversold++;
            if (stock.rsi?.status?.type === 'overbought') overbought++;
        }
        
        const total = stocks.length;
        sectorData.breadth = {
            goldenCross: Math.round((goldenCross / total) * 100),
            above200MA: Math.round((above200MA / total) * 100),
            oversold: Math.round((oversold / total) * 100),
            overbought: Math.round((overbought / total) * 100)
        };
        
        // Determine status
        sectorData.status = this.getStatusFromScore(sectorData.score);
    },

    getStatusFromScore(score) {
        if (score >= 70) return { label: '우호', labelEn: 'Bullish', type: 'bullish' };
        if (score >= 55) return { label: '양호', labelEn: 'Positive', type: 'positive' };
        if (score <= 30) return { label: '경고', labelEn: 'Warning', type: 'bearish' };
        if (score <= 45) return { label: '주의', labelEn: 'Caution', type: 'negative' };
        return { label: '관찰', labelEn: 'Neutral', type: 'neutral' };
    },

    generateDemoData() {
        // Generate demo data when API fails
        const sectorList = [
            { id: 'technology', name: 'Technology', nameKr: '기술/IT', icon: '💻' },
            { id: 'financials', name: 'Financials', nameKr: '금융', icon: '🏦' },
            { id: 'healthcare', name: 'Healthcare', nameKr: '헬스케어', icon: '🏥' },
            { id: 'consumerDiscretionary', name: 'Consumer Disc.', nameKr: '임의소비재', icon: '🛍️' },
            { id: 'industrials', name: 'Industrials', nameKr: '산업재', icon: '🏭' },
            { id: 'energy', name: 'Energy', nameKr: '에너지', icon: '⚡' },
            { id: 'materials', name: 'Materials', nameKr: '소재', icon: '🧱' },
            { id: 'utilities', name: 'Utilities', nameKr: '유틸리티', icon: '💡' },
            { id: 'realEstate', name: 'Real Estate', nameKr: '부동산', icon: '🏢' },
            { id: 'consumerStaples', name: 'Consumer Staples', nameKr: '필수소비재', icon: '🛒' },
            { id: 'communication', name: 'Communication', nameKr: '통신', icon: '📡' }
        ];

        for (const sector of sectorList) {
            const score = Math.floor(Math.random() * 60) + 20;
            this.state.sectors[sector.id] = {
                ...sector,
                stocks: [],
                l2Sectors: {},
                score,
                fulfillmentRate: Math.floor(Math.random() * 50) + 30,
                breadth: {
                    goldenCross: Math.floor(Math.random() * 60) + 20,
                    above200MA: Math.floor(Math.random() * 60) + 20,
                    oversold: Math.floor(Math.random() * 30),
                    overbought: Math.floor(Math.random() * 30)
                },
                status: this.getStatusFromScore(score)
            };
        }

        this.state.marketBreadth = {
            total: 120,
            goldenCross: Math.floor(Math.random() * 60) + 20,
            above200MA: Math.floor(Math.random() * 60) + 20,
            oversold: Math.floor(Math.random() * 20) + 5,
            overbought: Math.floor(Math.random() * 20) + 5
        };
    },

    // ============================================
    // Rendering
    // ============================================
    render() {
        const container = document.getElementById('sectorHeatmap');
        if (!container) return;
        
        if (this.state.viewMode === 'heatmap') {
            this.renderHeatmap(container);
        } else {
            this.renderTable(container);
        }

        this.renderBreadthSummary();
    },

    renderHeatmap(container) {
        const sectors = this.getSortedSectors();
        
        const html = `
            <div class="heatmap-grid">
                ${sectors.map(sector => this.renderHeatmapCell(sector)).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    },

    renderHeatmapCell(sector) {
        const color = this.getColorForScore(sector.score);
        const statusClass = sector.status.type;
        
        return `
            <div class="heatmap-cell ${statusClass}" 
                 style="background-color: ${color.bg}; color: ${color.text};"
                 onclick="SectorHeatmap.showSectorDetail('${sector.id}')"
                 data-sector="${sector.id}">
                <div class="cell-header">
                    <span class="cell-icon">${sector.icon}</span>
                    <span class="cell-name">${sector.nameKr}</span>
                </div>
                <div class="cell-score">
                    <span class="score-value">${sector.score}</span>
                </div>
                <div class="cell-status">
                    <span class="status-badge">${sector.status.label}</span>
                </div>
                <div class="cell-breadth">
                    <span class="breadth-item" title="200MA 위">📈 ${sector.breadth.above200MA}%</span>
                    <span class="breadth-item" title="과매도">📉 ${sector.breadth.oversold}%</span>
                </div>
                <div class="cell-footer">
                    <span class="fulfillment">충족률: ${sector.fulfillmentRate}%</span>
                </div>
            </div>
        `;
    },

    renderTable(container) {
        const sectors = this.getSortedSectors();
        
        const html = `
            <table class="heatmap-table">
                <thead>
                    <tr>
                        <th>섹터</th>
                        <th>상태 점수</th>
                        <th>신호 충족률</th>
                        <th>200MA 위</th>
                        <th>골든크로스</th>
                        <th>과매도</th>
                        <th>과매수</th>
                        <th>상태</th>
                    </tr>
                </thead>
                <tbody>
                    ${sectors.map(sector => this.renderTableRow(sector)).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    },

    renderTableRow(sector) {
        const statusClass = sector.status.type;
        
        return `
            <tr class="heatmap-row" onclick="SectorHeatmap.showSectorDetail('${sector.id}')">
                <td class="sector-name">
                    <span class="sector-icon">${sector.icon}</span>
                    ${sector.nameKr}
                </td>
                <td class="score-cell">
                    <div class="score-bar-mini">
                        <div class="bar-fill" style="width: ${sector.score}%; background: ${this.getColorForScore(sector.score).bg}"></div>
                        <span class="bar-value">${sector.score}</span>
                    </div>
                </td>
                <td>${sector.fulfillmentRate}%</td>
                <td>${sector.breadth.above200MA}%</td>
                <td>${sector.breadth.goldenCross}%</td>
                <td class="${sector.breadth.oversold > 30 ? 'highlight-oversold' : ''}">${sector.breadth.oversold}%</td>
                <td class="${sector.breadth.overbought > 30 ? 'highlight-overbought' : ''}">${sector.breadth.overbought}%</td>
                <td><span class="status-badge ${statusClass}">${sector.status.label}</span></td>
            </tr>
        `;
    },

    getSortedSectors() {
        let sectors = Object.values(this.state.sectors);
        
        if (this.state.selectedLevel === 'l2') {
            // Flatten L2 sectors
            sectors = [];
            for (const l1 of Object.values(this.state.sectors)) {
                for (const l2 of Object.values(l1.l2Sectors || {})) {
                    sectors.push({
                        ...l2,
                        parentName: l1.nameKr
                    });
                }
            }
        }
        
        // Sort
        switch (this.state.sortBy) {
            case 'score':
                sectors.sort((a, b) => b.score - a.score);
                break;
            case 'fulfillment':
                sectors.sort((a, b) => b.fulfillmentRate - a.fulfillmentRate);
                break;
            case 'breadth':
                sectors.sort((a, b) => b.breadth.above200MA - a.breadth.above200MA);
                break;
            case 'name':
                sectors.sort((a, b) => a.nameKr.localeCompare(b.nameKr));
                break;
        }
        
        return sectors;
    },

    getColorForScore(score) {
        if (score >= 70) return this.config.colors.bullish;
        if (score >= 55) return this.config.colors.positive;
        if (score <= 30) return this.config.colors.bearish;
        if (score <= 45) return this.config.colors.negative;
        return this.config.colors.neutral;
    },

    // ============================================
    // Market Breadth Summary
    // ============================================
    calculateMarketBreadth() {
        const stockSignals = this.signalsData?.stocks || {};
        const allStocks = [
            ...Object.values(stockSignals.us || {}),
            ...Object.values(stockSignals.kr || {})
        ];

        const total = allStocks.length;
        let goldenCross = 0;
        let above200MA = 0;
        let oversold = 0;
        let overbought = 0;

        for (const stock of allStocks) {
            if (stock.maCross?.lastCross?.type === 'golden') goldenCross++;
            if (stock.maCross?.currentPosition === 'above') above200MA++;
            if (stock.rsi?.status?.type === 'oversold') oversold++;
            if (stock.rsi?.status?.type === 'overbought') overbought++;
        }

        this.state.marketBreadth = {
            total,
            goldenCross,
            above200MA,
            oversold,
            overbought
        };
    },

    formatBreadthValue(count, total) {
        if (!total) return '--';
        return `${Math.round((count / total) * 100)}%`;
    },

    renderBreadthSummary() {
        const breadth = this.state.marketBreadth;
        if (!breadth) return;

        const { total, goldenCross, above200MA, oversold, overbought } = breadth;

        const goldenCrossEl = document.getElementById('goldenCrossRatio');
        const above200El = document.getElementById('above200MACount');
        const oversoldEl = document.getElementById('oversoldCount');
        const overboughtEl = document.getElementById('overboughtCount');

        if (goldenCrossEl) {
            goldenCrossEl.textContent = this.formatBreadthValue(goldenCross, total);
        }
        if (above200El) {
            above200El.textContent = this.formatBreadthValue(above200MA, total);
        }
        if (oversoldEl) {
            oversoldEl.textContent = this.formatBreadthValue(oversold, total);
        }
        if (overboughtEl) {
            overboughtEl.textContent = this.formatBreadthValue(overbought, total);
        }
    },

    // ============================================
    // Sector Detail
    // ============================================
    showSectorDetail(sectorId) {
        const sector = this.state.sectors[sectorId];
        if (!sector) return;
        
        const modal = document.getElementById('sectorDetailModal');
        if (!modal) return;
        
        const color = this.getColorForScore(sector.score);
        
        // Get L2 subsectors
        const l2Sectors = Object.values(sector.l2Sectors || {});
        
        modal.innerHTML = `
            <div class="modal-overlay" onclick="SectorHeatmap.closeDetail()">
                <div class="modal-content sector-detail" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="SectorHeatmap.closeDetail()">×</button>
                    
                    <div class="detail-header" style="background: ${color.bg}; color: ${color.text};">
                        <span class="header-icon">${sector.icon}</span>
                        <div class="header-info">
                            <h3>${sector.nameKr}</h3>
                            <span class="header-name-en">${sector.name}</span>
                        </div>
                        <div class="header-score">
                            <span class="score-large">${sector.score}</span>
                            <span class="status-label">${sector.status.label}</span>
                        </div>
                    </div>
                    
                    <div class="detail-metrics">
                        <div class="metric-grid">
                            <div class="metric-item">
                                <span class="metric-value">${sector.fulfillmentRate}%</span>
                                <span class="metric-label">신호 충족률</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-value">${sector.breadth.above200MA}%</span>
                                <span class="metric-label">200MA 위</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-value">${sector.breadth.goldenCross}%</span>
                                <span class="metric-label">골든크로스</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-value">${sector.breadth.oversold}%</span>
                                <span class="metric-label">과매도</span>
                            </div>
                        </div>
                    </div>
                    
                    ${l2Sectors.length > 0 ? `
                        <div class="detail-subsectors">
                            <h4>📊 세부 섹터 (L2)</h4>
                            <div class="subsector-grid">
                                ${l2Sectors.map(l2 => `
                                    <div class="subsector-item" style="border-left: 4px solid ${this.getColorForScore(l2.score).bg}">
                                        <span class="subsector-icon">${l2.icon}</span>
                                        <div class="subsector-info">
                                            <span class="subsector-name">${l2.nameKr}</span>
                                            <span class="subsector-score">점수: ${l2.score} | 충족률: ${l2.fulfillmentRate}%</span>
                                        </div>
                                        <span class="subsector-status ${l2.status?.type || 'neutral'}">${l2.status?.label || '중립'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-breadth-chart">
                        <h4>📈 섹터 폭(Breadth) 지표</h4>
                        <div class="breadth-bars">
                            <div class="breadth-bar">
                                <span class="bar-label">200MA 위 종목</span>
                                <div class="bar-track">
                                    <div class="bar-fill bullish" style="width: ${sector.breadth.above200MA}%"></div>
                                </div>
                                <span class="bar-value">${sector.breadth.above200MA}%</span>
                            </div>
                            <div class="breadth-bar">
                                <span class="bar-label">골든크로스</span>
                                <div class="bar-track">
                                    <div class="bar-fill positive" style="width: ${sector.breadth.goldenCross}%"></div>
                                </div>
                                <span class="bar-value">${sector.breadth.goldenCross}%</span>
                            </div>
                            <div class="breadth-bar">
                                <span class="bar-label">과매도 (RSI≤30)</span>
                                <div class="bar-track">
                                    <div class="bar-fill oversold" style="width: ${sector.breadth.oversold}%"></div>
                                </div>
                                <span class="bar-value">${sector.breadth.oversold}%</span>
                            </div>
                            <div class="breadth-bar">
                                <span class="bar-label">과매수 (RSI≥70)</span>
                                <div class="bar-track">
                                    <div class="bar-fill overbought" style="width: ${sector.breadth.overbought}%"></div>
                                </div>
                                <span class="bar-value">${sector.breadth.overbought}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-disclaimer">
                        ⚠️ 본 정보는 참고용이며 투자 조언이 아닙니다. 모든 투자 결정과 손익은 본인 책임입니다.
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn-view-stocks" onclick="SectorHeatmap.viewSectorStocks('${sectorId}')">
                            📋 종목 목록 보기
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    },

    closeDetail() {
        const modal = document.getElementById('sectorDetailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    viewSectorStocks(sectorId) {
        // Switch to scanner tab with sector filter
        const sectorTab = document.querySelector('[data-tab="scanner"]');
        if (sectorTab) {
            sectorTab.click();
        }
        
        // Set filter
        const sectorFilter = document.getElementById('scannerSectorFilter');
        if (sectorFilter) {
            sectorFilter.value = sectorId;
            StockScanner.state.filters.sector = sectorId;
            StockScanner.applyFilters();
        }
        
        this.closeDetail();
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SectorHeatmap.init();
});
