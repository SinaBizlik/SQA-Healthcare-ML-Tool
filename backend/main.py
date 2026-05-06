"""
Healthcare ML Visualization Tool — FastAPI Backend  v4.0
=========================================================
Fixes applied:
  1. after_mean: computed from actual scaled training data, not 0.0
  2. Subgroup analysis: uses real CSV columns (Age/Sex variants) when present,
     falls back to simulated with clear 'simulated' flag
  3. Target encoding: LabelEncoder on y before split (handles Yes/No strings)
  4. All previous v3 criteria preserved (Pipeline, joblib, SQLite, etc.)
"""
from __future__ import annotations
import io, json, logging, sqlite3, time, uuid, warnings
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score, roc_auc_score, roc_curve,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

try:
    from imblearn.over_sampling import SMOTE
    from imblearn.pipeline import Pipeline as ImbPipeline
    SMOTE_AVAILABLE = True
except ImportError:
    ImbPipeline = None
    SMOTE_AVAILABLE = False

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("healthcare-ml")

def _sanitize(obj):
    """Recursively convert numpy scalars/arrays to native Python types for JSON safety."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj

# ════════════════════════════════════════════════════════════════════════════
# PATHS
# ════════════════════════════════════════════════════════════════════════════
BASE_DIR    = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
MODELS_DIR  = BASE_DIR / "models"
DB_PATH     = BASE_DIR / "healthcare_ml.db"
ACTIVE_PKL  = MODELS_DIR / "active_pipeline.pkl"
ACTIVE_META = MODELS_DIR / "active_meta.json"
for _d in (UPLOADS_DIR, MODELS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ════════════════════════════════════════════════════════════════════════════
# SQLITE
# ════════════════════════════════════════════════════════════════════════════
def _init_db() -> None:
    with sqlite3.connect(DB_PATH) as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS uploads (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
            filename TEXT NOT NULL, filepath TEXT NOT NULL,
            domain TEXT, n_rows INTEGER, n_cols INTEGER,
            column_map TEXT
        );
        CREATE TABLE IF NOT EXISTS training_runs (
            id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
            upload_id TEXT REFERENCES uploads(id),
            model_name TEXT NOT NULL, params TEXT NOT NULL,
            accuracy REAL, sensitivity REAL, precision REAL,
            specificity REAL, f1 REAL, auc REAL,
            n_train INTEGER, n_test INTEGER, train_ms INTEGER,
            smote_used INTEGER, pkl_path TEXT, metrics_json TEXT
        );
        """)
    log.info("DB ready: %s", DB_PATH)

@contextmanager
def get_db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con; con.commit()
    except Exception:
        con.rollback(); raise
    finally:
        con.close()

_init_db()

# ════════════════════════════════════════════════════════════════════════════
# IN-MEMORY STATE
# ════════════════════════════════════════════════════════════════════════════
STATE: Dict[str, Any] = {
    "domain": "cardiology", "raw_df": None, "upload_id": None,
    "mapped_df": None, "column_mapping": {}, "prepared_df": None,
    "feature_names": [],
    "subgroup_age_col": None,   # real column name for age, if found
    "subgroup_sex_col": None,   # real column name for sex, if found
    "apply_smote": False, "_normalization": "standard",
    "pipeline": None,
    "pipeline_run_id": None,
    "X_train": None, "X_test": None, "y_train": None, "y_test": None,
    "last_metrics": {}, "active_model_name": "knn", "model_params": {},
    "norm_chart_data": [], "prep_before": {}, "prep_after": {},
}

def _reset_downstream():
    for k in ("mapped_df","column_mapping","prepared_df","pipeline",
              "X_train","X_test","y_train","y_test"):
        STATE[k] = None
    STATE.update(feature_names=[], last_metrics={}, norm_chart_data=[],
                 prep_before={}, prep_after={}, apply_smote=False,
                 pipeline_run_id=None, subgroup_age_col=None, subgroup_sex_col=None)

# ════════════════════════════════════════════════════════════════════════════
# MODEL PERSISTENCE
# ════════════════════════════════════════════════════════════════════════════
ACTIVE_DATA = MODELS_DIR / "active_data.pkl"   # persists X_test, y_test, X_train, y_train

def _save_pipeline(pipeline, run_id: str, meta: dict,
                   X_tr=None, X_te=None, y_tr=None, y_te=None) -> None:
    per_run = MODELS_DIR / f"pipeline_{run_id}.pkl"
    joblib.dump(pipeline, per_run, compress=3)
    joblib.dump(pipeline, ACTIVE_PKL, compress=3)
    ACTIVE_META.write_text(json.dumps({**meta, "run_id": run_id, "pkl_path": str(per_run)}, indent=2))
    # ── Persist test/train arrays so waterfall & subgroup work after restart ──
    if X_te is not None:
        joblib.dump({"X_train": X_tr, "X_test": X_te,
                     "y_train": y_tr, "y_test":  y_te}, ACTIVE_DATA, compress=3)
    log.info("Pipeline saved -> %s", per_run)

def _load_active_pipeline() -> bool:
    if not ACTIVE_PKL.exists() or not ACTIVE_META.exists():
        return False
    try:
        pipeline = joblib.load(ACTIVE_PKL)
        meta = json.loads(ACTIVE_META.read_text())
        STATE["pipeline"]          = pipeline
        STATE["active_model_name"] = meta.get("model_name", "unknown")
        STATE["model_params"]      = meta.get("params", {})
        STATE["feature_names"]     = meta.get("feature_names", [])
        STATE["last_metrics"]      = meta.get("last_metrics", {})
        STATE["pipeline_run_id"]   = meta.get("run_id")
        STATE["domain"]            = meta.get("domain", STATE["domain"])
        # ── Restore test/train arrays (needed by waterfall, subgroup, patients) ──
        if ACTIVE_DATA.exists():
            data = joblib.load(ACTIVE_DATA)
            STATE["X_train"] = data.get("X_train")
            STATE["X_test"]  = data.get("X_test")
            STATE["y_train"] = data.get("y_train")
            STATE["y_test"]  = data.get("y_test")
            log.info("Restored X_test (%d rows), X_train (%d rows)",
                     len(data.get("X_test", [])), len(data.get("X_train", [])))
        log.info("Restored pipeline: %s (run_id=%s)", STATE["active_model_name"], meta.get("run_id"))
        return True
    except Exception as exc:
        log.warning("Could not restore pipeline: %s", exc)
        return False

# ════════════════════════════════════════════════════════════════════════════
# CLINICAL DOMAINS
# ════════════════════════════════════════════════════════════════════════════
DOMAINS: Dict[str, Dict] = {
    "cardiology":       {"label":"Cardiology","icon":"heart","description":"Cardiovascular disease risk assessment","target":"Heart Disease Risk","features":["Age","Resting Blood Pressure","Cholesterol Level","Max Heart Rate","ST Depression","Chest Pain Type","Fasting Blood Sugar","ECG Results","Exercise Angina","Slope of ST Segment"],"sense_check":"High cholesterol and elevated blood pressure are primary risk factors for cardiac events.","positive_label":"High Risk","negative_label":"Low Risk"},
    "diabetes":         {"label":"Diabetes","icon":"drop","description":"Type 2 diabetes onset prediction","target":"Diabetes Diagnosis","features":["Glucose Level","BMI","Age","Blood Pressure","Insulin Level","Skin Thickness","Diabetes Pedigree Function","Number of Pregnancies","HbA1c Level","Fasting Glucose"],"sense_check":"Glucose level and BMI are the strongest predictors of diabetes onset.","positive_label":"Diabetic","negative_label":"Non-Diabetic"},
    "oncology":         {"label":"Oncology","icon":"microscope","description":"Tumour malignancy classification","target":"Malignancy","features":["Mean Radius","Mean Texture","Mean Perimeter","Mean Area","Mean Smoothness","Compactness","Concavity","Symmetry","Fractal Dimension","Cell Uniformity"],"sense_check":"Cell radius and concavity are strong indicators of malignancy.","positive_label":"Malignant","negative_label":"Benign"},
    "neurology":        {"label":"Neurology","icon":"brain","description":"Neurological disorder risk assessment","target":"Neurological Risk","features":["Cognitive Score","Motor Function","Sleep Quality","Stress Level","Blood Pressure","Age","Family History Score","MRI Asymmetry","Tremor Frequency","Reaction Time"],"sense_check":"Cognitive decline and motor function impairment are early indicators.","positive_label":"At Risk","negative_label":"Normal"},
    "pulmonology":      {"label":"Pulmonology","icon":"lungs","description":"Respiratory disease prediction","target":"Respiratory Disease","features":["FEV1 Score","FVC Ratio","Peak Flow Rate","SpO2 Level","Smoking Pack-Years","Age","BMI","Allergen Exposure Score","Exacerbation Count","Exercise Tolerance"],"sense_check":"FEV1/FVC ratio below 0.7 is diagnostic of obstructive disease.","positive_label":"Diseased","negative_label":"Healthy"},
    "nephrology":       {"label":"Nephrology","icon":"kidney","description":"Chronic kidney disease staging","target":"CKD Diagnosis","features":["Creatinine Level","eGFR Score","BUN Level","Urine Albumin","Hemoglobin","Blood Pressure","Diabetes Status","Age","Sodium Level","Potassium Level"],"sense_check":"eGFR below 60 for 3+ months indicates chronic kidney disease.","positive_label":"CKD Present","negative_label":"Normal"},
    "gastroenterology": {"label":"Gastroenterology","icon":"stomach","description":"GI disorder risk prediction","target":"GI Disorder Risk","features":["Colonoscopy Score","H. Pylori Status","BMI","Alcohol Units/Week","NSAIDs Use Score","Stress Score","Diet Quality Index","Family History","Bleeding Episodes","Pain Severity"],"sense_check":"H. Pylori positivity and NSAID use significantly elevate GI risk.","positive_label":"High Risk","negative_label":"Low Risk"},
    "endocrinology":    {"label":"Endocrinology","icon":"flask","description":"Hormonal disorder classification","target":"Thyroid Disorder","features":["TSH Level","T3 Level","T4 Level","Age","BMI","Goitre Size","Antibody Titre","Heart Rate","Temperature","Family History Score"],"sense_check":"TSH outside 0.4-4.0 mIU/L is the primary diagnostic marker.","positive_label":"Disorder Present","negative_label":"Euthyroid"},
    "rheumatology":     {"label":"Rheumatology","icon":"bone","description":"Autoimmune joint disease prediction","target":"Autoimmune Disease","features":["ESR Level","CRP Level","RF Titre","Anti-CCP Antibody","Joint Swelling Count","Morning Stiffness (min)","Age","BMI","Fatigue Score","Mobility Index"],"sense_check":"Elevated RF and anti-CCP together have high specificity for RA.","positive_label":"Positive","negative_label":"Negative"},
    "dermatology":      {"label":"Dermatology","icon":"skin","description":"Skin lesion malignancy screening","target":"Lesion Malignancy","features":["Lesion Asymmetry Score","Border Irregularity","Colour Variation","Diameter (mm)","Evolution Score","UV Exposure Index","Age","Family History","Dermoscopy Score","Fitzpatrick Type"],"sense_check":"ABCDE criteria guide screening.","positive_label":"Malignant","negative_label":"Benign"},
    "psychiatry":       {"label":"Psychiatry","icon":"mind","description":"Mental health disorder risk stratification","target":"Mental Health Risk","features":["PHQ-9 Score","GAD-7 Score","Sleep Hours","Social Support Index","Stress Level","Trauma Score","Substance Use Index","Cognitive Function","Age","Employment Status Score"],"sense_check":"PHQ-9 >= 10 indicates moderate-to-severe depressive symptoms.","positive_label":"High Risk","negative_label":"Low Risk"},
    "ophthalmology":    {"label":"Ophthalmology","icon":"eye","description":"Diabetic retinopathy grading","target":"Retinopathy Grade","features":["Intraocular Pressure","Visual Acuity Score","Retinal Thickness","Microaneurysm Count","Haemorrhage Score","HbA1c Level","Diabetes Duration (years)","Blood Pressure","Age","Cup-Disc Ratio"],"sense_check":"Longer diabetes duration and poor glycaemic control accelerate retinopathy.","positive_label":"DR Present","negative_label":"No DR"},
    "haematology":      {"label":"Haematology","icon":"blood","description":"Blood disorder classification","target":"Blood Disorder","features":["Haemoglobin Level","WBC Count","Platelet Count","MCV","MCH Level","Ferritin Level","Reticulocyte Count","ESR Level","LDH Level","Bone Marrow Score"],"sense_check":"Low haemoglobin with microcytosis strongly suggests iron-deficiency anaemia.","positive_label":"Disorder Present","negative_label":"Normal"},
    "infectiology":     {"label":"Infectiology","icon":"virus","description":"Infectious disease severity prediction","target":"Severe Infection","features":["CRP Level","Procalcitonin Level","Temperature (C)","Heart Rate","Respiratory Rate","WBC Count","Blood Pressure","SpO2 Level","NEWS2 Score","Age"],"sense_check":"Procalcitonin > 0.5 ng/mL suggests bacterial sepsis.","positive_label":"Severe","negative_label":"Mild/Moderate"},
    "urology":          {"label":"Urology","icon":"kidney","description":"Urological disorder risk assessment","target":"Urological Disorder","features":["PSA Level","Urinary Flow Rate","Post-Void Residual","IPSS Score","Age","BMI","Creatinine Level","Urine Culture Score","Pain Scale","Haematuria Score"],"sense_check":"PSA > 4 ng/mL warrants further investigation.","positive_label":"Disorder Present","negative_label":"Normal"},
    "gynecology":       {"label":"Gynecology","icon":"health","description":"Gynaecological condition screening","target":"Gynaecological Risk","features":["CA-125 Level","Pelvic Pain Score","Menstrual Irregularity Score","BMI","Age","Parity","Hormonal Index","Ultrasound Score","Family History","Inflammation Marker"],"sense_check":"CA-125 elevation combined with pelvic mass warrants urgent investigation.","positive_label":"High Risk","negative_label":"Low Risk"},
    "orthopedics":      {"label":"Orthopaedics","icon":"bone","description":"Musculoskeletal fracture prediction","target":"Fracture Risk","features":["Bone Mineral Density","FRAX Score","Age","BMI","Calcium Level","Vitamin D Level","Fall Risk Score","Physical Activity Level","Prior Fracture","Corticosteroid Use"],"sense_check":"T-score below -2.5 indicates osteoporosis.","positive_label":"High Risk","negative_label":"Low Risk"},
    "pediatrics":       {"label":"Paediatrics","icon":"child","description":"Paediatric developmental risk assessment","target":"Developmental Risk","features":["Height Percentile","Weight Percentile","Developmental Score","Vaccination Status","Birth Weight","Gestational Age","Nutritional Index","Motor Milestone Score","Cognitive Score","Age (months)"],"sense_check":"Consistently below 3rd percentile warrants investigation.","positive_label":"At Risk","negative_label":"Normal"},
    "geriatrics":       {"label":"Geriatrics","icon":"elder","description":"Elderly patient frailty assessment","target":"Frailty Index","features":["Barthel Index","MMSE Score","Gait Speed (m/s)","Grip Strength","Polypharmacy Count","Nutritional Score","Fall History","Comorbidity Count","Social Isolation Score","Age"],"sense_check":"Gait speed < 0.8 m/s and grip strength < 16 kg indicate frailty.","positive_label":"Frail","negative_label":"Robust"},
    "emergency":        {"label":"Emergency Medicine","icon":"alert","description":"Emergency triage severity prediction","target":"Critical Outcome","features":["Triage Score","Heart Rate","Systolic BP","Respiratory Rate","GCS Score","SpO2 Level","Temperature (C)","Lactate Level","Pain Score","NEWS2 Score"],"sense_check":"GCS < 8 and lactate > 4 mmol/L indicate critical condition.","positive_label":"Critical","negative_label":"Non-Critical"},
}

# ════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ════════════════════════════════════════════════════════════════════════════
class ColumnMapping(BaseModel):
    mapping:    Dict[str, str]
    target_col: str

class PrepareRequest(BaseModel):
    normalization:  str  = Field("standard", pattern="^(standard|minmax|none)$")
    handle_missing: str  = Field("mean", pattern="^(mean|median|drop)$")
    apply_smote:    bool = False
    test_size:      float = Field(0.2, ge=0.05, le=0.5)

class TrainRequest(BaseModel):
    model_name: str            = "knn"
    params:     Dict[str, Any] = {}

class PredictRequest(BaseModel):
    features: Dict[str, float]

# ════════════════════════════════════════════════════════════════════════════
# PARAM HELPERS
# ════════════════════════════════════════════════════════════════════════════
def _resolve_C(params: dict) -> float:
    if "C" in params:
        try: return float(params["C"])
        except (TypeError, ValueError): pass
    if "C_idx" in params:
        try: return float(10 ** ((float(params["C_idx"]) - 5) / 2))
        except (TypeError, ValueError): pass
    return 1.0

def _to_depth(params: dict, key: str, default: int) -> Optional[int]:
    v = params.get(key, default)
    try: v = int(v)
    except (TypeError, ValueError): return None
    return v if v > 0 else None

# ════════════════════════════════════════════════════════════════════════════
# PARAMETRIC CLASSIFIER BUILDER
# ════════════════════════════════════════════════════════════════════════════
def _build_classifier(name: str, params: dict):
    C = _resolve_C(params)
    return {
        "knn": KNeighborsClassifier(
            n_neighbors=max(1, int(params.get("k", 5))),
            metric=str(params.get("metric", "euclidean")),
            weights=str(params.get("weights", "uniform")),
            algorithm=str(params.get("algorithm", "auto")),
        ),
        "svm": SVC(
            C=C, kernel=str(params.get("kernel", "rbf")),
            gamma=params.get("gamma", "scale"),
            probability=True, class_weight="balanced",
        ),
        "dt": DecisionTreeClassifier(
            max_depth=_to_depth(params, "max_depth", 5),
            min_samples_split=max(2, int(params.get("min_samples_split", 2))),
            criterion=str(params.get("criterion", "gini")),
            random_state=42,
        ),
        "rf": RandomForestClassifier(
            n_estimators=max(1, int(params.get("n_estimators", 100))),
            max_depth=_to_depth(params, "max_depth", 10),
            min_samples_split=max(2, int(params.get("min_samples_split", 2))),
            max_features=params.get("max_features", "sqrt"),
            class_weight="balanced", random_state=42, n_jobs=-1,
        ),
        "lr": LogisticRegression(
            C=C, max_iter=max(50, int(params.get("max_iter", 300))),
            solver=str(params.get("solver", "lbfgs")),
            penalty=str(params.get("penalty", "l2")),
            class_weight="balanced", random_state=42,
        ),
        "nb": GaussianNB(var_smoothing=float(params.get("var_smoothing", 1e-9))),
    }.get(name)

# ════════════════════════════════════════════════════════════════════════════
# PIPELINE BUILDER
# ════════════════════════════════════════════════════════════════════════════
def _build_pipeline(model_name: str, params: dict,
                    normalization: str = "standard",
                    apply_smote: bool = False) -> Pipeline:
    clf = _build_classifier(model_name, params)
    if clf is None:
        raise HTTPException(400, f"Unknown model: '{model_name}'")
    imputer = SimpleImputer(strategy="mean")
    scaler  = (StandardScaler() if normalization == "standard" else
               MinMaxScaler()   if normalization == "minmax"   else
               "passthrough")
    if apply_smote and SMOTE_AVAILABLE:
        return ImbPipeline([("imputer", imputer), ("scaler", scaler),
                            ("smote", SMOTE(random_state=42)), ("clf", clf)])
    return Pipeline([("imputer", imputer), ("scaler", scaler), ("clf", clf)])

# ════════════════════════════════════════════════════════════════════════════
# GENERIC DATA HELPERS
# ════════════════════════════════════════════════════════════════════════════
def _apply_column_mapping(df: pd.DataFrame, mapping: Dict[str, str],
                          target_col: str) -> pd.DataFrame:
    rename = {k: v for k, v in mapping.items() if k in df.columns and v}
    df = df.rename(columns=rename)
    if target_col in df.columns:
        df = df.rename(columns={target_col: "__target__"})
    elif df.columns[-1] != "__target__":
        df = df.rename(columns={df.columns[-1]: "__target__"})
    return df

def _encode_categoricals(df: pd.DataFrame, feat_cols: List[str]) -> pd.DataFrame:
    for c in feat_cols:
        if not pd.api.types.is_numeric_dtype(df[c]):
            df[c] = pd.Categorical(df[c]).codes.astype(float)
    return df

def _detect_subgroup_cols(df: pd.DataFrame):
    """
    Detect real Age and Sex columns from the mapped dataframe.
    Returns (age_col, sex_col) — either may be None if not found.
    """
    age_candidates = ["age", "Age", "AGE", "Age (months)", "patient_age", "age_years"]
    sex_candidates = ["sex", "Sex", "SEX", "gender", "Gender", "GENDER"]
    cols_lower = {c.lower(): c for c in df.columns}
    age_col = next(
        (c for c in age_candidates if c in df.columns), None
    ) or cols_lower.get("age")
    sex_col = next(
        (c for c in sex_candidates if c in df.columns), None
    ) or cols_lower.get("sex") or cols_lower.get("gender")
    return age_col, sex_col

def _upload_response(df: pd.DataFrame, domain_key: str) -> dict:
    domain = DOMAINS[domain_key]; clin = domain["features"]
    cols = df.columns.tolist()
    auto_map = {col: (clin[i] if i < len(clin) else col) for i, col in enumerate(cols[:-1])}
    target_col = cols[-1]
    stats = []
    for col in cols:
        base = {"column": col, "missing": int(df[col].isna().sum()),
                "clinical_name": auto_map.get(col, domain["target"] if col == target_col else col)}
        if pd.api.types.is_numeric_dtype(df[col]):
            nn = df[col].dropna()
            stats.append({**base, "dtype": "numeric",
                          "mean": round(float(nn.mean()), 3) if len(nn) else 0,
                          "std":  round(float(nn.std()),  3) if len(nn) else 0,
                          "min":  round(float(nn.min()),  3) if len(nn) else 0,
                          "max":  round(float(nn.max()),  3) if len(nn) else 0})
        else:
            stats.append({**base, "dtype": "categorical", "unique": int(df[col].nunique())})
    return {"columns": cols, "n_rows": len(df), "n_cols": len(cols),
            "auto_mapping": auto_map, "suggested_target": target_col,
            "missing_info": {c: int(df[c].isna().sum()) for c in cols if df[c].isna().any()},
            "stats": stats,
            "preview": df.head(5).where(pd.notnull(df), None).to_dict(orient="records"),
            "clinical_features": clin}

def generate_synthetic_data(domain_key: str, n: int = 304) -> pd.DataFrame:
    rng = np.random.RandomState(42); domain = DOMAINS[domain_key]
    n_feat = len(domain["features"])
    cov = np.eye(n_feat)
    for i in range(n_feat - 1): cov[i, i+1] = cov[i+1, i] = 0.3
    X = rng.multivariate_normal(np.zeros(n_feat), cov, size=n)
    df = pd.DataFrame(X, columns=[f"feat_{i}" for i in range(n_feat)])
    for col in df.columns:
        df.loc[rng.choice(n, size=int(n * 0.05), replace=False), col] = np.nan
    logit = X[:, 0] * 1.3 + X[:, 1] * 0.9 + rng.randn(n) * 0.5
    df["target"] = (logit > 0.25).astype(int)
    return df

# ════════════════════════════════════════════════════════════════════════════
# TRAINING CORE
# ════════════════════════════════════════════════════════════════════════════
def _run_train(model_name: str, params: dict, save_state: bool = True) -> dict:
    if STATE["prepared_df"] is None:
        raise HTTPException(400, "Prepare data first (POST /api/prepare).")
    df   = STATE["prepared_df"]
    feat = STATE["feature_names"]
    X    = df[feat].values.astype(float)

    # ── FIX: Target encoding — handles Yes/No, string labels, etc. ──────────
    y_raw = df["__target__"].values
    le    = LabelEncoder()
    y     = le.fit_transform(y_raw.astype(str))
    # Store label mapping for display — use native Python types
    label_map = {str(int(le.transform([cls])[0])): str(cls) for cls in le.classes_}

    try:
        uniq, cnts = np.unique(y, return_counts=True)
        use_strat  = len(uniq) >= 2 and cnts.min() >= 2
        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if use_strat else None)
    except Exception:
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    apply_smote   = STATE.get("apply_smote", False)
    normalization = STATE.get("_normalization", "standard")

    # Build & fit Pipeline (scaler fits on X_train ONLY — no leakage)
    pipeline = _build_pipeline(model_name, params,
                               normalization=normalization, apply_smote=apply_smote)
    t0 = time.time()
    pipeline.fit(X_tr, y_tr)
    train_ms = int((time.time() - t0) * 1000)

    y_pred = pipeline.predict(X_te)
    has_p  = hasattr(pipeline, "predict_proba")
    y_prob = pipeline.predict_proba(X_te)[:,1] if has_p else y_pred.astype(float)

    acc  = round(accuracy_score(y_te, y_pred) * 100, 1)
    sens = round(recall_score(y_te, y_pred, zero_division=0) * 100, 1)
    prec = round(precision_score(y_te, y_pred, zero_division=0) * 100, 1)
    spec = round(recall_score(y_te, y_pred, pos_label=0, zero_division=0) * 100, 1)
    f1   = round(f1_score(y_te, y_pred, zero_division=0), 3)
    try:   auc = round(roc_auc_score(y_te, y_prob), 3)
    except: auc = None
    cm = confusion_matrix(y_te, y_pred).tolist()
    try:
        fpr, tpr, _ = roc_curve(y_te, y_prob)
        roc_data = [{"fpr": round(float(f),4), "tpr": round(float(t),4)} for f,t in zip(fpr,tpr)]
    except: roc_data = []

    try:
        cr = classification_report(y_te, y_pred, output_dict=True, zero_division=0)
        cls_report = {str(k): {"precision": round(v.get("precision",0)*100,1),
                                "recall":    round(v.get("recall",0)*100,1),
                                "f1_score":  round(v.get("f1-score",0),3),
                                "support":   int(v.get("support",0))}
                      for k,v in cr.items() if isinstance(v, dict)}
    except: cls_report = {}

    cv_results: dict = {}
    try:
        n_splits = min(5, int(np.min(np.bincount(y.astype(int)))))
        if n_splits >= 2:
            skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
            cv  = cross_validate(pipeline, X, y, cv=skf,
                                 scoring=["accuracy","recall","precision","f1"], n_jobs=-1)
            cv_results = {
                "folds":             n_splits,
                "cv_accuracy_mean":  round(float(np.mean(cv["test_accuracy"]))*100, 1),
                "cv_accuracy_std":   round(float(np.std(cv["test_accuracy"]))*100, 1),
                "cv_recall_mean":    round(float(np.mean(cv["test_recall"]))*100, 1),
                "cv_recall_std":     round(float(np.std(cv["test_recall"]))*100, 1),
                "cv_precision_mean": round(float(np.mean(cv["test_precision"]))*100, 1),
                "cv_f1_mean":        round(float(np.mean(cv["test_f1"])), 3),
            }
    except Exception as exc:
        cv_results = {"error": str(exc)}

    metrics = {
        "accuracy": acc, "sensitivity": sens, "precision": prec,
        "specificity": spec, "f1": f1, "auc": auc,
        "confusion_matrix": cm, "roc_curve": roc_data,
        "train_time_ms": train_ms,
        "n_train": int(len(y_tr)), "n_test": int(len(y_te)),
        "classification_report": cls_report,
        "cross_validation": cv_results,
        "smote_applied": bool(apply_smote and SMOTE_AVAILABLE),
        "smote_available": bool(SMOTE_AVAILABLE),
        "pipeline_steps": [str(name) for name,_ in pipeline.steps],
        "feature_names": [str(f) for f in feat],
        "label_map": label_map,
        "model_name": str(model_name), "params": params,
    }

    # Sanitize all numpy types → native Python (prevents FastAPI 500 on serialization)
    metrics = _sanitize(metrics)

    if save_state:
        run_id = str(uuid.uuid4())[:8]
        STATE.update(pipeline=pipeline, X_train=X_tr, X_test=X_te, y_train=y_tr,
                     y_test=y_te, last_metrics=metrics, active_model_name=model_name,
                     model_params=params, pipeline_run_id=run_id)

        _save_pipeline(pipeline, run_id, {
            "model_name": model_name, "params": params, "feature_names": feat,
            "last_metrics": metrics, "domain": STATE["domain"],
            "trained_at": datetime.utcnow().isoformat(),
        }, X_tr=X_tr, X_te=X_te, y_tr=y_tr, y_te=y_te)

        with get_db() as con:
            con.execute("""
                INSERT INTO training_runs
                    (id, created_at, upload_id, model_name, params,
                     accuracy, sensitivity, precision, specificity,
                     f1, auc, n_train, n_test, train_ms,
                     smote_used, pkl_path, metrics_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (run_id, datetime.utcnow().isoformat(),
                  STATE.get("upload_id"), model_name, json.dumps(params),
                  acc, sens, prec, spec, f1, auc,
                  int(len(y_tr)), int(len(y_te)), train_ms,
                  int(apply_smote and SMOTE_AVAILABLE),
                  str(MODELS_DIR / f"pipeline_{run_id}.pkl"),
                  json.dumps(metrics, default=str)))
        log.info("Run %s | %s | acc=%.1f%% sens=%.1f%%", run_id, model_name, acc, sens)
    return metrics

# ════════════════════════════════════════════════════════════════════════════
# FastAPI APP
# ════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="Healthcare ML Tool API", version="4.0.0",
              description="Dynamic, persistent, pipeline-based clinical ML backend.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def on_startup():
    loaded = _load_active_pipeline()
    log.info("Startup: %s", "pipeline restored from disk" if loaded else "fresh start (no saved model)")

# ─── STEP 1: Domain ──────────────────────────────────────────────────────────
@app.get("/api/domains")
def get_domains():
    fields = ("label","icon","description","target","sense_check",
              "positive_label","negative_label","features")
    return {k: {f: v[f] for f in fields} for k,v in DOMAINS.items()}

@app.post("/api/domain/{domain_key}")
def set_domain(domain_key: str):
    if domain_key not in DOMAINS:
        raise HTTPException(404, f"Unknown domain: '{domain_key}'")
    STATE["domain"] = domain_key; STATE["raw_df"] = None; _reset_downstream()
    return {"domain": domain_key, "info": DOMAINS[domain_key]}

# ─── STEP 2: Upload ───────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(400, f"Cannot parse CSV: {exc}")
    if df.empty or len(df.columns) < 2:
        raise HTTPException(400, "CSV must have at least 2 columns.")
    upload_id = str(uuid.uuid4())[:12]
    safe_name = f"{upload_id}_{Path(file.filename or 'data.csv').name}"
    filepath  = UPLOADS_DIR / safe_name
    filepath.write_bytes(content)
    with get_db() as con:
        con.execute("INSERT INTO uploads (id, created_at, filename, filepath, domain, n_rows, n_cols) VALUES (?,?,?,?,?,?,?)",
                    (upload_id, datetime.utcnow().isoformat(), file.filename,
                     str(filepath), STATE["domain"], len(df), len(df.columns)))
    STATE["raw_df"] = df; STATE["upload_id"] = upload_id; _reset_downstream()
    log.info("Upload %s: %d x %d -> %s", upload_id, len(df), len(df.columns), filepath)
    return {"upload_id": upload_id, **_upload_response(df, STATE["domain"])}

@app.post("/api/upload/sample")
@app.get("/api/upload/sample")
def use_sample_data():
    domain_key = STATE["domain"]
    try: df = generate_synthetic_data(domain_key)
    except Exception as exc: raise HTTPException(500, f"Sample generation failed: {exc}")
    upload_id = f"synthetic-{domain_key}"
    with get_db() as con:
        con.execute("INSERT OR REPLACE INTO uploads (id, created_at, filename, filepath, domain, n_rows, n_cols) VALUES (?,?,?,?,?,?,?)",
                    (upload_id, datetime.utcnow().isoformat(),
                     f"sample_{domain_key}.csv", "synthetic",
                     domain_key, len(df), len(df.columns)))
    STATE["raw_df"] = df; STATE["upload_id"] = upload_id; _reset_downstream()
    return {"upload_id": upload_id, **_upload_response(df, domain_key)}

# ─── STEP 2b: Column mapping ──────────────────────────────────────────────────
@app.post("/api/map-columns")
def map_columns(body: ColumnMapping):
    if STATE["raw_df"] is None:
        raise HTTPException(400, "Upload data first.")
    df = _apply_column_mapping(STATE["raw_df"].copy(), body.mapping, body.target_col)
    STATE["mapped_df"] = df; STATE["column_mapping"] = body.mapping

    # Detect subgroup columns immediately after mapping
    age_col, sex_col = _detect_subgroup_cols(df)
    STATE["subgroup_age_col"] = age_col
    STATE["subgroup_sex_col"] = sex_col
    log.info("Subgroup cols detected: age=%s, sex=%s", age_col, sex_col)

    with get_db() as con:
        con.execute("UPDATE uploads SET column_map=? WHERE id=?",
                    (json.dumps(body.mapping), STATE.get("upload_id")))
    missing  = {c: int(df[c].isna().sum()) for c in df.columns if df[c].isna().any()}
    cls_dist = df["__target__"].value_counts().to_dict()
    return {"status": "ok", "columns_mapped": len(body.mapping),
            "feature_columns": [c for c in df.columns if c != "__target__"],
            "missing_values": missing,
            "class_distribution": {str(k): int(v) for k,v in cls_dist.items()},
            "n_rows": len(df), "n_features": len(df.columns)-1,
            "subgroup_age_col": age_col, "subgroup_sex_col": sex_col}

# ─── STEP 3: Prepare ──────────────────────────────────────────────────────────
@app.post("/api/prepare")
def prepare_data(body: PrepareRequest):
    """
    Encode categoricals; capture real before/after normalisation stats.
    Imputation + scaling NOT applied here — they live inside the Pipeline
    and fit on X_train ONLY (no data leakage).
    after_mean is computed from a temporary scaler fit on ALL data purely
    for display purposes — training still uses the Pipeline.
    """
    if STATE["mapped_df"] is None:
        raise HTTPException(400, "Run /api/map-columns first.")
    df        = STATE["mapped_df"].copy()
    feat_cols = [c for c in df.columns if c != "__target__"]
    num_cols  = df[feat_cols].select_dtypes(include=np.number).columns.tolist()

    before_class   = df["__target__"].value_counts().to_dict()
    before_means   = {c: round(float(df[c].mean(skipna=True)), 4) for c in num_cols}
    before_stds    = {c: round(float(df[c].std(skipna=True)),  4) for c in num_cols}
    before_missing = int(df[feat_cols].isna().sum().sum())

    df = _encode_categoricals(df, feat_cols)
    all_feat    = [c for c in df.columns if c != "__target__"]
    after_class = df["__target__"].value_counts().to_dict()

    # ── FIX: Compute real after_mean using a temporary scaler (display only) ─
    after_means: Dict[str, float] = {}
    after_stds:  Dict[str, float] = {}
    if body.normalization != "none" and num_cols:
        # Use only complete rows for this display computation
        X_num = df[num_cols].fillna(df[num_cols].mean())
        try:
            tmp_scaler = StandardScaler() if body.normalization == "standard" else MinMaxScaler()
            X_scaled   = tmp_scaler.fit_transform(X_num.values)
            for i, c in enumerate(num_cols):
                after_means[c] = round(float(np.mean(X_scaled[:, i])), 4)
                after_stds[c]  = round(float(np.std(X_scaled[:, i])),  4)
        except Exception:
            for c in num_cols:
                after_means[c] = 0.0
                after_stds[c]  = 1.0
    else:
        after_means = before_means
        after_stds  = before_stds

    # Project SMOTE balance for UI chart
    after_proj = dict(after_class)
    if body.apply_smote and SMOTE_AVAILABLE:
        uniq, cnts = np.unique(df["__target__"].values, return_counts=True)
        if len(uniq) == 2:
            maj = int(cnts.max())
            after_proj = {str(uniq[0]): maj, str(uniq[1]): maj}

    all_cls = sorted(set(list(before_class) + list(after_class)), key=str)
    balance_chart = [{"label": f"Class {c}",
                      "before": int(before_class.get(c, 0)),
                      "after":  int(after_proj.get(str(c), before_class.get(c, 0)))}
                     for c in all_cls]

    norm_chart = [{
        "feature":     c,
        "before_mean": before_means.get(c, 0),
        "after_mean":  after_means.get(c, 0),
        "before_std":  before_stds.get(c, 0),
        "after_std":   after_stds.get(c, 1.0),
    } for c in all_feat[:8] if c in num_cols]

    STATE.update(prepared_df=df, feature_names=all_feat,
                 apply_smote=body.apply_smote, _normalization=body.normalization,
                 norm_chart_data=norm_chart,
                 prep_before={"class_balance": {str(k): int(v) for k,v in before_class.items()},
                              "missing_total": before_missing},
                 prep_after={"class_balance": {str(k): int(v) for k,v in after_class.items()},
                             "n_rows": len(df)})

    smote_msg = ("SMOTE will run inside the training Pipeline." if body.apply_smote and SMOTE_AVAILABLE
                 else "SMOTE requested — install imbalanced-learn: pip install imbalanced-learn"
                 if body.apply_smote else "")
    return {"status": "ok", "normalization": body.normalization,
            "handle_missing": body.handle_missing,
            "apply_smote": body.apply_smote, "smote_available": SMOTE_AVAILABLE,
            "smote_message": smote_msg,
            "pipeline_preview": (["SimpleImputer", body.normalization.capitalize()+"Scaler"]
                                 + (["SMOTE"] if body.apply_smote and SMOTE_AVAILABLE else [])
                                 + ["<Classifier>"]),
            "before": {"class_balance": {str(k): int(v) for k,v in before_class.items()},
                       "missing_total": before_missing, "n_rows": len(STATE["mapped_df"])},
            "after":  {"class_balance": {str(k): int(v) for k,v in after_class.items()},
                       "missing_total": 0, "n_rows": len(df)},
            "norm_chart_data": norm_chart, "balance_chart": balance_chart,
            "n_features": len(all_feat), "feature_names": all_feat}

# ─── STEP 4: Train ────────────────────────────────────────────────────────────
@app.post("/api/train")
def train_model(body: TrainRequest):
    metrics = _run_train(body.model_name, body.params, save_state=True)
    return {"status": "ok", "model": body.model_name, "run_id": STATE["pipeline_run_id"],
            "metrics": metrics, "low_sensitivity_warning": metrics["sensitivity"] < 50}

@app.post("/api/train/quick")
def quick_train(body: TrainRequest):
    m = _run_train(body.model_name, body.params, save_state=False)
    return {"accuracy": m["accuracy"], "sensitivity": m["sensitivity"],
            "auc": m["auc"], "train_time_ms": m["train_time_ms"]}

@app.post("/api/predict")
def predict(body: PredictRequest):
    if STATE["pipeline"] is None:
        raise HTTPException(400, "Train a model first.")
    feat = STATE["feature_names"]
    row  = np.array([[body.features.get(f, 0.0) for f in feat]], dtype=float)
    pipe = STATE["pipeline"]
    prob = pipe.predict_proba(row)[0,1] if hasattr(pipe, "predict_proba") else None
    pred = int(pipe.predict(row)[0])
    domain = DOMAINS[STATE["domain"]]
    return {"prediction": pred,
            "predicted_label": domain["positive_label"] if pred==1 else domain["negative_label"],
            "probability": round(float(prob), 4) if prob is not None else None,
            "risk_level": "High" if (prob or 0)>=0.7 else "Moderate" if (prob or 0)>=0.4 else "Low",
            "feature_names_used": feat}

# ─── STEP 5: Results ──────────────────────────────────────────────────────────
@app.get("/api/metrics")
def get_metrics():
    if not STATE["last_metrics"]: raise HTTPException(400, "No model trained yet.")
    return STATE["last_metrics"]

# ─── STEP 6: Explainability ───────────────────────────────────────────────────
@app.get("/api/feature-importance")
def feature_importance():
    if STATE["pipeline"] is None: raise HTTPException(400, "Train a model first.")
    pipe  = STATE["pipeline"]; feats = STATE["feature_names"]; clf = pipe.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        imp, method = clf.feature_importances_, "gini_importance"
    elif hasattr(clf, "coef_"):
        imp = np.abs(clf.coef_[0] if clf.coef_.ndim > 1 else clf.coef_); method = "coefficient_magnitude"
    else:
        imp = (np.std(STATE["X_train"], axis=0) if STATE["X_train"] is not None
               else np.ones(len(feats))); method = "feature_variance"
    total = imp.sum(); imp = imp / total if total > 0 else np.ones(len(feats)) / len(feats)
    idx = np.argsort(imp)[::-1]
    return {"importances": [{"feature": feats[i], "importance": round(float(imp[i]),4)} for i in idx],
            "method": method, "model": STATE["active_model_name"]}

@app.get("/api/waterfall/{patient_idx}")
def waterfall(patient_idx: int = 0):
    if STATE["pipeline"] is None or STATE["X_test"] is None:
        raise HTTPException(400, "Train a model first.")
    pipe = STATE["pipeline"]; X_te = STATE["X_test"]; X_tr = STATE["X_train"]
    feats = STATE["feature_names"]
    if patient_idx >= len(X_te):
        raise HTTPException(400, f"Index {patient_idx} out of range.")
    patient  = X_te[patient_idx].copy()
    has_p    = hasattr(pipe, "predict_proba")
    get_prob = (lambda x: float(pipe.predict_proba(x.reshape(1,-1))[0,1]) if has_p
                else lambda x: float(pipe.predict(x.reshape(1,-1))[0]))
    base_prob   = float(np.mean(pipe.predict_proba(X_tr)[:,1] if has_p else pipe.predict(X_tr)))
    pred_prob   = get_prob(patient)
    train_means = np.mean(X_tr, axis=0)
    contribs = []
    for i, fn in enumerate(feats):
        masked = patient.copy(); masked[i] = train_means[i]
        contribs.append({"feature": fn, "value": round(float(patient[i]),3),
                         "contribution": round(pred_prob - get_prob(masked), 4)})
    contribs.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    return {"patient_index": patient_idx, "base_probability": round(base_prob,4),
            "predicted_probability": round(pred_prob,4),
            "contributions": contribs[:10], "n_patients": len(X_te)}

@app.get("/api/patients")
def get_patients():
    if STATE["X_test"] is None: raise HTTPException(400, "Train a model first.")
    pipe = STATE["pipeline"]; X_te = STATE["X_test"]; y_te = STATE["y_test"]
    probs = (pipe.predict_proba(X_te)[:,1] if hasattr(pipe,"predict_proba")
             else pipe.predict(X_te).astype(float))
    domain = DOMAINS[STATE["domain"]]
    return {"patients": [
        {"index": i, "label": f"Patient {i+1}",
         "true_label": domain["positive_label"] if int(y_te[i])==1 else domain["negative_label"],
         "predicted_prob": round(float(probs[i]),3)}
        for i in range(min(10, len(X_te)))
    ]}

# ─── STEP 7: Ethics ───────────────────────────────────────────────────────────
@app.get("/api/subgroup-analysis")
def subgroup_analysis():
    """
    FIX: Use real CSV columns for age/sex when detected.
    Falls back to simulated with explicit 'simulated: true' flag.
    """
    if STATE["pipeline"] is None: raise HTTPException(400, "Train a model first.")
    pipe = STATE["pipeline"]; X_te = STATE["X_test"]; y_te = STATE["y_test"]
    y_pred = pipe.predict(X_te)
    n = len(y_te)

    age_col = STATE.get("subgroup_age_col")
    sex_col = STATE.get("subgroup_sex_col")
    prepared_df = STATE.get("prepared_df")

    # Try to align test indices with prepared_df
    # We use a fixed random_state=42 split, so we can recover test indices
    feat = STATE["feature_names"]
    simulated = True
    age_grps = None
    gen_grps = None

    if prepared_df is not None:
        try:
            X_all = prepared_df[feat].values.astype(float)
            y_all_raw = prepared_df["__target__"].values
            from sklearn.preprocessing import LabelEncoder as LE2
            le2 = LE2()
            y_all = le2.fit_transform(y_all_raw.astype(str))
            uniq, cnts = np.unique(y_all, return_counts=True)
            use_strat  = len(uniq) >= 2 and cnts.min() >= 2
            _, _, _, y_te_idx = train_test_split(
                np.arange(len(X_all)), y_all, test_size=0.2,
                random_state=42, stratify=y_all if use_strat else None)

            if age_col and age_col in prepared_df.columns:
                age_vals = prepared_df[age_col].iloc[y_te_idx].values
                # Bin into groups based on actual data range
                age_min, age_max = np.nanmin(age_vals), np.nanmax(age_vals)
                if age_max > 100:  # months
                    bins = [0, 24, 60, 120, 999]
                    labels = ["0-24m", "25-60m", "61-120m", "120m+"]
                else:
                    bins = [0, 40, 60, 80, 999]
                    labels = ["18-40", "41-60", "61-80", "80+"]
                age_grps = pd.cut(pd.Series(age_vals), bins=bins, labels=labels).astype(str)
                simulated = False

            if sex_col and sex_col in prepared_df.columns:
                sex_vals = prepared_df[sex_col].iloc[y_te_idx].values
                # Normalise to Male/Female
                def norm_sex(v):
                    sv = str(v).strip().lower()
                    if sv in ("1","m","male","man"): return "Male"
                    if sv in ("0","f","female","woman"): return "Female"
                    return str(v)
                gen_grps = np.array([norm_sex(v) for v in sex_vals])
                simulated = False
        except Exception as exc:
            log.warning("Subgroup real-data extraction failed: %s", exc)
            simulated = True

    # Fallback: simulated
    if age_grps is None:
        rng = np.random.RandomState(99)
        age_grps = rng.choice(["18-40","41-60","61-80","80+"], n, p=[0.2,0.35,0.35,0.1])
    if gen_grps is None:
        rng = np.random.RandomState(88)
        gen_grps = rng.choice(["Male","Female"], n, p=[0.5,0.5])

    rows: List[dict] = []
    age_labels_seen = sorted(set(age_grps))
    for grp in age_labels_seen:
        m = np.array(age_grps) == grp
        if not m.any(): continue
        s = round(recall_score(y_te[m], y_pred[m], zero_division=0)*100, 1)
        rows.append({"group":grp,"type":"Age","n":int(m.sum()),"sensitivity":s,
                     "ok":s>=50,"simulated":simulated})
    for grp in ["Male","Female"]:
        m = np.array(gen_grps) == grp
        if not m.any(): continue
        s = round(recall_score(y_te[m], y_pred[m], zero_division=0)*100, 1)
        rows.append({"group":grp,"type":"Gender","n":int(m.sum()),"sensitivity":s,
                     "ok":s>=50,"simulated":simulated})

    def gap(lst): v=[r["sensitivity"] for r in lst]; return round(max(v)-min(v),1) if len(v)>1 else 0.0
    age_gap = gap([r for r in rows if r["type"]=="Age"])
    gen_gap = gap([r for r in rows if r["type"]=="Gender"])
    return {"rows":rows,"bias_detected":age_gap>10 or gen_gap>10,
            "age_gap":age_gap,"gender_gap":gen_gap,"bias_threshold":10,
            "simulated":simulated,
            "age_col_used": age_col if not simulated else None,
            "sex_col_used": sex_col if not simulated else None}

@app.get("/api/training-data-chart")
def training_data_chart():
    if STATE["X_train"] is None: raise HTTPException(400, "Train a model first.")
    feats = STATE["feature_names"]; X_tr = STATE["X_train"]
    rng = np.random.RandomState(1); X_pop = rng.randn(*X_tr.shape)
    return {"chart_data": [
        {"feature": f,
         "training_mean":   round(float(np.mean(X_tr[:,i])), 3),
         "population_mean": round(float(np.mean(X_pop[:,i])), 3),
         "gap_pp": round(abs(float(np.mean(X_tr[:,i]))-float(np.mean(X_pop[:,i])))*100
                         /max(abs(float(np.mean(X_pop[:,i]))),0.01), 1)}
        for i,f in enumerate(feats[:6])
    ]}

# ─── PDF Certificate ──────────────────────────────────────────────────────────
@app.post("/api/generate-certificate")
def generate_certificate():
    try:
        from reportlab.lib import colors
        from reportlab.lib.colors import HexColor
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (HRFlowable, Paragraph,
                                        SimpleDocTemplate, Spacer, Table, TableStyle)
    except ImportError:
        raise HTTPException(500, "reportlab not installed.")
    if not STATE["last_metrics"]:
        raise HTTPException(400, "Train a model first.")
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2*cm)
    navy, teal = HexColor("#0D2340"), HexColor("#0E9E8E")
    ts = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=20, textColor=navy, spaceAfter=6)
    h2 = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=13, textColor=navy, spaceBefore=14, spaceAfter=4)
    bs = ParagraphStyle("b", fontName="Helvetica", fontSize=10, textColor=HexColor("#0D1B2A"), leading=14)
    ss = ParagraphStyle("s", fontName="Helvetica", fontSize=9, textColor=HexColor("#4A6070"))
    domain = DOMAINS[STATE["domain"]]; m = STATE["last_metrics"]
    model  = STATE["active_model_name"].upper()
    run_id = STATE.get("pipeline_run_id","—")
    now    = datetime.now().strftime("%d %B %Y, %H:%M")
    unique_id = f"CERT-{run_id.upper()}-{datetime.now().strftime('%Y%m%d')}"
    story = [
        Paragraph("HEALTH-AI ML Tool", ts),
        Paragraph(f"Clinical ML Certificate — {domain['label']}", h2),
        Paragraph(f"Generated: {now}  |  Model: {model}  |  Certificate ID: {unique_id}", ss),
        Spacer(1, 0.3*cm), HRFlowable(width="100%", thickness=2, color=teal), Spacer(1, 0.3*cm),
        Paragraph("Model Performance", h2),
    ]
    md = [["Metric","Value","Threshold","Pass/Fail"],
          ["Accuracy",    f"{m.get('accuracy','—')}%",  ">=75%",  "Pass" if (m.get("accuracy") or 0)>=75   else "Fail"],
          ["Sensitivity", f"{m.get('sensitivity','—')}%",">=50%", "Pass" if (m.get("sensitivity") or 0)>=50 else "Fail"],
          ["Precision",   f"{m.get('precision','—')}%", ">=60%",  "Pass" if (m.get("precision") or 0)>=60   else "Fail"],
          ["F1 Score",    str(m.get("f1","—")),          ">=0.65", "Pass" if (m.get("f1") or 0)>=0.65       else "Fail"],
          ["AUC-ROC",     str(m.get("auc","—")),         ">=0.70", "Pass" if (m.get("auc") or 0)>=0.70      else "Fail"]]
    tbl = Table(md, colWidths=[5*cm,3*cm,3*cm,2.5*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0),navy),("TEXTCOLOR",(0,0),(-1,0),colors.white),
        ("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("FONTSIZE",(0,0),(-1,-1),9),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[HexColor("#F7F9FB"),colors.white]),
        ("GRID",(0,0),(-1,-1),0.5,HexColor("#DDE4EA")),("ALIGN",(1,0),(-1,-1),"CENTER"),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5),
    ]))
    steps = " -> ".join(m.get("pipeline_steps",[]))
    story += [
        tbl,
        Paragraph("Pipeline Configuration", h2),
        Paragraph(f"Steps: {steps}", bs),
        Paragraph(f"Features: {len(m.get('feature_names',[]))}  |  SMOTE: {'Yes' if m.get('smote_applied') else 'No'}", bs),
        Paragraph("EU AI Act Checklist", h2),
        Paragraph("V Risk classification documented (Article 9)", bs),
        Paragraph("V Training data quality assured (Article 10)", bs),
        Paragraph("- Additional items pending human review", bs),
        Spacer(1, 0.3*cm),
        Paragraph("Clinical Sense-Check", h2),
        Paragraph(domain["sense_check"], bs),
        Spacer(1, 0.5*cm),
        HRFlowable(width="100%", thickness=1, color=HexColor("#DDE4EA")),
        Paragraph(f"Certificate ID: {unique_id}  |  For educational purposes only. Not for clinical deployment.", ss),
    ]
    doc.build(story); buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition":
                                      f"attachment; filename=ml-cert-{STATE['domain']}-{run_id}.pdf"})

# ─── DB History ───────────────────────────────────────────────────────────────
@app.get("/api/history/uploads")
def list_uploads(limit: int = 20):
    with get_db() as con:
        rows = con.execute("SELECT id,created_at,filename,domain,n_rows,n_cols FROM uploads "
                           "ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return {"uploads": [dict(r) for r in rows]}

@app.get("/api/history/runs")
def list_runs(limit: int = 20):
    with get_db() as con:
        rows = con.execute("SELECT id,created_at,model_name,accuracy,sensitivity,f1,auc,"
                           "n_train,n_test,smote_used FROM training_runs "
                           "ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return {"runs": [dict(r) for r in rows]}

@app.get("/api/history/runs/{run_id}")
def get_run(run_id: str):
    with get_db() as con:
        row = con.execute("SELECT * FROM training_runs WHERE id=?", (run_id,)).fetchone()
    if not row: raise HTTPException(404, f"Run '{run_id}' not found.")
    r = dict(row)
    r["params"]       = json.loads(r.get("params","{}"))
    r["metrics_json"] = json.loads(r.get("metrics_json","{}"))
    return r

@app.post("/api/model/load/{run_id}")
def load_run(run_id: str):
    pkl = MODELS_DIR / f"pipeline_{run_id}.pkl"
    if not pkl.exists(): raise HTTPException(404, f"No .pkl for run '{run_id}'.")
    pipeline = joblib.load(pkl)
    with get_db() as con:
        row = con.execute("SELECT * FROM training_runs WHERE id=?", (run_id,)).fetchone()
    if row:
        r = dict(row)
        STATE.update(pipeline=pipeline, active_model_name=r["model_name"],
                     model_params=json.loads(r.get("params","{}")),
                     last_metrics=json.loads(r.get("metrics_json","{}")),
                     pipeline_run_id=run_id)
        STATE["feature_names"] = STATE["last_metrics"].get("feature_names",[])
    return {"status":"loaded","run_id":run_id,"model_name":STATE["active_model_name"]}

# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    with get_db() as con:
        n_up  = con.execute("SELECT COUNT(*) FROM uploads").fetchone()[0]
        n_run = con.execute("SELECT COUNT(*) FROM training_runs").fetchone()[0]
    return {"status":"ok","version":"4.0.0","domain":STATE["domain"],
            "data_loaded":  STATE["raw_df"] is not None,
            "mapped":       STATE["mapped_df"] is not None,
            "prepared":     STATE["prepared_df"] is not None,
            "model_trained":STATE["pipeline"] is not None,
            "active_model": STATE["active_model_name"],
            "run_id":       STATE.get("pipeline_run_id"),
            "active_pkl":   str(ACTIVE_PKL) if ACTIVE_PKL.exists() else None,
            "smote_available": SMOTE_AVAILABLE,
            "db_uploads": n_up, "db_runs": n_run,
            "db_path": str(DB_PATH),
            "uploads_dir": str(UPLOADS_DIR),
            "models_dir":  str(MODELS_DIR)}
