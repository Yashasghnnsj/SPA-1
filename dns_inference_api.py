"""
FastAPI Enterprise Real-time Inference Server
- DNS Exfiltration Detection (Random Forest Model with Metadata Validation)
- Threat Intelligence (AbuseIPDB with Thread-Safe SQLite Persistence)
- Strict Pydantic Input Validation & Error Boundaries
"""

import math
import collections
import os
import json
import re
import ipaddress
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any

from threat_intel_service import get_ip_reputation, hybrid_fusion_risk_score

app = FastAPI(
    title="FlinkGuard Enterprise Threat Intelligence & ML Scoring API",
    version="2.0.0",
    description="Production-grade inference gateway with persistent caching, schema validation, and model metadata verification."
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "dns_detector_rf.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "dns_model_metadata.json")

model = None
model_metadata: Dict[str, Any] = {}

def load_model_and_metadata():
    global model, model_metadata
    # 1. Load Metadata
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, 'r') as f:
                model_metadata = json.load(f)
            print(f"[+] Loaded Model Metadata (version {model_metadata.get('version')})")
        except Exception as e:
            print(f"[!] Warning: Failed to read model metadata: {e}")

    # 2. Load Model Weights
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print(f"[+] Loaded DNS detector model from {MODEL_PATH}")
        except Exception as e:
            print(f"[!] Critical: Failed to deserialize model: {e}")
    else:
        print(f"[!] Model file not found at {MODEL_PATH}")

load_model_and_metadata()

# Dynamic Feature Schema from Metadata (Fallback provided)
FEATURE_COLUMNS = model_metadata.get("feature_columns", [
    'FQDN_count', 'subdomain_length', 'upper', 'lower', 'numeric',
    'entropy', 'special', 'labels', 'labels_max', 'labels_average',
    'len', 'subdomain', 'longest_word_len', 'sld_len'
])

# ==============================================================================
# Enterprise Pydantic Request Models with Strict Validation
# ==============================================================================

DOMAIN_REGEX = re.compile(
    r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$'
)

class DNSQueryPayload(BaseModel):
    domain: str = Field(..., example="a8f82c4b.payload.exfiltration-tunnel.domain.com", min_length=3, max_length=253)
    FQDN_count: Optional[int] = Field(None, ge=0, le=1000)
    subdomain_length: Optional[int] = Field(None, ge=0, le=500)
    upper: Optional[int] = Field(None, ge=0)
    lower: Optional[int] = Field(None, ge=0)
    numeric: Optional[int] = Field(None, ge=0)
    entropy: Optional[float] = Field(None, ge=0.0, le=8.0)
    special: Optional[int] = Field(None, ge=0)
    labels: Optional[int] = Field(None, ge=1, le=127)
    labels_max: Optional[int] = Field(None, ge=0, le=63)
    labels_average: Optional[float] = Field(None, ge=0.0)
    len: Optional[int] = Field(None, ge=0)
    subdomain: Optional[int] = Field(None, ge=0, le=1)
    longest_word_len: Optional[int] = Field(None, ge=0, le=100)
    sld_len: Optional[int] = Field(None, ge=0, le=100)

    @field_validator('domain')
    @classmethod
    def validate_domain_format(cls, v: str) -> str:
        clean_v = v.strip().lower()
        if not clean_v:
            raise ValueError("Domain cannot be empty or only whitespace.")
        # Basic sanity check
        if ".." in clean_v or clean_v.startswith('.') or clean_v.endswith('.'):
            raise ValueError("Domain cannot start/end with dot or contain consecutive dots.")
        return clean_v

class IPCheckPayload(BaseModel):
    ip: str = Field(..., example="118.25.6.39")

    @field_validator('ip')
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        clean_ip = v.strip()
        try:
            # Validates both IPv4 and IPv6 syntax strictly
            parsed = ipaddress.ip_address(clean_ip)
            return str(parsed)
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IPv4 or IPv6 address.")

class HybridEvaluationPayload(BaseModel):
    ip: str = Field(..., example="118.25.6.39")
    ml_fraud_probability: float = Field(..., ge=0.0, le=1.0, example=0.85)
    ml_weight: float = Field(0.60, ge=0.0, le=1.0, example=0.60)

    @field_validator('ip')
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        clean_ip = v.strip()
        try:
            parsed = ipaddress.ip_address(clean_ip)
            return str(parsed)
        except ValueError:
            raise ValueError(f"'{v}' is not a valid IPv4 or IPv6 address.")

# ==============================================================================
# Helper Feature Extraction
# ==============================================================================

def compute_entropy(text: str) -> float:
    if not text:
        return 0.0
    entropy = 0.0
    length = len(text)
    counts = collections.Counter(text)
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def extract_domain_features(payload: DNSQueryPayload) -> tuple[pd.DataFrame, dict]:
    domain = payload.domain
    parts = [p for p in domain.split('.') if p]
    labels_count = len(parts)

    subdomain_str = '.'.join(parts[:-2]) if labels_count > 2 else ''
    longest_word = max(parts, key=len) if parts else ''
    sld = parts[-2] if labels_count >= 2 else (parts[0] if parts else '')

    row = {
        'FQDN_count': payload.FQDN_count if payload.FQDN_count is not None else len(domain),
        'subdomain_length': payload.subdomain_length if payload.subdomain_length is not None else len(subdomain_str),
        'upper': payload.upper if payload.upper is not None else sum(1 for c in domain if c.isupper()),
        'lower': payload.lower if payload.lower is not None else sum(1 for c in domain if c.islower()),
        'numeric': payload.numeric if payload.numeric is not None else sum(1 for c in domain if c.isdigit()),
        'entropy': payload.entropy if payload.entropy is not None else compute_entropy(domain),
        'special': payload.special if payload.special is not None else sum(1 for c in domain if not c.isalnum() and c != '.'),
        'labels': payload.labels if payload.labels is not None else labels_count,
        'labels_max': payload.labels_max if payload.labels_max is not None else max((len(p) for p in parts), default=0),
        'labels_average': payload.labels_average if payload.labels_average is not None else (float(np.mean([len(p) for p in parts])) if parts else 0.0),
        'len': payload.len if payload.len is not None else len(domain),
        'subdomain': payload.subdomain if payload.subdomain is not None else (1 if subdomain_str else 0),
        'longest_word_len': payload.longest_word_len if payload.longest_word_len is not None else len(longest_word),
        'sld_len': payload.sld_len if payload.sld_len is not None else len(sld)
    }

    df = pd.DataFrame([row], columns=FEATURE_COLUMNS)
    return df, row

# ==============================================================================
# API Endpoints
# ==============================================================================

@app.get("/api/health", tags=["Monitoring"])
def health():
    return {
        "status": "online",
        "dns_model_loaded": model is not None,
        "model_version": model_metadata.get("version", "1.0.0"),
        "threat_cache_persistence": "SQLite (thread-safe)",
        "expected_features_count": len(FEATURE_COLUMNS)
    }

@app.get("/api/model-metadata", tags=["MLOps"])
def get_metadata():
    if not model_metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Model metadata artifact not found."
        )
    return model_metadata

@app.post("/api/score-dns", tags=["ML Inference"])
def score_dns(payload: DNSQueryPayload):
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="DNS detection model is not loaded."
        )

    df_features, feature_dict = extract_domain_features(payload)

    try:
        probabilities = model.predict_proba(df_features)[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}"
        )

    benign_prob = float(probabilities[0])
    exfil_prob = float(probabilities[1]) if len(probabilities) > 1 else (1.0 - benign_prob)

    is_exfiltration = exfil_prob > 0.50
    risk_level = "CRITICAL" if exfil_prob > 0.85 else ("HIGH" if exfil_prob > 0.65 else ("MEDIUM" if exfil_prob > 0.45 else "LOW"))

    return {
        "domain": payload.domain,
        "is_exfiltration": is_exfiltration,
        "classification": "Exfiltration Payload / Malicious Tunnel" if is_exfiltration else "Legitimate DNS Traffic",
        "confidence": round(max(exfil_prob, benign_prob) * 100, 2),
        "exfiltration_probability": round(exfil_prob * 100, 2),
        "benign_probability": round(benign_prob * 100, 2),
        "risk_level": risk_level,
        "features_evaluated": feature_dict
    }

@app.post("/api/check-ip", tags=["Threat Intelligence"])
def check_ip(payload: IPCheckPayload):
    return get_ip_reputation(payload.ip)

@app.post("/api/evaluate-hybrid", tags=["Threat Intelligence"])
def evaluate_hybrid(payload: HybridEvaluationPayload):
    threat_info = get_ip_reputation(payload.ip)
    fusion_result = hybrid_fusion_risk_score(
        ml_fraud_prob=payload.ml_fraud_probability,
        abuse_info=threat_info,
        ml_weight=payload.ml_weight
    )
    return fusion_result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("dns_inference_api:app", host="127.0.0.1", port=8000, reload=True)
