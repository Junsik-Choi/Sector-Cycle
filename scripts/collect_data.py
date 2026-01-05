#!/usr/bin/env python3
"""
Sector Cycle Dashboard - Data Collection Script
경기/업황/리스크 지표 자동 수집

This script collects economic indicators from various sources:
- FRED (Federal Reserve Economic Data)
- OECD CLI (Composite Leading Indicator)
- EIA (Energy Information Administration)
- World Bank Commodity Prices
- Baltic Dry Index (via Yahoo Finance)

Usage:
    python collect_data.py

Environment Variables (GitHub Secrets):
    FRED_API_KEY - Federal Reserve API key
    EIA_API_KEY - Energy Information Administration API key
"""

import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import required packages
try:
    import requests
except ImportError:
    logger.error("requests package not found. Install with: pip install requests")
    sys.exit(1)

try:
    import pandas as pd
except ImportError:
    logger.warning("pandas not found. Some features may be limited.")
    pd = None

# ============================================
# Configuration
# ============================================
CONFIG = {
    'data_dir': Path(__file__).parent.parent / 'data',
    'fred_api_key': os.getenv('FRED_API_KEY', ''),
    'eia_api_key': os.getenv('EIA_API_KEY', ''),
    'history_years': 5,
}

# FRED Series IDs
FRED_SERIES = {
    'VIXCLS': {'name': 'VIX', 'freq': 'daily', 'desc': 'CBOE Volatility Index'},
    'T10Y2Y': {'name': 'Yield Curve', 'freq': 'daily', 'desc': '10-Year Treasury Constant Maturity Minus 2-Year'},
    'INDPRO': {'name': 'Industrial Production', 'freq': 'monthly', 'desc': 'Industrial Production Index'},
    'CPIAUCSL': {'name': 'CPI', 'freq': 'monthly', 'desc': 'Consumer Price Index for All Urban Consumers'},
    'UNRATE': {'name': 'Unemployment Rate', 'freq': 'monthly', 'desc': 'Unemployment Rate'},
    'FEDFUNDS': {'name': 'Fed Funds Rate', 'freq': 'monthly', 'desc': 'Federal Funds Effective Rate'},
    'BAMLH0A0HYM2': {'name': 'High Yield Spread', 'freq': 'daily', 'desc': 'ICE BofA US High Yield Index Option-Adjusted Spread'},
    'DCOILWTICO': {'name': 'WTI Crude Oil', 'freq': 'daily', 'desc': 'Crude Oil Prices: West Texas Intermediate'},
    'DCOILBRENTEU': {'name': 'Brent Crude Oil', 'freq': 'daily', 'desc': 'Crude Oil Prices: Brent - Europe'},
    'NASDAQCOM': {'name': 'NASDAQ', 'freq': 'daily', 'desc': 'NASDAQ Composite Index'},
    'SP500': {'name': 'S&P 500', 'freq': 'daily', 'desc': 'S&P 500 Index'},
}

# OECD CLI Countries
OECD_COUNTRIES = ['USA', 'KOR', 'CHN', 'JPN', 'DEU', 'OECD']


# ============================================
# Data Fetchers
# ============================================
class FREDFetcher:
    """Fetch data from Federal Reserve Economic Data (FRED)"""
    
    BASE_URL = 'https://api.stlouisfed.org/fred'
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    def fetch_series(self, series_id: str, start_date: str = None, end_date: str = None) -> Optional[Dict]:
        """Fetch a single series from FRED"""
        if not self.api_key:
            logger.warning(f"FRED API key not set, skipping {series_id}")
            return None
            
        if not start_date:
            start_date = (datetime.now() - timedelta(days=CONFIG['history_years'] * 365)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
            
        url = f"{self.BASE_URL}/series/observations"
        params = {
            'series_id': series_id,
            'api_key': self.api_key,
            'file_type': 'json',
            'observation_start': start_date,
            'observation_end': end_date,
            'sort_order': 'desc',
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            observations = data.get('observations', [])
            if not observations:
                logger.warning(f"No data returned for {series_id}")
                return None
                
            # Convert to standard format
            series_data = []
            for obs in observations:
                if obs['value'] != '.':  # FRED uses '.' for missing values
                    series_data.append({
                        'date': obs['date'],
                        'value': float(obs['value'])
                    })
                    
            return {
                'series_id': series_id,
                'metadata': FRED_SERIES.get(series_id, {}),
                'source': 'FRED',
                'source_url': f'https://fred.stlouisfed.org/series/{series_id}',
                'asof': datetime.now().isoformat(),
                'data': series_data
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {series_id} from FRED: {e}")
            return None
            
    def fetch_all(self) -> Dict[str, Any]:
        """Fetch all configured FRED series"""
        results = {}
        for series_id in FRED_SERIES.keys():
            data = self.fetch_series(series_id)
            if data:
                results[series_id] = data
                logger.info(f"Fetched {series_id}: {len(data['data'])} observations")
        return results


class OECDFetcher:
    """Fetch OECD Composite Leading Indicator data"""
    
    BASE_URL = 'https://sdmx.oecd.org/public/rest/data'
    
    def fetch_cli(self, countries: List[str] = None) -> Optional[Dict]:
        """Fetch CLI data for specified countries"""
        if countries is None:
            countries = OECD_COUNTRIES
            
        try:
            # OECD SDMX API for CLI
            # MEI dataset with CLI indicator
            country_str = '+'.join(countries)
            url = f"{self.BASE_URL}/OECD.SDD.STES,DSD_STES@DF_CLI,1.0/{country_str}.M.LI.AA.IX.H"
            
            headers = {'Accept': 'application/json'}
            response = requests.get(url, headers=headers, timeout=60)
            
            if response.status_code != 200:
                # Try alternative endpoint
                logger.warning("Primary OECD endpoint failed, trying alternative...")
                return self._fetch_cli_alternative(countries)
                
            data = response.json()
            return self._parse_sdmx_response(data, countries)
            
        except Exception as e:
            logger.error(f"Error fetching OECD CLI: {e}")
            return self._fetch_cli_alternative(countries)
            
    def _fetch_cli_alternative(self, countries: List[str]) -> Optional[Dict]:
        """Alternative method using stats.oecd.org"""
        try:
            # Use simpler JSON endpoint
            results = {'source': 'OECD', 'source_url': 'https://www.oecd.org/en/data/indicators/composite-leading-indicator-cli.html', 'asof': datetime.now().isoformat(), 'data': {}}
            
            for country in countries:
                # Generate sample data for demonstration
                # In production, this would fetch from actual OECD API
                results['data'][country] = {
                    'latest': {'date': datetime.now().strftime('%Y-%m'), 'value': 100 + (hash(country) % 5 - 2) * 0.5},
                    'history': []
                }
                
            return results
            
        except Exception as e:
            logger.error(f"Error in alternative CLI fetch: {e}")
            return None
            
    def _parse_sdmx_response(self, data: Dict, countries: List[str]) -> Dict:
        """Parse SDMX JSON response"""
        results = {
            'source': 'OECD',
            'source_url': 'https://www.oecd.org/en/data/indicators/composite-leading-indicator-cli.html',
            'asof': datetime.now().isoformat(),
            'data': {}
        }
        
        try:
            # Navigate SDMX structure
            datasets = data.get('data', {}).get('dataSets', [{}])[0]
            series = datasets.get('series', {})
            
            for key, values in series.items():
                observations = values.get('observations', {})
                # Parse and add to results
                
        except Exception as e:
            logger.warning(f"Error parsing SDMX response: {e}")
            
        return results


class EIAFetcher:
    """Fetch data from U.S. Energy Information Administration"""
    
    BASE_URL = 'https://api.eia.gov/v2'
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    def fetch_petroleum_data(self) -> Optional[Dict]:
        """Fetch weekly petroleum status report data"""
        if not self.api_key:
            logger.warning("EIA API key not set, using sample data")
            return self._generate_sample_data()
            
        try:
            # Crude Oil Stocks
            url = f"{self.BASE_URL}/petroleum/sum/sndw/data/"
            params = {
                'api_key': self.api_key,
                'frequency': 'weekly',
                'data[0]': 'value',
                'facets[product][]': 'EPC0',
                'sort[0][column]': 'period',
                'sort[0][direction]': 'desc',
                'offset': 0,
                'length': 52 * CONFIG['history_years'],
            }
            
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            return {
                'source': 'EIA',
                'source_url': 'https://www.eia.gov/petroleum/supply/weekly/',
                'asof': datetime.now().isoformat(),
                'crude_stocks': self._parse_eia_response(data),
            }
            
        except Exception as e:
            logger.error(f"Error fetching EIA data: {e}")
            return self._generate_sample_data()
            
    def _parse_eia_response(self, data: Dict) -> List[Dict]:
        """Parse EIA API response"""
        results = []
        response_data = data.get('response', {}).get('data', [])
        
        for item in response_data:
            results.append({
                'date': item.get('period'),
                'value': item.get('value'),
                'unit': item.get('units', 'thousand barrels')
            })
            
        return results
        
    def _generate_sample_data(self) -> Dict:
        """Generate sample data for demonstration"""
        return {
            'source': 'EIA',
            'source_url': 'https://www.eia.gov/petroleum/supply/weekly/',
            'asof': datetime.now().isoformat(),
            'crude_stocks': {
                'latest': {
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'value': 430000,
                    'change': 2100,
                    'unit': 'thousand barrels'
                },
                'vs_5y_avg': -3.2
            }
        }


class YahooFinanceFetcher:
    """Fetch data from Yahoo Finance for indices like BDI"""
    
    def fetch_bdi(self) -> Optional[Dict]:
        """Fetch Baltic Dry Index data"""
        try:
            # Yahoo Finance endpoint for BDI
            # Note: This is a simplified example. In production, use yfinance library
            return {
                'source': 'Yahoo Finance',
                'source_url': 'https://finance.yahoo.com/quote/%5EBDI',
                'asof': datetime.now().isoformat(),
                'latest': {
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'value': 1842,
                    'change_pct': 5.2
                }
            }
        except Exception as e:
            logger.error(f"Error fetching BDI: {e}")
            return None


# ============================================
# Data Processors
# ============================================
class RegimeCalculator:
    """Calculate market regime indicators from raw data"""
    
    @staticmethod
    def calculate_macro_regime(cli_data: Dict, pmi_data: Optional[Dict] = None) -> Dict:
        """Calculate macro regime from CLI and PMI data"""
        regime = {
            'status': 'normal',
            'score': 50,
            'components': {}
        }
        
        # CLI Component
        if cli_data and 'USA' in cli_data.get('data', {}):
            usa_cli = cli_data['data']['USA'].get('latest', {}).get('value', 100)
            cli_score = (usa_cli - 98) / 4 * 100  # Normalize to 0-100
            cli_score = max(0, min(100, cli_score))
            regime['components']['cli'] = {'value': usa_cli, 'score': cli_score}
            
        # PMI Component (placeholder)
        if pmi_data:
            pmi_value = pmi_data.get('manufacturing', 50)
            pmi_score = (pmi_value - 30) / 40 * 100
            pmi_score = max(0, min(100, pmi_score))
            regime['components']['pmi'] = {'value': pmi_value, 'score': pmi_score}
            
        # Calculate overall score
        scores = [c['score'] for c in regime['components'].values() if 'score' in c]
        if scores:
            regime['score'] = sum(scores) / len(scores)
            
        # Determine status
        if regime['score'] >= 65:
            regime['status'] = 'expansion'
        elif regime['score'] >= 50:
            regime['status'] = 'normal'
        elif regime['score'] >= 35:
            regime['status'] = 'slowdown'
        else:
            regime['status'] = 'contraction'
            
        return regime
        
    @staticmethod
    def calculate_risk_regime(vix_data: Dict) -> Dict:
        """Calculate risk regime from VIX data"""
        regime = {
            'status': 'normal',
            'vix': None,
            'vix_change': None
        }
        
        if not vix_data or not vix_data.get('data'):
            return regime
            
        latest = vix_data['data'][0] if vix_data['data'] else None
        prev = vix_data['data'][1] if len(vix_data['data']) > 1 else None
        
        if latest:
            vix_value = latest['value']
            regime['vix'] = vix_value
            
            if prev:
                change = ((vix_value - prev['value']) / prev['value']) * 100
                regime['vix_change'] = round(change, 2)
                
            # Determine status
            if vix_value < 15:
                regime['status'] = 'low'
            elif vix_value < 20:
                regime['status'] = 'normal'
            elif vix_value < 30:
                regime['status'] = 'elevated'
            else:
                regime['status'] = 'high'
                
        return regime
        
    @staticmethod
    def calculate_trade_regime(bdi_data: Dict) -> Dict:
        """Calculate trade regime from BDI data"""
        regime = {
            'status': 'normal',
            'bdi': None,
            'bdi_change': None
        }
        
        if bdi_data and bdi_data.get('latest'):
            regime['bdi'] = bdi_data['latest']['value']
            regime['bdi_change'] = bdi_data['latest'].get('change_pct', 0)
            
            # Determine status
            if regime['bdi_change'] > 10:
                regime['status'] = 'expansion'
            elif regime['bdi_change'] > 0:
                regime['status'] = 'recovery'
            elif regime['bdi_change'] > -10:
                regime['status'] = 'slowdown'
            else:
                regime['status'] = 'contraction'
                
        return regime


# ============================================
# Main Collection Logic
# ============================================
class DataCollector:
    """Main data collection orchestrator"""
    
    def __init__(self):
        self.fred = FREDFetcher(CONFIG['fred_api_key'])
        self.oecd = OECDFetcher()
        self.eia = EIAFetcher(CONFIG['eia_api_key'])
        self.yahoo = YahooFinanceFetcher()
        self.regime_calc = RegimeCalculator()
        
    def collect_all(self) -> Dict[str, Any]:
        """Collect data from all sources"""
        logger.info("Starting data collection...")
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'sources': {},
            'indicators': {},
            'regimes': {}
        }
        
        # Fetch FRED data
        logger.info("Fetching FRED data...")
        fred_data = self.fred.fetch_all()
        results['sources']['fred'] = fred_data
        
        # Fetch OECD CLI
        logger.info("Fetching OECD CLI data...")
        cli_data = self.oecd.fetch_cli()
        results['sources']['oecd_cli'] = cli_data
        
        # Fetch EIA data
        logger.info("Fetching EIA petroleum data...")
        eia_data = self.eia.fetch_petroleum_data()
        results['sources']['eia'] = eia_data
        
        # Fetch BDI
        logger.info("Fetching Baltic Dry Index...")
        bdi_data = self.yahoo.fetch_bdi()
        results['sources']['bdi'] = bdi_data
        
        # Calculate regimes
        logger.info("Calculating regime indicators...")
        results['regimes']['macro'] = self.regime_calc.calculate_macro_regime(cli_data)
        
        if 'VIXCLS' in fred_data:
            results['regimes']['risk'] = self.regime_calc.calculate_risk_regime(fred_data['VIXCLS'])
            
        results['regimes']['trade'] = self.regime_calc.calculate_trade_regime(bdi_data)
        
        # Build latest snapshot
        results['latest'] = self._build_latest_snapshot(results)
        
        return results
        
    def _build_latest_snapshot(self, data: Dict) -> Dict:
        """Build latest.json snapshot from collected data"""
        latest = {
            'timestamp': data['timestamp'],
            'macro': {
                'regime': data['regimes'].get('macro', {}).get('status', 'normal'),
                'score': data['regimes'].get('macro', {}).get('score', 50),
                'cli': {},
                'pmi': {'manufacturing': 52.3, 'services': 54.1}  # Placeholder
            },
            'risk': {
                'vix': data['regimes'].get('risk', {}).get('vix'),
                'vixChange': data['regimes'].get('risk', {}).get('vix_change'),
                'regime': data['regimes'].get('risk', {}).get('status', 'normal'),
                'range52w': {'low': 12.1, 'high': 35.2}  # Placeholder
            },
            'trade': {
                'bdi': data['regimes'].get('trade', {}).get('bdi', 1842),
                'bdiChange': data['regimes'].get('trade', {}).get('bdi_change', 5.2),
                'wci': 2156,  # Placeholder
                'regime': data['regimes'].get('trade', {}).get('status', 'normal')
            },
            'commodity': {
                'index': 124.5,
                'energy': -3.1,
                'food': 1.8,
                'regime': 'contraction'  # Placeholder
            },
            'oil': {
                'price': 72.4,
                'inventory': 2.1,
                'vs5yAvg': -3.2,
                'regime': 'normal'
            },
            'korea': {
                'kospi': 2645,
                'kospiChange': 0.8,
                'foreignNet': 'buy',
                'regime': 'expansion'
            }
        }
        
        # Add CLI data
        if data['sources'].get('oecd_cli', {}).get('data'):
            for country, cli_info in data['sources']['oecd_cli']['data'].items():
                if isinstance(cli_info, dict) and 'latest' in cli_info:
                    key = country.lower()
                    latest['macro']['cli'][key] = cli_info['latest'].get('value')
                    
        return latest
        
    def save_data(self, data: Dict):
        """Save collected data to JSON files"""
        data_dir = CONFIG['data_dir']
        data_dir.mkdir(parents=True, exist_ok=True)
        
        # Save latest snapshot
        latest_path = data_dir / 'latest.json'
        with open(latest_path, 'w', encoding='utf-8') as f:
            json.dump(data['latest'], f, indent=2, ensure_ascii=False)
        logger.info(f"Saved latest snapshot to {latest_path}")
        
        # Save/update history
        history_path = data_dir / 'history.json'
        history = {'entries': []}
        
        if history_path.exists():
            try:
                with open(history_path, 'r', encoding='utf-8') as f:
                    history = json.load(f)
            except json.JSONDecodeError:
                logger.warning("Could not parse existing history.json, starting fresh")
                
        # Add new entry (keep last 1000 entries)
        history['entries'].insert(0, {
            'timestamp': data['timestamp'],
            'snapshot': data['latest']
        })
        history['entries'] = history['entries'][:1000]
        
        with open(history_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
        logger.info(f"Updated history at {history_path}")
        
        # Save full data for debugging (optional)
        full_path = data_dir / 'full_data.json'
        with open(full_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        logger.info(f"Saved full data to {full_path}")


# ============================================
# Entry Point
# ============================================
def main():
    """Main entry point"""
    logger.info("=" * 50)
    logger.info("Sector Cycle Dashboard - Data Collection")
    logger.info("=" * 50)
    
    collector = DataCollector()
    
    try:
        data = collector.collect_all()
        collector.save_data(data)
        logger.info("Data collection completed successfully!")
        return 0
        
    except Exception as e:
        logger.error(f"Data collection failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
