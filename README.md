# HEALTH-AI — ML Visualisation Tool
### Sprint 1–5 Complete Implementation

> Full-stack clinical ML pipeline: 20 domains · 6 models · Explainability · Bias detection · EU AI Act · PDF Certificate

---

## 🚀 Quick Start (30 seconds)

```bash
git clone <repo>
cd healthcare-ml
docker-compose up --build
```

Open **http://localhost:5173** — the full pipeline is live.

---

## 🏗️ Architecture

```
healthcare-ml/
├── backend/
│   ├── main.py          # FastAPI + Scikit-learn (all ML logic)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Root: stepper routing
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── DomainBar.jsx     # 20 domain pills
│   │   │   ├── Stepper.jsx       # 7-step progress bar
│   │   │   ├── Step1Clinical.jsx # Domain selection
│   │   │   ├── Step2Upload.jsx   # CSV upload + Column Mapper modal
│   │   │   ├── Step3Prepare.jsx  # Normalisation + SMOTE + before/after charts
│   │   │   ├── Step4Model.jsx    # 6 models + KNN canvas + comparison table
│   │   │   ├── Step5Results.jsx  # ROC + Confusion Matrix + metrics
│   │   │   ├── Step6Explain.jsx  # Feature Importance + Waterfall
│   │   │   ├── Step7Ethics.jsx   # Bias table + EU AI Act + PDF
│   │   │   └── ui.jsx            # Card, Btn, MetricBadge, Spinner
│   │   └── utils/api.js          # All Axios API calls
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml            # Production
├── docker-compose.dev.yml        # Hot-reload dev
└── README.md
```

---

## 🛠️ Tech Stack

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS + Recharts    |
| Backend   | FastAPI + Scikit-learn + Pandas + NumPy      |
| PDF       | ReportLab                                    |
| DevOps    | Docker + docker-compose                      |

---

## 📋 Sprint Coverage

### Sprint 1 — Clinical Context ✅
- 20 clinical domains with icons, descriptions, clinical features
- Domain switching resets pipeline state
- Clinical sense-check banners per domain
- `POST /api/domain/{key}` sets active domain

### Sprint 2 — Data Preparation ✅
- CSV drag-and-drop upload + sample data generation
- Column Mapper modal: technical → clinical name mapping
- Missing value detection and column statistics
- Schema gate: Step 3 locked until mapping saved
- `POST /api/upload`, `POST /api/map-columns`

### Sprint 3 — Data Exploration ✅
- Standard / Min-Max / None normalisation
- Mean / Median / Drop missing value strategies
- SMOTE class balancing (synthetic minority oversampling)
- Before/after normalisation bar charts (mean + std dev)
- Class balance pie charts before/after
- `POST /api/prepare`

### Sprint 4 — Model & Parameters ✅
- **6 models:** KNN, SVM, Decision Tree, Random Forest, Logistic Regression, Naïve Bayes
- KNN canvas redraws on K change (< 16ms — pure Canvas 2D)
- Auto-retrain on slider change with 300ms debounce
- Clinical tooltips per model parameter
- Model comparison table (add multiple models)
- `POST /api/train`, `POST /api/train/quick`

### Sprint 5 — Results ✅  *(Sprint 2 deliverables)*
- Accuracy, Sensitivity, Specificity, Precision, F1, AUC — all with colour thresholds
- Confusion Matrix (2×2 grid, TN/FP/FN/TP, clinical labels, FN red banner)
- ROC Curve (SVG inline via Recharts AreaChart, diagonal reference line)
- Low Sensitivity Danger Banner (< 50%)
- Clinical interpretation paragraphs per metric band

### Sprint 3 — Explainability (Step 6) ✅
- Global Feature Importance: horizontal bar, sorted descending, 0.00–1.00
- Patient selector (10 test patients with risk scores)
- Waterfall chart: individual patient contribution per feature
- Clinical sense-check panel
- `GET /api/feature-importance`, `GET /api/waterfall/{idx}`

### Sprint 4 — Ethics (Step 7) ✅
- Subgroup sensitivity table: Age (4 groups) + Gender (2 groups)
- **Bias Alert Banner:** auto-appears if gap > 10 pp (red, full-width)
- EU AI Act Checklist: 8 items, 2 pre-checked, clickable toggles, progress bar
- Training data vs population chart (amber warning if gap > 15 pp)
- AI Failure Case Studies (3 cards: failure/near-miss/prevention)
- `GET /api/subgroup-analysis`

### Sprint 5 — Polish (Step 7 + infrastructure) ✅
- **PDF Certificate:** `POST /api/generate-certificate`
  - Metrics table, confusion matrix summary, EU AI Act checklist, bias summary, clinical sense-check
  - Uses ReportLab, < 10 seconds generation time
- Docker Compose: app loads in < 30 seconds
- Zero page reloads between all steps
- All features named clinically — zero raw column names in UI

---

## 📊 Sprint Metrics Compliance

| Metric | Target | Status |
|--------|--------|--------|
| CSV Upload Success | 100% valid/invalid handling | ✅ |
| Column Mapper Gate | Step 3 blocked before save | ✅ |
| KNN Canvas Redraw | ≤ 16ms | ✅ Canvas2D, no React re-render |
| Slider Debounce | 300ms ± 50ms | ✅ |
| Danger Banner Trigger | Sensitivity < 50% | ✅ |
| Bias Detection | > 10pp gap | ✅ |
| Certificate Generation | < 10 seconds | ✅ |
| Docker Startup | < 30 seconds | ✅ |
| Clinical Language Audit | 0 raw column names | ✅ |
| End-to-End Flow | Zero crashes Steps 1–7 | ✅ |
| Lighthouse Performance | ≥ 80 | Run `npm run build && lighthouse` |
| Lighthouse Accessibility | ≥ 85 | ARIA labels on all interactive elements |

---

## 🧪 User Testing Tasks (T1–T7)

| Task | Action | Expected |
|------|--------|----------|
| T1 | Open tool, switch to Diabetes domain | Domain bar updates, Step 1 content changes |
| T2 | Upload CSV (or use sample) | CSV accepted, Column Mapper opens |
| T3 | Complete Column Mapper, save | Green banner, Step 3 unlocked |
| T4 | Apply preparation settings, proceed | Success banner, Step 4 opens |
| T5 | Train KNN, read Sensitivity score | Score visible with colour coding |
| T6 | Go to Step 6, find top feature | Feature Importance chart shows top feature |
| T7 | Download Certificate | PDF downloads with domain/model/metrics |

---

## 🔧 Development

### Without Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000/api npm run dev
```

### With Docker (hot reload):
```bash
docker-compose -f docker-compose.dev.yml up --build
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/domains` | All 20 clinical domains |
| POST | `/api/domain/{key}` | Set active domain |
| POST | `/api/upload` | Upload CSV file |
| POST | `/api/upload/sample` | Generate synthetic sample data |
| POST | `/api/map-columns` | Save column mapping |
| POST | `/api/prepare` | Data preparation + normalisation |
| POST | `/api/train` | Train ML model |
| POST | `/api/train/quick` | Fast retrain (slider changes) |
| GET | `/api/metrics` | Last trained model metrics |
| GET | `/api/feature-importance` | Feature importance scores |
| GET | `/api/waterfall/{idx}` | Patient-level explanation |
| GET | `/api/patients` | Test patient list |
| GET | `/api/subgroup-analysis` | Age/gender bias analysis |
| GET | `/api/training-data-chart` | Training vs population comparison |
| POST | `/api/generate-certificate` | Download PDF certificate |
| GET | `/api/health` | Health check |

---

## 🎨 Design System

Based on the provided `GENERAL_DESIGN_SAMPLE_HTML.html` design:

- **Navy** `#0D2340` — primary, headers, nav
- **Blue** `#1A6B9A` — interactive, links
- **Teal** `#0E9E8E` — success, active states
- **Fonts:** DM Sans (UI) + DM Mono (code) + Fraunces (headings)
- **Shadows:** Three levels (sm / md / lg)
- **Banners:** info / good / warn / danger with left border accent

---

## 📝 Notes

- All data processing is **in-memory** (no database). Restarting the backend resets state.
- SMOTE implementation uses simple oversampling with Gaussian noise (no imbalanced-learn dependency).
- Subgroup analysis uses **simulated** demographic labels for educational purposes.
- Feature importance uses Gini impurity (tree models), coefficient magnitude (linear), or feature variance (KNN/NB).
