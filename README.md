# 📊 Sector Cycle Dashboard

경기/업황/리스크 지표를 자동 수집·가공하여 GitHub Pages로 배포되는 정적 HTML 대시보드입니다.
섹터별 사이클 상태(확장/둔화/침체/회복)를 시각화하고, 한국/미국 주식의 실시간 차트를 제공합니다.

> ⚠️ **면책 고지 (Disclaimer):** 본 대시보드는 **정보 제공 목적으로만** 제공됩니다. 
> **투자 조언이 아니며**, 모든 투자 결정과 그에 따른 손익은 **전적으로 사용자 본인의 책임**입니다.
> This dashboard is for **informational purposes only** and does **not constitute investment advice**.

---

## 🚀 Features

### 📈 경제 지표 대시보드
- **Macro Regime**: OECD CLI, PMI 기반 거시경제 상태
- **Risk Gauge**: VIX 기반 시장 리스크 수준
- **Trade Pulse**: Baltic Dry Index, Drewry WCI 기반 글로벌 교역 체감
- **Commodity**: World Bank 원자재 지수, FAO 식품가격지수
- **Oil Balance**: EIA 원유 재고 및 가격 동향
- **Korea Market**: KOSPI/KOSDAQ 및 외국인 수급

### 🔄 섹터 사이클 분석
- 11개 GICS 섹터별 사이클 상태 (Expansion/Slowdown/Contraction/Recovery)
- 섹터별 대표 한국/미국 종목 매핑
- 모멘텀 점수 및 시그널 표시

### 📊 실시간 주식 차트
- TradingView 위젯 기반 실시간 차트
- 다중 타임프레임: 10분봉, 30분봉, 1시간봉, 3시간봉, 일봉, 주봉, 월봉
- 기술적 지표: 이동평균선(SMA/EMA), RSI, MACD, 볼린저밴드
- 골든크로스/데드크로스 시그널 감지

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 GitHub Actions (Scheduled)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   FRED   │  │   OECD   │  │   EIA    │  │  Yahoo   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │                                   │
│              ┌───────────▼───────────┐                      │
│              │  Python Collector     │                      │
│              │  (collect_data.py)    │                      │
│              └───────────┬───────────┘                      │
│                          │ JSON                              │
│              ┌───────────▼───────────┐                      │
│              │     /data/*.json      │                      │
│              └───────────────────────┘                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ git push
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Pages (Static)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  index.html + CSS + JavaScript                        │  │
│  │  ├── Lightweight Charts (커스텀 지표 차트)              │  │
│  │  ├── TradingView Widgets (실시간 주식 차트)            │  │
│  │  └── fetch(/data/*.json) → 대시보드 렌더링             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
sector-cycle-dashboard/
├── index.html              # 메인 대시보드
├── css/
│   └── styles.css          # 스타일시트
├── js/
│   ├── app.js              # 메인 애플리케이션 로직
│   ├── charts.js           # Lightweight Charts 모듈
│   └── tradingview.js      # TradingView 위젯 통합
├── data/
│   ├── latest.json         # 최신 스냅샷
│   ├── history.json        # 히스토리 데이터
│   └── sectors.json        # 섹터/종목 매핑
├── scripts/
│   ├── collect_data.py     # 데이터 수집 스크립트
│   └── requirements.txt    # Python 의존성
├── .github/
│   └── workflows/
│       ├── update-data.yml # 데이터 자동 갱신
│       └── deploy.yml      # GitHub Pages 배포
└── README.md               # 이 문서
```

---

## 🔧 Installation & Setup

### 1. Repository 복제

```bash
git clone https://github.com/YOUR_USERNAME/sector-cycle-dashboard.git
cd sector-cycle-dashboard
```

### 2. API 키 발급

| API | 발급 URL | 용도 |
|-----|----------|------|
| **FRED** | https://fred.stlouisfed.org/docs/api/api_key.html | VIX, 금리, 산업생산 등 |
| **EIA** | https://www.eia.gov/opendata/register.php | 원유 재고, 에너지 데이터 |

### 3. GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions 에서:

| Secret Name | Description |
|-------------|-------------|
| `FRED_API_KEY` | FRED API 키 |
| `EIA_API_KEY` | EIA API 키 |

### 4. GitHub Pages 활성화

Repository → Settings → Pages:
- Source: `GitHub Actions` 선택

### 5. 로컬 테스트

```bash
# Python 환경 설정
cd scripts
pip install -r requirements.txt

# 데이터 수집 테스트
python collect_data.py

# 로컬 서버 실행
cd ..
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

---

## 📊 Data Sources

### ✅ 사용 중인 데이터 소스

| 소스 | 지표 | 업데이트 주기 | 비고 |
|------|------|---------------|------|
| **FRED** | VIX, Yield Curve, Industrial Production | Daily/Monthly | 무료 API |
| **OECD** | CLI (Composite Leading Indicator) | Monthly | 무료 API |
| **EIA** | Crude Oil Inventory | Weekly | 무료 API |
| **Yahoo Finance** | BDI (via proxy) | Daily | 비공식 |
| **TradingView** | 실시간 주식 차트 | Real-time | 위젯 임베드 |

### 📚 참고 문서

- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/)
- [OECD CLI Indicator](https://www.oecd.org/en/data/indicators/composite-leading-indicator-cli.html)
- [EIA Open Data](https://www.eia.gov/opendata/)
- [Baltic Exchange Indices](https://www.balticexchange.com/en/data-services/market-information0/indices.html)
- [Cboe VIX Methodology](https://cdn.cboe.com/api/global/us_indices/governance/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf)

---

## 📈 Indicators Explained

### Macro Regime Score

거시경제 상태를 0-100 점수로 표현:

| Score | Status | Description |
|-------|--------|-------------|
| ≥ 65 | 🟢 Expansion | 경기 확장 국면 |
| 50-64 | 🟡 Normal | 안정적 성장 |
| 35-49 | 🟠 Slowdown | 성장 둔화 |
| < 35 | 🔴 Contraction | 경기 침체 |

**계산 방식:**
```
Score = (CLI 기울기 점수 + PMI 점수) / 2

- CLI 점수: (CLI값 - 98) / 4 * 100 (98-102 범위를 0-100으로 정규화)
- PMI 점수: (PMI - 30) / 40 * 100 (30-70 범위를 0-100으로 정규화)
```

### VIX Risk Gauge

| VIX Level | Status | Market Sentiment |
|-----------|--------|------------------|
| < 15 | 🟢 Low | 낮은 변동성, 안정 |
| 15-20 | 🟡 Normal | 정상 범위 |
| 20-30 | 🟠 Elevated | 상승된 불안 |
| > 30 | 🔴 High | 높은 공포/변동성 |

### Sector Cycle Phases

```
        ┌────────────────┐
        │   EXPANSION    │ ← 성장 가속, 수익 증가
        │   (확장)        │
        └───────┬────────┘
                │
    ┌───────────▼───────────┐
    │      SLOWDOWN         │ ← 성장 둔화, 여전히 양(+)
    │      (둔화)           │
    └───────────┬───────────┘
                │
        ┌───────▼────────┐
        │  CONTRACTION   │ ← 수축, 잠재적 침체
        │  (침체)         │
        └───────┬────────┘
                │
    ┌───────────▼───────────┐
    │      RECOVERY         │ ← 저점에서 회복 시작
    │      (회복)           │
    └───────────┬───────────┘
                │
                └──────────────► 다시 EXPANSION으로
```

---

## 🛠️ Customization

### 임계값 수정

[scripts/collect_data.py](scripts/collect_data.py)에서 `RegimeCalculator` 클래스의 임계값을 수정할 수 있습니다:

```python
# VIX 임계값
if vix_value < 15:
    regime['status'] = 'low'
elif vix_value < 20:
    regime['status'] = 'normal'
# ...

# Macro Score 임계값
if regime['score'] >= 65:
    regime['status'] = 'expansion'
# ...
```

### 섹터/종목 추가

[data/sectors.json](data/sectors.json)에서 섹터별 종목을 추가/수정할 수 있습니다.

---

## 📅 Update Schedule

| 데이터 | 스케줄 | GitHub Actions |
|--------|--------|----------------|
| 전체 데이터 | 매일 06:00 UTC (15:00 KST) | `update-data.yml` |
| 배포 | Push to main | `deploy.yml` |

수동 실행: Actions 탭 → `Update Economic Data` → `Run workflow`

---

## ⚠️ Disclaimer (면책 고지)

> **This dashboard is provided for informational purposes only.**
> 
> - It does **NOT** constitute investment advice, recommendation, or solicitation.
> - All investment decisions and any resulting profits or losses are **solely the responsibility of the user**.
> - Past performance is **NOT** indicative of future results.
> - The data may contain errors or delays. Always verify with official sources.
> - This project is **NOT** affiliated with any financial institution.

> **본 대시보드는 정보 제공 목적으로만 제공됩니다.**
> 
> - 투자 조언, 추천, 권유가 **아닙니다**.
> - 모든 투자 결정과 그에 따른 손익은 **전적으로 사용자 본인의 책임**입니다.
> - 과거 실적이 미래 수익을 **보장하지 않습니다**.
> - 데이터에 오류나 지연이 있을 수 있습니다. 공식 출처에서 항상 확인하세요.
> - 이 프로젝트는 어떤 금융 기관과도 **제휴되어 있지 않습니다**.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Contact

Questions or suggestions? Open an [Issue](https://github.com/YOUR_USERNAME/sector-cycle-dashboard/issues).

---

<p align="center">
  Made with ❤️ for better market understanding
</p>
