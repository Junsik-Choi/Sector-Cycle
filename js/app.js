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
// Sector Explanations - 섹터별 상세 설명
// ============================================
const SECTOR_EXPLANATIONS = {
    technology: {
        summary: '기술 섹터는 경기 확장기 초반부터 중반에 가장 강한 성과를 보입니다. 금리가 낮고 성장 기대감이 높을 때 유리합니다.',
        whyRising: [
            'AI/반도체 수요 급증으로 데이터센터 투자 확대',
            '클라우드 컴퓨팅 성장세 지속',
            '금리 인하 기대감으로 성장주 밸류에이션 상승',
            '기업들의 디지털 전환 가속화'
        ],
        whyFalling: [
            '금리 상승 시 미래 수익 할인율 증가로 밸류에이션 하락',
            '경기 침체 우려로 IT 투자 축소',
            '반도체 재고 과잉 사이클',
            '규제 리스크 (독점, 개인정보 등)'
        ],
        buySignal: 'PMI 50 이상 + 금리 인하 사이클 시작 + VIX 20 이하 안정',
        sellSignal: '금리 급등 + 반도체 재고 증가 + 기술주 PER 30배 이상 과열',
        holdSignal: '경기 불확실성 높음 + 실적 시즌 대기',
        keyIndicators: ['반도체 재고', 'NASDAQ P/E', '기술주 EPS 성장률']
    },
    financials: {
        summary: '금융 섹터는 경기 회복기에 강세를 보이며, 금리 상승과 경제 활동 증가 시 수혜를 받습니다.',
        whyRising: [
            '금리 상승으로 은행 순이자마진(NIM) 개선',
            '경기 회복으로 대출 수요 증가',
            '자산 건전성 개선 (부실채권 감소)',
            '자본시장 활성화로 증권사 수익 증가'
        ],
        whyFalling: [
            '금리 인하 시 순이자마진 축소',
            '경기 침체로 대손충당금 증가',
            '부동산 가격 하락 시 담보 가치 하락',
            '규제 강화 리스크'
        ],
        buySignal: '금리 상승 초기 + 경기 회복 신호 + 은행 PBR 1배 미만',
        sellSignal: '금리 피크 + 경기 침체 우려 + 부실채권 증가',
        holdSignal: '금리 정점 근처 + 경기 불확실성',
        keyIndicators: ['기준금리', '은행 NIM', '연체율']
    },
    healthcare: {
        summary: '헬스케어는 경기 방어적 섹터로, 경기 침체 시에도 안정적인 수요를 유지합니다. 고령화 추세의 장기 수혜주입니다.',
        whyRising: [
            '신약 파이프라인 성과 (FDA 승인 등)',
            '바이오텍 M&A 활성화',
            '고령화로 의료 수요 구조적 증가',
            '경기 침체 시 안전자산 선호'
        ],
        whyFalling: [
            '약가 인하 정책 리스크',
            '임상 실패로 개별 종목 급락',
            '경기 확장기 성장주 대비 소외',
            '바이오텍 자금 조달 환경 악화'
        ],
        buySignal: '경기 침체 우려 증가 + 방어주 선호 + 신약 모멘텀',
        sellSignal: '경기 강한 확장 + 성장주 선호 + 정책 리스크 부각',
        holdSignal: '중립적 경기 국면 + 실적 안정',
        keyIndicators: ['FDA 승인 건수', '바이오텍 IPO', '의료비 지출 증가율']
    },
    consumerDiscretionary: {
        summary: '임의소비재는 경기에 가장 민감한 섹터로, 경기 확장기에 소비 심리 개선과 함께 강한 성과를 보입니다.',
        whyRising: [
            '소비자 신뢰지수 상승',
            '고용 시장 호조로 가처분소득 증가',
            '금리 인하로 자동차/주택 관련 소비 증가',
            '이커머스 성장세 지속'
        ],
        whyFalling: [
            '경기 침체로 소비 심리 위축',
            '인플레이션으로 실질 구매력 하락',
            '금리 상승으로 할부 비용 증가',
            '재고 과잉으로 마진 압박'
        ],
        buySignal: '소비자 신뢰지수 반등 + 고용 호조 + 소매판매 개선',
        sellSignal: '경기 침체 신호 + 소비 심리 급락 + 재고 급증',
        holdSignal: '소비 지표 혼조 + 경기 전환점 근처',
        keyIndicators: ['소비자신뢰지수', '소매판매', '자동차 판매']
    },
    industrials: {
        summary: '산업재는 경기 확장 중반~후반에 강세를 보이며, 인프라 투자와 제조업 활동 증가 시 수혜를 받습니다.',
        whyRising: [
            '제조업 PMI 확장 (50 이상)',
            '인프라 투자 확대 정책',
            '글로벌 교역량 증가',
            '항공/여행 수요 회복'
        ],
        whyFalling: [
            '제조업 PMI 위축 (50 미만)',
            '글로벌 공급망 차질',
            '원자재 가격 급등으로 마진 압박',
            '경기 침체로 설비투자 축소'
        ],
        buySignal: 'PMI 50 상향 돌파 + BDI 상승 + 설비투자 증가',
        sellSignal: 'PMI 하락 추세 + 수주 감소 + 재고 증가',
        holdSignal: 'PMI 50 근처 횡보 + 경기 불확실성',
        keyIndicators: ['제조업 PMI', 'BDI', '설비투자 증가율']
    },
    energy: {
        summary: '에너지 섹터는 유가와 높은 상관관계를 보이며, 경기 확장 후반부에 강세를 보이는 후행적 섹터입니다.',
        whyRising: [
            '유가 상승 (지정학적 리스크, OPEC 감산)',
            '글로벌 수요 회복으로 석유 소비 증가',
            '정유 마진 개선',
            '에너지 안보 이슈로 투자 확대'
        ],
        whyFalling: [
            '유가 하락 (수요 둔화, 공급 과잉)',
            '친환경 에너지 전환 가속화',
            '경기 침체로 에너지 수요 감소',
            'ESG 투자 흐름으로 자금 이탈'
        ],
        buySignal: '유가 상승 추세 + OPEC 감산 + 재고 감소',
        sellSignal: '유가 하락 + 수요 둔화 + 재고 급증',
        holdSignal: '유가 횡보 + 수급 균형',
        keyIndicators: ['WTI/브렌트 유가', 'EIA 원유재고', '정유마진']
    },
    materials: {
        summary: '소재 섹터는 원자재 가격과 연동되며, 경기 확장기 초중반에 강세를 보입니다. 인프라 투자 확대 시 수혜를 받습니다.',
        whyRising: [
            '원자재 가격 상승 (구리, 철강 등)',
            '글로벌 인프라 투자 확대',
            '제조업 회복으로 원자재 수요 증가',
            '인플레이션 헤지 수요'
        ],
        whyFalling: [
            '원자재 가격 하락',
            '경기 둔화로 건설/제조업 수요 감소',
            '중국 경기 둔화 (최대 수요국)',
            '공급 과잉으로 가격 하락'
        ],
        buySignal: '원자재 가격 반등 + 중국 경기 회복 + PMI 개선',
        sellSignal: '원자재 가격 하락 + 재고 증가 + 수요 둔화',
        holdSignal: '가격 횡보 + 수급 균형',
        keyIndicators: ['구리/철강 가격', '중국 PMI', 'LME 재고']
    },
    utilities: {
        summary: '유틸리티는 대표적인 경기 방어 섹터로, 경기 침체 우려 시 안전자산으로 선호됩니다. 고배당 특성이 있습니다.',
        whyRising: [
            '경기 침체 우려로 방어주 선호',
            '금리 인하로 배당주 매력 증가',
            '안정적인 현금흐름과 배당',
            '친환경 에너지 전환 투자'
        ],
        whyFalling: [
            '금리 상승으로 배당주 매력 감소',
            '경기 확장기 성장주 대비 소외',
            '규제 및 전기요금 인상 제한',
            '친환경 전환 비용 부담'
        ],
        buySignal: '경기 침체 우려 + 금리 인하 + 안전자산 선호',
        sellSignal: '경기 확장 + 금리 상승 + 성장주 선호',
        holdSignal: '금리 정점 + 경기 불확실성',
        keyIndicators: ['기준금리', '배당수익률', '전력 수요']
    },
    realEstate: {
        summary: '부동산 섹터는 금리에 가장 민감한 섹터로, 저금리 환경에서 강세를 보이며 금리 상승 시 약세를 보입니다.',
        whyRising: [
            '금리 인하로 차입 비용 감소',
            '부동산 가격 상승 기대',
            '임대료 상승으로 수익성 개선',
            '리츠(REITs) 배당 매력'
        ],
        whyFalling: [
            '금리 상승으로 차입 비용 증가',
            '공실률 증가 (재택근무 확산 등)',
            '부동산 가격 하락 우려',
            '자금 조달 환경 악화'
        ],
        buySignal: '금리 인하 시작 + 공실률 안정 + 거래량 회복',
        sellSignal: '금리 상승 + 공실률 증가 + 가격 하락',
        holdSignal: '금리 정점 근처 + 시장 안정화 대기',
        keyIndicators: ['모기지 금리', '공실률', '부동산 거래량']
    },
    consumerStaples: {
        summary: '필수소비재는 경기와 무관하게 안정적인 수요를 유지하는 방어 섹터입니다. 경기 침체 시 상대적 강세를 보입니다.',
        whyRising: [
            '경기 침체 우려로 방어주 선호',
            '안정적인 실적과 배당',
            '인플레이션 시 가격 전가 능력',
            '필수재 특성상 수요 변동 적음'
        ],
        whyFalling: [
            '경기 확장기 성장주 대비 소외',
            '금리 상승으로 배당주 매력 감소',
            '원가 상승을 가격에 전가 못할 때',
            'PB 상품 확대로 점유율 하락'
        ],
        buySignal: '경기 침체 우려 + 방어적 포지션 필요 + 배당 선호',
        sellSignal: '경기 강한 확장 + 성장주 선호 + 금리 상승',
        holdSignal: '경기 불확실성 + 포트폴리오 안정화',
        keyIndicators: ['소비자물가', '식품가격지수', '소매판매']
    },
    communication: {
        summary: '커뮤니케이션 섹터는 미디어/엔터테인먼트와 통신으로 구분되며, 디지털 광고와 스트리밍 성장 수혜를 받습니다.',
        whyRising: [
            '디지털 광고 시장 성장',
            '스트리밍 서비스 가입자 증가',
            '5G/AI 관련 투자 확대',
            '경기 확장으로 광고 지출 증가'
        ],
        whyFalling: [
            '경기 침체로 광고비 삭감',
            '스트리밍 경쟁 심화로 수익성 악화',
            '규제 리스크 (빅테크)',
            '통신사 설비투자 부담'
        ],
        buySignal: '광고 시장 회복 + 가입자 성장 + 경기 확장',
        sellSignal: '광고비 삭감 + 가입자 이탈 + 경쟁 심화',
        holdSignal: '실적 혼조 + 시장 재편 진행 중',
        keyIndicators: ['디지털 광고 성장률', '스트리밍 가입자', '5G 가입자']
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
        updateElement('cliValue', data.macro.cli?.usa?.toFixed?.(1) || data.macro.cli?.usa || 'N/A');
        updateElement('pmiValue', data.macro.pmi?.manufacturing?.toFixed?.(1) || data.macro.pmi?.manufacturing || 'N/A');
    }
    
    // Update Risk/VIX card
    if (data.risk) {
        updateElement('riskRegime', data.risk.regime, `regime-label ${data.risk.regime}`);
        updateElement('vixValue', data.risk.vix?.toFixed?.(1) || data.risk.vix || 'N/A');
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
    const explanation = SECTOR_EXPLANATIONS[sectorKey];
    if (!sector) return;
    
    state.selectedSector = sectorKey;
    
    const detail = document.getElementById('sectorDetail');
    const title = document.getElementById('sectorDetailTitle');
    const stocksList = document.getElementById('sectorStocksList');
    
    if (!detail || !title || !stocksList) return;
    
    title.textContent = `${sector.icon} ${sector.name} (${sector.nameKr})`;
    
    stocksList.innerHTML = '';
    
    // Add Sector Explanation
    if (explanation) {
        const explanationDiv = document.createElement('div');
        explanationDiv.className = `sector-explanation ${sector.cycle}`;
        explanationDiv.innerHTML = `
            <div class="explanation-header">
                <span class="explanation-icon">${sector.icon}</span>
                <div class="explanation-title">
                    <h3>${sector.name} 섹터 분석</h3>
                    <span class="cycle-badge ${sector.cycle}">${capitalizeFirst(sector.cycle)}</span>
                </div>
            </div>
            <div class="explanation-body">
                <div class="explanation-section">
                    <p><strong>📊 요약:</strong> ${explanation.summary}</p>
                </div>
                
                <div class="explanation-section">
                    <h4>📈 상승 요인 (Why Rising)</h4>
                    <ul>
                        ${explanation.whyRising.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="explanation-section">
                    <h4>📉 하락 요인 (Why Falling)</h4>
                    <ul>
                        ${explanation.whyFalling.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="signal-box">
                    <div class="signal-item buy">
                        <div class="signal-label">🟢 매수 신호</div>
                        <div class="signal-text">${explanation.buySignal}</div>
                    </div>
                    <div class="signal-item sell">
                        <div class="signal-label">🔴 매도 신호</div>
                        <div class="signal-text">${explanation.sellSignal}</div>
                    </div>
                    <div class="signal-item hold">
                        <div class="signal-label">🟡 관망 신호</div>
                        <div class="signal-text">${explanation.holdSignal}</div>
                    </div>
                </div>
                
                <div class="key-indicators">
                    ${explanation.keyIndicators.map(ind => `
                        <div class="key-indicator">
                            <span class="label">핵심 지표</span>
                            <span class="value">${ind}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        stocksList.appendChild(explanationDiv);
    }
    
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
