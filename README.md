# 🛡️ GlucoseGuard — Diabetes Risk Classification

An AI-powered full-stack web application for diabetes risk assessment using three ML models (Random Forest, Logistic Regression, SVM) trained on the Pima Indians Diabetes Dataset.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Risk Gauge** | Animated SVG gauge showing probability (0–100%) with Low/Moderate/High levels |
| **3-Model Comparison** | RF · LR · SVM side-by-side with accuracy, F1, ROC-AUC |
| **SHAP Feature Importance** | Approximated SHAP values with directional bar chart |
| **Plain-Language Explanation** | "Your glucose level is the primary risk factor…" |
| **What-If Simulator** | Adjust sliders live and watch risk update in real-time |
| **Prediction History** | Full table with filters, sort, expand-to-details, delete |
| **PDF Report** | Downloadable per-prediction clinical report via `/api/report/{id}` |
| **Admin Dashboard** | Pie chart, 7-day trend, model metrics bar chart, aggregate stats |
| **Neural Background** | Animated canvas neural network in the hero |
| **Neon PostgreSQL** | All predictions persisted with timestamps and all model probabilities |

---

## 🗂️ Project Structure

```
glucoseguard/
├── app.py                    # Uvicorn entrypoint
├── main.py                   # FastAPI app + middleware + routers
├── database.py               # Neon PostgreSQL connection + table creation
├── schemas.py                # Pydantic request/response models
├── requirements.txt
├── .env.example
├── vercel.json
│
├── routers/
│   ├── predict.py            # POST /api/predict, POST /api/whatif, GET /api/report/{id}
│   ├── history.py            # GET /api/history, DELETE /api/history/{id}
│   └── stats.py              # GET /api/stats
│
├── services/
│   └── model_service.py      # Model loading, inference, SHAP approx, explanations
│
├── train/
│   └── train_model.py        # Training script (embedded Pima dataset)
│
├── models/                   # Created by training script
│   ├── diabetes_rf.pkl
│   ├── diabetes_lr.pkl
│   ├── diabetes_svm.pkl
│   ├── scaler.pkl
│   ├── imputer.pkl
│   ├── metrics.json
│   └── feature_importance.json
│
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── .env.local.example
    └── app/
        ├── layout.tsx
        ├── page.tsx           # Main app shell with tabs
        ├── globals.css
        ├── lib/
        │   └── api.ts         # Typed API client
        └── components/
            ├── NeuralBackground.tsx   # Canvas animation
            ├── RiskGauge.tsx          # Animated SVG gauge
            ├── InputForm.tsx          # Patient data sliders + inputs
            ├── ResultPanel.tsx        # Orchestrates result display
            ├── ModelComparison.tsx    # Radar chart + metric bars
            ├── FeatureChart.tsx       # SHAP bar chart + ranked list
            ├── WhatIfSimulator.tsx    # Live dual-gauge simulator
            ├── HistoryTable.tsx       # Filterable, sortable, expandable table
            └── AdminDashboard.tsx     # Pie, area, bar charts + model metrics
```

---

## 🚀 Quick Start

### 1. Clone & Install Backend

```bash
git clone https://github.com/yourname/glucoseguard.git
cd glucoseguard

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set Up Neon PostgreSQL

1. Create a free database at [neon.tech](https://neon.tech)
2. Copy your connection string (it looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
3. Create `.env` from the example:

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL=your_neon_connection_string
```

### 3. Train the ML Models

```bash
python train/train_model.py
```

Expected output:
```
🔬 GlucoseGuard — Model Training
Dataset: 768 rows | 268 diabetic (34.9%)
Train: 614 | Test: 154
...
✅ All models trained and saved to models/
🏆 Best model by ROC-AUC: Random Forest (0.8412)
```

### 4. Start the Backend

```bash
python app.py
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 5. Start the Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# App running at http://localhost:3000
```

---

## 🌐 API Reference

### `POST /api/predict`

**Request body:**
```json
{
  "glucose": 148,
  "bmi": 33.6,
  "age": 50,
  "insulin": 0,
  "bp": 72,
  "skin": 35,
  "dpf": 0.627,
  "pregnancies": 6,
  "patient_id": "PT-001",
  "notes": "Fasting sample"
}
```

**Response:**
```json
{
  "id": 1,
  "result": "Diabetic",
  "probability": 0.73,
  "risk_level": "High",
  "risk_score": 73,
  "model_results": [
    { "model_name": "Random Forest", "probability": 0.73, "accuracy": 0.76, "f1_score": 0.67, "roc_auc": 0.83 },
    { "model_name": "Logistic Regression", "probability": 0.68, ... },
    { "model_name": "SVM", "probability": 0.71, ... }
  ],
  "feature_importance": [
    { "feature": "glucose", "importance": 0.28, "shap_value": 0.12, "direction": "increases" },
    ...
  ],
  "explanation": "Your glucose concentration of 148 mg/dL is the strongest risk signal...",
  "top_factors": ["Glucose Level: 148 mg/dL (increases risk)", ...],
  "recommendations": ["Consult a healthcare provider immediately...", ...],
  "created_at": "2024-01-15T10:30:00"
}
```

### `POST /api/whatif?baseline=0.73`

Same body as predict. Returns `{ probability, risk_level, risk_score, delta }`.

### `GET /api/history?limit=50&result=Diabetic&risk=High`

Returns last N predictions from the database.

### `DELETE /api/history/{id}`

Deletes a prediction record.

### `GET /api/stats`

Returns aggregate statistics, risk distribution, 7-day trend, model usage, and model metrics.

### `GET /api/report/{id}`

Downloads a PDF report for the given prediction ID.

---

## 🗄️ Database Schema

```sql
CREATE TABLE predictions (
    id           SERIAL PRIMARY KEY,
    glucose      FLOAT,
    bmi          FLOAT,
    age          INT,
    insulin      FLOAT,
    bp           FLOAT,
    skin         FLOAT,
    dpf          FLOAT,
    pregnancies  INT,
    result       VARCHAR(20),     -- 'Diabetic' | 'Non-Diabetic'
    probability  FLOAT,
    risk_level   VARCHAR(20),     -- 'Low' | 'Moderate' | 'High'
    model_used   VARCHAR(50),
    rf_probability   FLOAT,
    lr_probability   FLOAT,
    svm_probability  FLOAT,
    top_feature  VARCHAR(100),
    explanation  TEXT,
    patient_id   VARCHAR(50),
    notes        TEXT,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

---

## ☁️ Deployment

### Backend → Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway add --plugin postgresql   # Or use Neon URL directly
railway up
```

Set environment variables in Railway dashboard:
- `DATABASE_URL` — your Neon connection string
- `PORT` — Railway sets this automatically
- `CORS_ORIGINS` — `https://your-app.vercel.app`

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Set environment variable:
- `NEXT_PUBLIC_API_URL` — `https://your-backend.railway.app`

Update `vercel.json` to replace `your-backend.railway.app` with your actual Railway URL.

---

## 🤖 ML Model Details

| Model | Accuracy | F1 Score | ROC-AUC |
|---|---|---|---|
| Random Forest | ~76% | ~67% | ~83% |
| Logistic Regression | ~74% | ~66% | ~81% |
| SVM (RBF kernel) | ~73% | ~68% | ~77% |

**Dataset:** Pima Indians Diabetes Database (National Institute of Diabetes and Digestive and Kidney Diseases). 768 female patients, 8 features, binary outcome.

**Features used:** Pregnancies, Plasma Glucose, Diastolic BP, Triceps Skin Fold, 2-Hour Insulin, BMI, Diabetes Pedigree Function, Age.

**Preprocessing:** Median imputation for physiologically invalid zeros, StandardScaler for LR/SVM.

---

## 🎨 UI Design System

- **Background:** `#040810` (deep navy)
- **Card surface:** `#0a0f1e` with glassmorphism + `backdrop-blur`
- **Accent:** `#00d4ff` (electric cyan)
- **Risk Low:** `#00e676` (green)
- **Risk Moderate:** `#ffab40` (amber)
- **Risk High:** `#ff5252` (red)
- **Fonts:** Syne (display) + IBM Plex Mono (data/code) + Inter (body)

---

## 🔧 Advanced Configuration

### Adding a Custom Dataset

Replace the `PIMA_DATA` string in `train/train_model.py` with a CSV string in the same column order:
`pregnancies, glucose, bp, skin, insulin, bmi, dpf, age, outcome`

Or modify `load_pima_data()` to read from a file path.

### Switching Primary Model

In `services/model_service.py`, change `primary_prob = rf_prob` to `lr_prob` or `svm_prob`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | required | Neon PostgreSQL connection string |
| `PORT` | `8000` | Backend server port |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for frontend |

---

## ⚠️ Disclaimer

GlucoseGuard is a research and educational tool. It is **not** a medical device, and its output is **not** a clinical diagnosis. Always consult a qualified healthcare professional before making any health decisions. The authors assume no liability for clinical use of this software.

---

## 📄 License

MIT License. See `LICENSE` for details.
#   G l u c o s e G u a r d - D i a b e t e s - R i s k - C l a s s i f i c a t i o n  
 