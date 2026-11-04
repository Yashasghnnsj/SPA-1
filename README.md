# FlinkGuard: Multi-Vector Threat Intelligence & ML Detection Platform

[![Python 3.12](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0.0-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-RF-F7931E?style=flat&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-CUDA%20GPU-EB5424?style=flat)](https://xgboost.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

FlinkGuard is an **Enterprise Zero-Trust Cyber Defense Platform** engineered to address both application-layer monetization fraud and network-layer data exfiltration.

By bridging offline machine learning models with live, crowd-sourced threat intelligence, FlinkGuard counters **data drift** and provides real-time detection across two critical threat vectors:
1. **Application-Layer**: Mobile Ad Click Fraud & Attribution Spoofing (Kaggle TalkingData).
2. **Network-Layer**: Command & Control (C2) DNS Tunneling & File Exfiltration (CIC-Bell-DNS dataset).
3. **Global Threat Intelligence**: Real-time IP reputation scoring via **AbuseIPDB v2** with persistent, thread-safe SQLite caching and hybrid risk fusion.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Data Sources & Training Pipelines
        A1[Kaggle TalkingData AdTracking<br/>train.csv / train_sample.csv] --> B1[train_talkingdata_model.py<br/>Streaming Feature Engineering]
        B1 --> C1[(XGBoost GPU Model<br/>CUDA RTX 4050)]
        
        A2[DNS Exfiltration Archives<br/>Light & Heavy Attacks/Benign] --> B2[train_dns_detector.py<br/>Entropy & Lexical Preprocessing]
        B2 --> C2[(Random Forest Model<br/>models/dns_detector_rf.joblib)]
    end

    subgraph Backend Microservice & External Intel
        C2 --> D[FastAPI Inference Engine<br/>dns_inference_api.py]
        E[AbuseIPDB REST API v2] -->|Live Threat Feed & SQLite Cache| F[threat_intel_service.py]
        F --> D
    end

    subgraph Frontend Application
        D -->|REST Endpoints<br/>/api/score-dns<br/>/api/evaluate-hybrid| G[React + Vite Frontend<br/>http://localhost:3000]
        C1 -.->|Metrics Artifacts<br/>public/dns_metrics.json| H[MLAnalyticsView.tsx<br/>Dual Model Interactive Toggle]
    end
```

---

## Key Modules & ML Pipelines

### 1. Application-Layer: Ad Click Fraud (XGBoost GPU)
* **Dataset**: Kaggle TalkingData AdTracking ($200\text{M}+$ clicks).
* **Feature Engineering**:
  * IP window click velocity (`clicks_from_same_ip`).
  * Device cycling and application diversity ratios (`unique_apps_per_ip`).
  * Grouping triplets: `[ip, app, channel]` and `[ip, device, os]`.
* **Model**: NVIDIA CUDA-accelerated `XGBClassifier` with `scale_pos_weight` handling extreme class imbalance ($< 0.2\%$ raw fraud rate).
* **Metrics**: ROC-AUC: **0.9625** | Precision: **99.90%** | Recall: **99.98%**.

### 2. Network-Layer: DNS Tunneling & Exfiltration (Random Forest)
* **Dataset**: 536,138 network flows from Light and Heavy traffic tiers.
* **Attack Coverage**: Detects unauthorized data encoded into DNS queries across multiple payload categories: `audio`, `compressed`, `exe`, `image`, `text`, and `video`.
* **Feature Engineering**:
  * Shannon Entropy of domain labels.
  * Lexical features: `longest_word_len`, `subdomain_length`, `FQDN_count`, and uppercase/numeric character ratios.
* **Model**: Multi-core `RandomForestClassifier` (100 estimators, max depth 16).
* **Metrics**: ROC-AUC: **0.8055** | Exfiltration Recall: **99.96%** | Benign Precision: **99.91%**.

### 3. Threat Intelligence & Hybrid Risk Fusion
* **AbuseIPDB v2 Integration**: Live IP confidence scores, ISP classification, and usage type checks.
* **Bogon & RFC-1918 Protection**: Automatically identifies internal/loopback IPs (e.g. `127.0.0.1`, `192.168.x.x`) to prevent HTTP 422 API errors.
* **Persistent SQLite Caching**: Thread-safe cache at `data/threat_cache.db` (24h TTL) prevents quota burnout across server restarts.
* **Hybrid Fusion Formula**:
  $$\text{Final Risk Score} = (\text{Local ML Probability} \times 0.60) + (\text{Normalized AbuseIPDB Score} \times 0.40)$$
  * Score $\ge 0.65 \implies$ **`BLOCK`**
  * Score $\ge 0.45 \implies$ **`FLAG`**
  * Score $< 0.45 \implies$ **`ALLOW`**

---

## Quick Start & Running the Project

### Prerequisites
* **Python**: 3.10+ (tested on Python 3.12)
* **Node.js**: v18+ and npm

### 1. One-Click Launch (Windows)
Run the root batch launcher to start both the FastAPI backend and React frontend simultaneously:
```cmd
run_demo.bat
```

---

### 2. Manual Startup (Two Terminals)

#### Terminal 1: Backend API (FastAPI)
```powershell
# Optional: Set up virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install Python requirements
pip install fastapi uvicorn pydantic scikit-learn pandas numpy joblib requests xgboost

# Start FastAPI Inference Server on Port 8000
python dns_inference_api.py
```
* Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

#### Terminal 2: Frontend Dashboard (Vite + React)
```powershell
# Install frontend dependencies
npm install

# Start development server
npm run dev
```
* Dashboard URL: `http://localhost:3000`

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check, model status, and cache connectivity |
| `GET` | `/api/model-metadata` | Active model lineage, version, and expected feature schema |
| `POST` | `/api/score-dns` | Scores domain string for C2 exfiltration with Random Forest |
| `POST` | `/api/check-ip` | Queries AbuseIPDB with persistent SQLite caching |
| `POST` | `/api/evaluate-hybrid` | Computes fused risk score combining ML probability and threat intel |

### Example CLI Testing:
```powershell
# Test live IP intelligence
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/check-ip" -Method Post -ContentType "application/json" -Body '{"ip": "118.25.6.39"}'

# Test DNS domain scoring
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/score-dns" -Method Post -ContentType "application/json" -Body '{"domain": "a8f82c4b.payload.exfiltration-tunnel.domain.com"}'
```

---

## Project Structure

```text
├── data/
│   ├── new/                      # Light & Heavy DNS exfiltration dataset archives
│   ├── threat_cache.db           # Persistent SQLite cache for AbuseIPDB lookups
│   └── train_sample.csv          # Sample Kaggle TalkingData ad clicks
├── models/
│   ├── dns_detector_rf.joblib    # Serialized Random Forest model artifact
│   └── dns_model_metadata.json   # Model versioning, hyperparams & feature schema
├── public/
│   └── dns_metrics.json          # Exported offline validation metrics
├── src/
│   ├── components/
│   │   ├── MLAnalyticsView.tsx   # Dual-model toggle & Live Threat Inspector
│   │   ├── DashboardView.tsx     # SOC real-time stream monitor
│   │   └── ArchitectureView.tsx  # System diagrams and telemetry specs
│   └── services/
│       └── streamSimulator.ts    # Streaming traffic emulator
├── dns_inference_api.py          # FastAPI scoring server with CORS & Pydantic validation
├── threat_intel_service.py       # AbuseIPDB threat intel & SQLite caching
├── train_dns_detector.py         # DNS Random Forest training script
├── train_talkingdata_model.py    # TalkingData XGBoost training script
├── run_demo.bat                  # One-click Windows runner
└── README.md                     # Project documentation
```

---

## Academic Defense & Viva Q&A Guide

* **Q: Why did you add DNS Exfiltration to an Ad Fraud project?**  
  * **A**: Modern botnets no longer operate solely at the application layer. Advanced fraud rings use DNS tunneling to communicate with Command-and-Control (C2) servers and rotate residential proxy IPs. Expanding the architecture provides a holistic, **Defense-in-Depth** platform covering both monetization fraud (Layer 7) and data theft/C2 channels (Layer 4/5).

* **Q: Why is the DNS ROC-AUC 0.8055 instead of 0.99?**  
  * **A**: An AUC of $0.8055$ reflects realistic generalization on over half a million raw, noisy network flows. Models scoring $0.99$ on DNS datasets typically suffer from synthetic target leakage (memorizing specific root domains). Our model classifies solely based on structural and informational entropy (`Shannon entropy`, `token length`, `subdomain depth`).

* **Q: Why Random Forest instead of Deep Learning for DNS?**  
  * **A**: Random Forest offers sub-millisecond inference latency ($< 0.8\text{ ms}$ per query), robust performance against tabular sparsity, and transparent feature interpretability without requiring dedicated GPU server infrastructure in production.
