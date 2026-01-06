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
        const parsedHistory = this.parseVixHistory(historyData);
        const vixHistory = parsedHistory.length ? parsedHistory : (historyData?.indicators?.vix?.history || []);
        const latestFromHistory = vixHistory.length ? vixHistory[vixHistory.length - 1].value : null;
        const vixValue = latestData?.risk?.vix ?? latestFromHistory ?? 18.5;
        
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
        
        const dailyChange = this.getDailyChange(vixHistory, vixValue);
        const percentile = this.calculatePercentile(vixHistory, vixValue);

        this.state.current = {
            value: vixValue,
            change5D,
            dailyChange,
            low52W,
            high52W,
            percentile,
            status,
            lastUpdate: latestData?.metadata?.timestamp || new Date().toISOString()
        };
        
        this.state.history = vixHistory.slice(-252); // Last year of data
        this.state.warning = status.warning;
    },

    parseVixHistory(historyData) {
        const entries = historyData?.entries;
        if (!Array.isArray(entries)) return [];

        return entries
            .map((entry) => {
                const timestamp = entry?.snapshot?.timestamp || entry?.timestamp;
                const value = entry?.snapshot?.risk?.vix;
                if (!timestamp || value === null || value === undefined) return null;
                const date = new Date(timestamp);
                if (Number.isNaN(date.getTime())) return null;
                return {
                    date: date.toISOString().split('T')[0],
                    value
                };
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    getDailyChange(history, currentValue) {
        if (!history.length) {
            return { value: 0, percent: 0, hasData: false };
        }

        const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastPoint = sorted[sorted.length - 1];
        const prevPoint = sorted[sorted.length - 2];
        if (!prevPoint) {
            return { value: 0, percent: 0, hasData: false };
        }

        const current = currentValue ?? lastPoint.value;
        const previous = prevPoint.value;
        if (!previous) {
            return { value: 0, percent: 0, hasData: false };
        }

        const value = current - previous;
        const percent = (value / previous) * 100;
        return { value, percent, hasData: true };
    },

    calculatePercentile(history, value) {
        if (!history.length) return null;

        const values = history
            .map(point => point.value)
            .filter(pointValue => pointValue !== null && pointValue !== undefined);

        if (!values.length || value === null || value === undefined) return null;

        const belowOrEqual = values.filter(pointValue => pointValue <= value).length;
        return Math.round((belowOrEqual / values.length) * 100);
    },

    generateDemoData() {
        const vixValue = 18.5;
        const change5D = -2.3;
        const dailyChange = { value: -0.5, percent: -2.6, hasData: true };
        const percentile = 35;
        
        this.state.current = {
            value: vixValue,
            change5D,
            dailyChange,
            low52W: 12.1,
            high52W: 35.2,
            percentile,
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
        this.updateVixDetails();
        this.setupChartControls();
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
        const { current } = this.state;
        if (!current) return;

        const gaugeContainer = document.getElementById('vixGaugeLarge');
        if (!gaugeContainer) return;

        const gaugeFill = gaugeContainer.querySelector('#vixGaugeFill');
        const needle = gaugeContainer.querySelector('#vixNeedle');
        const valueLabel = document.getElementById('vixValueLarge');
        const statusLabel = document.getElementById('vixStatusLarge');

        const maxVix = 50;
        const angle = Math.min(180, Math.max(0, (current.value / maxVix) * 180));

        const toRadians = (deg) => (deg * Math.PI) / 180;
        const center = { x: 100, y: 100 };
        const radius = 80;
        const startAngle = 180;
        const endAngle = 180 - angle;
        const start = {
            x: center.x + radius * Math.cos(toRadians(startAngle)),
            y: center.y + radius * Math.sin(toRadians(startAngle))
        };
        const end = {
            x: center.x + radius * Math.cos(toRadians(endAngle)),
            y: center.y + radius * Math.sin(toRadians(endAngle))
        };
        const largeArcFlag = angle > 180 ? 1 : 0;

        if (gaugeFill) {
            gaugeFill.setAttribute(
                'd',
                `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
            );
        }

        if (needle) {
            needle.setAttribute('cx', end.x.toFixed(1));
            needle.setAttribute('cy', end.y.toFixed(1));
            needle.setAttribute('fill', current.status.color);
        }

        if (valueLabel) {
            valueLabel.textContent = current.value.toFixed(1);
            valueLabel.style.color = current.status.color;
        }

        if (statusLabel) {
            statusLabel.textContent = current.status.label;
            statusLabel.style.color = current.status.color;
        }
    },

    renderChart(range = '1M') {
        const container = document.getElementById('vixHistoricalChart') || document.getElementById('vixChart');
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
            case '2Y':
                cutoff = now - (730 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoff = now - (30 * 24 * 60 * 60 * 1000);
        }
        
        return data.filter(point => new Date(point.date).getTime() >= cutoff);
    },

    updateVixDetails() {
        const { current } = this.state;
        if (!current) return;

        const dailyChangeEl = document.getElementById('vixDailyChange');
        const rangeEl = document.getElementById('vix52WRange');
        const percentileEl = document.getElementById('vixPercentile');

        if (dailyChangeEl) {
            if (current.dailyChange?.hasData) {
                const sign = current.dailyChange.value >= 0 ? '+' : '';
                dailyChangeEl.textContent = `${sign}${current.dailyChange.value.toFixed(1)} (${sign}${current.dailyChange.percent.toFixed(1)}%)`;
                dailyChangeEl.classList.toggle('positive', current.dailyChange.value >= 0);
                dailyChangeEl.classList.toggle('negative', current.dailyChange.value < 0);
            } else {
                dailyChangeEl.textContent = 'N/A';
            }
        }

        if (rangeEl) {
            rangeEl.textContent = `${current.low52W.toFixed(1)} - ${current.high52W.toFixed(1)}`;
        }

        if (percentileEl) {
            percentileEl.textContent = current.percentile !== null ? `${current.percentile}%` : 'N/A';
        }
    },

    setupChartControls() {
        const buttons = document.querySelectorAll('.tf-btn');
        if (!buttons.length || this.chartControlsReady) return;

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.renderChart(button.dataset.range);
            });
        });

        this.chartControlsReady = true;
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
