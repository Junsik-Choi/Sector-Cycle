/**
 * VIX Volatility Panel Module
 * VIX 기반 시장 변동성 상태 패널
 * 
 * Reference:
 * - VIX Methodology: https://cdn.cboe.com/api/global/us_indices/governance/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf
 * - VIX Data: https://fred.stlouisfed.org/series/VIXCLS/
 */

const VolatilityPanel = {
    // ============================================
    // Configuration
    // ============================================
    config: {
        thresholds: {
            low: 15,
            normal: 20,
            elevated: 25,
            high: 30,
            extreme: 40
        },
        spikeThreshold: 20, // 5-day change percentage for spike warning
        refreshInterval: 60000 // 1 minute
    },

    // State
    state: {
        current: null,
        history: [],
        isLoading: false,
        warning: false
    },

    // ============================================
    // Initialize
    // ============================================
    async init() {
        await this.loadData();
        this.render();
        this.startAutoRefresh();
    },

    async loadData() {
        this.state.isLoading = true;
        
        try {
            // Load latest data
            const latestRes = await fetch('./data/latest.json');
            const latestData = await latestRes.json();
            
            // Load history for chart
            const historyRes = await fetch('./data/history.json');
            const historyData = await historyRes.json();
            
            // Process VIX data
            this.processVixData(latestData, historyData);
            
        } catch (error) {
            console.error('Failed to load VIX data:', error);
            this.generateDemoData();
        } finally {
            this.state.isLoading = false;
        }
    },

    processVixData(latestData, historyData) {
        const vixValue = latestData?.risk?.vix || 18.5;
        const vixHistory = historyData?.vix || [];
        
        // Calculate 5-day change
        let change5D = 0;
        if (vixHistory.length >= 5) {
            const fiveDaysAgo = vixHistory[vixHistory.length - 6]?.value || vixValue;
            change5D = ((vixValue - fiveDaysAgo) / fiveDaysAgo) * 100;
        }
        
        // Calculate 52-week range
        let low52W = vixValue, high52W = vixValue;
        const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
        for (const point of vixHistory) {
            const pointDate = new Date(point.date).getTime();
            if (pointDate >= oneYearAgo && point.value) {
                low52W = Math.min(low52W, point.value);
                high52W = Math.max(high52W, point.value);
            }
        }
        
        // Determine status
        const status = this.getVixStatus(vixValue, change5D);
        
        this.state.current = {
            value: vixValue,
            change5D,
            low52W,
            high52W,
            status,
            lastUpdate: latestData?.metadata?.timestamp || new Date().toISOString()
        };
        
        this.state.history = vixHistory.slice(-252); // Last year of data
        this.state.warning = status.warning;
    },

    generateDemoData() {
        const vixValue = 18.5;
        const change5D = -2.3;
        
        this.state.current = {
            value: vixValue,
            change5D,
            low52W: 12.1,
            high52W: 35.2,
            status: this.getVixStatus(vixValue, change5D),
            lastUpdate: new Date().toISOString()
        };
        
        // Generate demo history
        const history = [];
        const now = Date.now();
        for (let i = 252; i >= 0; i--) {
            const date = new Date(now - (i * 24 * 60 * 60 * 1000));
            const value = 15 + Math.random() * 20 + Math.sin(i / 30) * 5;
            history.push({
                date: date.toISOString().split('T')[0],
                value: Math.round(value * 10) / 10
            });
        }
        this.state.history = history;
        this.state.warning = false;
    },

    getVixStatus(value, change5D) {
        const { thresholds, spikeThreshold } = this.config;
        
        let level, label, labelEn, color, warning;
        
        if (value < thresholds.low) {
            level = 'low';
            label = '변동성 낮음';
            labelEn = 'Low Volatility';
            color = '#22c55e';
            warning = false;
        } else if (value < thresholds.normal) {
            level = 'normal';
            label = '변동성 보통';
            labelEn = 'Normal Volatility';
            color = '#3b82f6';
            warning = false;
        } else if (value < thresholds.elevated) {
            level = 'elevated';
            label = '변동성 주의';
            labelEn = 'Elevated Volatility';
            color = '#f59e0b';
            warning = false;
        } else if (value < thresholds.high) {
            level = 'high';
            label = '변동성 높음';
            labelEn = 'High Volatility';
            color = '#f97316';
            warning = true;
        } else {
            level = 'extreme';
            label = '변동성 극심';
            labelEn = 'Extreme Volatility';
            color = '#ef4444';
            warning = true;
        }
        
        // Check for spike
        let spike = false;
        if (change5D > spikeThreshold) {
            spike = true;
            warning = true;
            label += ' (급등)';
            labelEn += ' (Spike)';
        }
        
        return { level, label, labelEn, color, warning, spike };
    },

    // ============================================
    // Rendering
    // ============================================
    render() {
        this.renderMainPanel();
        this.renderGauge();
        this.renderChart();
        this.updateWarningBadges();
    },

    renderMainPanel() {
        const container = document.getElementById('volatilityPanel');
        if (!container) return;
        
        const { current } = this.state;
        if (!current) return;
        
        const changeClass = current.change5D >= 0 ? 'positive' : 'negative';
        const changeSign = current.change5D >= 0 ? '+' : '';
        
        container.innerHTML = `
            <div class="volatility-panel ${current.status.level}">
                <div class="vp-header">
                    <h3>📊 시장 변동성 (VIX)</h3>
                    <a href="https://cdn.cboe.com/api/global/us_indices/governance/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf" 
                       target="_blank" class="vp-info-link" title="VIX 산출 방법론">ℹ️</a>
                </div>
                
                <div class="vp-main">
                    <div class="vp-value-section">
                        <div class="vp-current">
                            <span class="vp-value" style="color: ${current.status.color}">${current.value.toFixed(1)}</span>
                            <span class="vp-label">${current.status.label}</span>
                        </div>
                        <div class="vp-change ${changeClass}">
                            <span class="change-value">${changeSign}${current.change5D.toFixed(1)}%</span>
                            <span class="change-label">5일 변화</span>
                        </div>
                    </div>
                    
                    <div class="vp-gauge-container" id="vixGaugeContainer">
                        <!-- Gauge will be rendered here -->
                    </div>
                </div>
                
                <div class="vp-range">
                    <span class="range-label">📊 52주 범위:</span>
                    <div class="range-bar">
                        <div class="range-fill" style="left: ${this.getRangePosition(current.low52W)}%; width: ${this.getRangePosition(current.high52W) - this.getRangePosition(current.low52W)}%"></div>
                        <div class="range-marker current" style="left: ${this.getRangePosition(current.value)}%"></div>
                    </div>
                    <div class="range-values">
                        <span>${current.low52W.toFixed(1)}</span>
                        <span>${current.high52W.toFixed(1)}</span>
                    </div>
                </div>
                
                <div class="vp-thresholds">
                    <div class="threshold-item low">
                        <span class="threshold-range">&lt;${this.config.thresholds.low}</span>
                        <span class="threshold-label">낮음</span>
                    </div>
                    <div class="threshold-item normal">
                        <span class="threshold-range">${this.config.thresholds.low}-${this.config.thresholds.normal}</span>
                        <span class="threshold-label">보통</span>
                    </div>
                    <div class="threshold-item elevated">
                        <span class="threshold-range">${this.config.thresholds.normal}-${this.config.thresholds.elevated}</span>
                        <span class="threshold-label">주의</span>
                    </div>
                    <div class="threshold-item high">
                        <span class="threshold-range">${this.config.thresholds.elevated}-${this.config.thresholds.high}</span>
                        <span class="threshold-label">높음</span>
                    </div>
                    <div class="threshold-item extreme">
                        <span class="threshold-range">&gt;${this.config.thresholds.high}</span>
                        <span class="threshold-label">극심</span>
                    </div>
                </div>
                
                ${current.status.warning ? `
                    <div class="vp-warning">
                        ⚠️ <strong>변동성 경고:</strong> 현재 시장 변동성이 높습니다. 
                        모든 신호에 추가적인 주의가 필요합니다.
                    </div>
                ` : ''}
                
                <div class="vp-chart-container">
                    <div class="vp-chart-header">
                        <h4>VIX 추이 차트</h4>
                        <div class="vp-chart-controls">
                            <button class="vp-range-btn active" data-range="1M">1개월</button>
                            <button class="vp-range-btn" data-range="3M">3개월</button>
                            <button class="vp-range-btn" data-range="6M">6개월</button>
                            <button class="vp-range-btn" data-range="1Y">1년</button>
                        </div>
                    </div>
                    <div id="vixChart" class="vp-chart"></div>
                </div>
                
                <div class="vp-footer">
                    <div class="vp-source">
                        데이터 출처: <a href="https://fred.stlouisfed.org/series/VIXCLS/" target="_blank">FRED VIXCLS</a>
                    </div>
                    <div class="vp-update">
                        최근 업데이트: ${new Date(current.lastUpdate).toLocaleString('ko-KR')}
                    </div>
                </div>
            </div>
        `;
        
        // Setup chart range buttons
        container.querySelectorAll('.vp-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.vp-range-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderChart(e.target.dataset.range);
            });
        });
    },

    getRangePosition(value) {
        // Map VIX value to 0-100% position (assuming range 0-60)
        return Math.min(100, Math.max(0, (value / 60) * 100));
    },

    renderGauge() {
        const container = document.getElementById('vixGaugeContainer');
        if (!container) return;
        
        const { current } = this.state;
        if (!current) return;
        
        // Calculate gauge angle (180 degree arc)
        const maxVix = 50;
        const angle = Math.min(180, (current.value / maxVix) * 180);
        
        container.innerHTML = `
            <svg class="vix-gauge-svg" viewBox="0 0 200 120">
                <!-- Background arc -->
                <path class="gauge-bg" d="M 20 100 A 80 80 0 0 1 180 100" 
                      stroke="#374151" stroke-width="12" fill="none"/>
                
                <!-- Colored segments -->
                <path class="gauge-segment low" d="M 20 100 A 80 80 0 0 1 56 36" 
                      stroke="#22c55e" stroke-width="12" fill="none"/>
                <path class="gauge-segment normal" d="M 56 36 A 80 80 0 0 1 100 20" 
                      stroke="#3b82f6" stroke-width="12" fill="none"/>
                <path class="gauge-segment elevated" d="M 100 20 A 80 80 0 0 1 144 36" 
                      stroke="#f59e0b" stroke-width="12" fill="none"/>
                <path class="gauge-segment high" d="M 144 36 A 80 80 0 0 1 180 100" 
                      stroke="#ef4444" stroke-width="12" fill="none"/>
                
                <!-- Needle -->
                <g class="gauge-needle" transform="rotate(${angle - 90}, 100, 100)">
                    <line x1="100" y1="100" x2="100" y2="30" stroke="${current.status.color}" stroke-width="3"/>
                    <circle cx="100" cy="100" r="8" fill="${current.status.color}"/>
                </g>
                
                <!-- Labels -->
                <text x="20" y="115" class="gauge-label">0</text>
                <text x="50" y="45" class="gauge-label">15</text>
                <text x="95" y="25" class="gauge-label">25</text>
                <text x="145" y="45" class="gauge-label">35</text>
                <text x="175" y="115" class="gauge-label">50+</text>
            </svg>
        `;
    },

    renderChart(range = '1M') {
        const container = document.getElementById('vixChart');
        if (!container || !window.LightweightCharts) return;
        
        // Clear previous chart
        container.innerHTML = '';
        
        // Filter data by range
        const data = this.filterDataByRange(this.state.history, range);
        
        if (data.length === 0) return;
        
        // Create chart
        const chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: 200,
            layout: {
                background: { color: 'transparent' },
                textColor: '#9ca3af'
            },
            grid: {
                vertLines: { color: '#374151' },
                horzLines: { color: '#374151' }
            },
            rightPriceScale: {
                borderColor: '#374151'
            },
            timeScale: {
                borderColor: '#374151',
                timeVisible: true
            }
        });
        
        // Add area series
        const areaSeries = chart.addAreaSeries({
            topColor: 'rgba(239, 68, 68, 0.4)',
            bottomColor: 'rgba(239, 68, 68, 0.0)',
            lineColor: '#ef4444',
            lineWidth: 2
        });
        
        // Format data for chart
        const chartData = data.map(point => ({
            time: point.date,
            value: point.value
        }));
        
        areaSeries.setData(chartData);
        
        // Add threshold lines
        const { thresholds } = this.config;
        
        const addThresholdLine = (value, color) => {
            const lineSeries = chart.addLineSeries({
                color: color,
                lineWidth: 1,
                lineStyle: 2, // Dashed
                priceLineVisible: false
            });
            lineSeries.setData([
                { time: chartData[0].time, value },
                { time: chartData[chartData.length - 1].time, value }
            ]);
        };
        
        addThresholdLine(thresholds.normal, '#f59e0b');
        addThresholdLine(thresholds.high, '#ef4444');
        
        chart.timeScale().fitContent();
        
        // Store chart reference for cleanup
        this.chart = chart;
        
        // Resize handler
        const resizeHandler = () => {
            chart.applyOptions({ width: container.clientWidth });
        };
        window.addEventListener('resize', resizeHandler);
    },

    filterDataByRange(data, range) {
        const now = Date.now();
        let cutoff;
        
        switch (range) {
            case '1M':
                cutoff = now - (30 * 24 * 60 * 60 * 1000);
                break;
            case '3M':
                cutoff = now - (90 * 24 * 60 * 60 * 1000);
                break;
            case '6M':
                cutoff = now - (180 * 24 * 60 * 60 * 1000);
                break;
            case '1Y':
                cutoff = now - (365 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoff = now - (30 * 24 * 60 * 60 * 1000);
        }
        
        return data.filter(point => new Date(point.date).getTime() >= cutoff);
    },

    // ============================================
    // Warning Badges
    // ============================================
    updateWarningBadges() {
        if (!this.state.warning) {
            document.querySelectorAll('.vix-warning-badge').forEach(el => {
                el.style.display = 'none';
            });
            return;
        }
        
        // Show warning badges on all signal cards
        document.querySelectorAll('.signal-card, .scanner-row, .heatmap-cell').forEach(el => {
            let badge = el.querySelector('.vix-warning-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'vix-warning-badge';
                badge.innerHTML = '⚠️ 변동성 높음';
                el.appendChild(badge);
            }
            badge.style.display = 'inline-block';
        });
    },

    // ============================================
    // Auto Refresh
    // ============================================
    startAutoRefresh() {
        setInterval(() => {
            this.loadData().then(() => this.render());
        }, this.config.refreshInterval);
    },

    // ============================================
    // Public API
    // ============================================
    getWarningStatus() {
        return this.state.warning;
    },

    getCurrentVix() {
        return this.state.current;
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    VolatilityPanel.init();
});
