"""
Threat Intelligence Service - AbuseIPDB Integration
Features:
- Bogon / Private / Loopback IP address pre-validation (prevents AbuseIPDB 422 Unprocessable Entity)
- Persistent, process-safe and thread-safe SQLite-backed caching (survives server restarts)
- Real-time AbuseIPDB v2 lookup with quota and missing-key fallback safety
- Hybrid Fusion Decision Logic
"""

import os
import time
import json
import sqlite3
import threading
import ipaddress
import requests
from typing import Dict, Any, Optional

ABUSEIPDB_API_URL = "https://api.abuseipdb.com/api/v2/check"
DEFAULT_API_KEY = os.getenv(
    "ABUSEIPDB_API_KEY", 
    "7853eaaa5f8c70314ec902752470c2a602e2f79ceb88493ab1c40bab3c9277c1d5c20d8c1e38dc17"
)

CACHE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "threat_cache.db")
CACHE_TTL_SECONDS = 3600 * 24  # 24-hour cache persistence to strictly protect quota
_cache_lock = threading.Lock()

def _init_sqlite_cache():
    """Initializes SQLite cache schema."""
    os.makedirs(os.path.dirname(CACHE_DB_PATH), exist_ok=True)
    with _cache_lock:
        with sqlite3.connect(CACHE_DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ip_reputation_cache (
                    ip TEXT PRIMARY KEY,
                    data_json TEXT NOT NULL,
                    cached_at REAL NOT NULL
                )
            """)
            conn.commit()

_init_sqlite_cache()

def is_public_ip(ip_str: str) -> bool:
    """Validates if an IP address is a public routable address (filters Bogon/Private/Loopback)."""
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        return not (ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_multicast or ip.is_link_local)
    except ValueError:
        return False

def get_cached_ip(ip_address: str) -> Optional[Dict[str, Any]]:
    """Retrieves IP from persistent SQLite cache if within TTL."""
    now = time.time()
    with _cache_lock:
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT data_json, cached_at FROM ip_reputation_cache WHERE ip = ?", 
                    (ip_address,)
                )
                row = cursor.fetchone()
                if row:
                    data_json, cached_at = row
                    if now - cached_at < CACHE_TTL_SECONDS:
                        record = json.loads(data_json)
                        record['cached'] = True
                        record['cache_age_seconds'] = int(now - cached_at)
                        return record
        except Exception as e:
            print(f"[!] Cache read error for {ip_address}: {e}")
    return None

def set_cached_ip(ip_address: str, data: Dict[str, Any]):
    """Saves IP threat intel to persistent SQLite cache."""
    now = time.time()
    with _cache_lock:
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO ip_reputation_cache (ip, data_json, cached_at) VALUES (?, ?, ?)",
                    (ip_address, json.dumps(data), now)
                )
                conn.commit()
        except Exception as e:
            print(f"[!] Cache write error for {ip_address}: {e}")

def check_abuseipdb_raw(ip_address: str, api_key: str = DEFAULT_API_KEY) -> Optional[Dict[str, Any]]:
    """Direct lookup to AbuseIPDB REST API v2 with Bogon and Quota handling."""
    if not api_key:
        print("[!] AbuseIPDB API key not configured. Serving local threat assessment.")
        return None

    headers = {
        'Accept': 'application/json',
        'Key': api_key
    }
    querystring = {
        'ipAddress': ip_address.strip(),
        'maxAgeInDays': '90',
        'verbose': True
    }

    try:
        response = requests.get(ABUSEIPDB_API_URL, headers=headers, params=querystring, timeout=8)
        
        # If rate limit exceeded (HTTP 429) or unprocessable (HTTP 422)
        if response.status_code == 429:
            print(f"[!] AbuseIPDB rate limit (1,000/day) reached. Serving fallback intelligence.")
            return None
        if response.status_code == 422:
            print(f"[!] AbuseIPDB rejected address {ip_address} as unroutable/private.")
            return None

        response.raise_for_status()
        raw_data = response.json().get('data', {})

        abuse_score = raw_data.get('abuseConfidenceScore', 0)
        return {
            'ip': raw_data.get('ipAddress', ip_address),
            'is_public': raw_data.get('isPublic', True),
            'is_whitelisted': raw_data.get('isWhitelisted', False),
            'abuse_confidence_score': abuse_score,                  # 0 to 100
            'normalized_abuse_score': round(abuse_score / 100.0, 4), # 0.0 to 1.0
            'country_code': raw_data.get('countryCode', 'Unknown'),
            'usage_type': raw_data.get('usageType', 'Unknown'),
            'isp': raw_data.get('isp', 'Unknown'),
            'domain': raw_data.get('domain', ''),
            'is_tor': raw_data.get('isTor', False),
            'total_reports': raw_data.get('totalReports', 0),
            'last_reported_at': raw_data.get('lastReportedAt', None),
            'source': 'AbuseIPDB Live API'
        }
    except requests.exceptions.RequestException as e:
        print(f"[!] Error querying AbuseIPDB for {ip_address}: {e}")
        return None

def get_ip_reputation(ip_address: str, api_key: str = DEFAULT_API_KEY) -> Dict[str, Any]:
    """
    Thread-safe and restart-persistent cached IP lookup.
    Prevents API 422 errors on private/bogon IPs.
    """
    ip_clean = ip_address.strip()

    # 1. Intercept private / loopback / bogon IP addresses
    if not is_public_ip(ip_clean):
        return {
            'ip': ip_clean,
            'is_public': False,
            'is_whitelisted': True,
            'abuse_confidence_score': 0,
            'normalized_abuse_score': 0.0,
            'country_code': 'LOCAL',
            'usage_type': 'Private LAN / RFC-1918 / Loopback',
            'isp': 'Internal Local Network',
            'domain': 'internal.lan',
            'is_tor': False,
            'total_reports': 0,
            'last_reported_at': None,
            'cached': True,
            'note': 'Private / RFC-1918 internal IP. Bypassed external threat intel check.'
        }

    # 2. Check persistent SQLite cache
    cached = get_cached_ip(ip_clean)
    if cached:
        return cached

    # 3. Query live AbuseIPDB API
    fresh = check_abuseipdb_raw(ip_clean, api_key)
    if fresh:
        set_cached_ip(ip_clean, fresh)
        fresh['cached'] = False
        return fresh

    # 4. Graceful fallback on network failure or rate-limit
    return {
        'ip': ip_clean,
        'is_public': True,
        'is_whitelisted': False,
        'abuse_confidence_score': 0,
        'normalized_abuse_score': 0.0,
        'country_code': 'XX',
        'usage_type': 'Unknown Network',
        'isp': 'Fallback Provider',
        'domain': '',
        'is_tor': False,
        'total_reports': 0,
        'last_reported_at': None,
        'cached': False,
        'fallback': True
    }

def hybrid_fusion_risk_score(ml_fraud_prob: float, abuse_info: Dict[str, Any], ml_weight: float = 0.60) -> Dict[str, Any]:
    """
    Blends local ML behavioral score with external threat intelligence:
    Final Score = (ML_Prob * ml_weight) + (AbuseIPDB_Score * (1 - ml_weight))
    """
    intel_weight = 1.0 - ml_weight
    intel_score = abuse_info.get('normalized_abuse_score', 0.0)

    # Tor exit nodes or 100% abuse confidence receive high elevation
    if abuse_info.get('is_tor', False):
        intel_score = max(intel_score, 0.95)

    final_score = (ml_fraud_prob * ml_weight) + (intel_score * intel_weight)
    final_score = min(max(final_score, 0.0), 1.0)

    is_blocked = final_score >= 0.65
    action = "BLOCK" if is_blocked else ("FLAG" if final_score >= 0.45 else "ALLOW")

    return {
        "final_risk_score": round(final_score, 4),
        "ml_probability": round(ml_fraud_prob, 4),
        "abuseipdb_score": round(intel_score, 4),
        "ml_weight": ml_weight,
        "intel_weight": round(intel_weight, 2),
        "action": action,
        "is_blocked": is_blocked,
        "threat_intel": abuse_info
    }
