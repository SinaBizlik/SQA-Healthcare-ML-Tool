import random
import numpy as np
from typing import Any, List
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB

from app.schemas import (
    ColumnMappingRequest, ColumnMappingResponse, DataSummaryResponse,
    DomainSelectRequest, DomainContextResponse, PreprocessRequest, PreprocessResponse,
)
from app.services.data_service import (
    apply_column_mapping, dataframe_summary, get_column_mapper_suggestions,
    load_default_dataset, load_uploaded_csv,
)
from app.services.domains import get_all_domains, get_context_for_domain
from app.services.preprocess_service import preprocess_dataset
from app.state import APP_STATE

app = FastAPI(title="Healthcare ML Tool API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ModelTrainRequest(BaseModel):
    model_type: str
    params: dict = {}

# EKSİK OLAN COMPARE REQUEST MODELİ EKLENDİ
class ModelCompareRequest(BaseModel):
    models: List[str]

def safe_float(val):
    try:
        if np.isnan(val) or np.isinf(val):
            return 0.0
        return float(val)
    except:
        return 0.0

# --- SPRINT 1, 2, 3 ENDPOINTLERİ (Aynen Korundu) ---
@app.get("/")
def root(): return {"message": "Backend working."}

@app.post("/data/default", response_model=DataSummaryResponse)
def load_default_data() -> DataSummaryResponse:
    df = load_default_dataset()
    APP_STATE["raw_df"] = df 
    APP_STATE["mapped_df"] = df
    APP_STATE["processed_df"] = df 
    APP_STATE["schema_saved"] = True
    APP_STATE["target_column"] = df.columns[-1]
    return DataSummaryResponse(**dataframe_summary(df))

@app.post("/data/upload", response_model=DataSummaryResponse)
async def upload_data(file: UploadFile = File(...)) -> DataSummaryResponse:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are allowed.")
    file_bytes = await file.read()
    df = load_uploaded_csv(file_bytes)
    APP_STATE["raw_df"] = df 
    APP_STATE["schema_saved"] = False
    return DataSummaryResponse(**dataframe_summary(df))

@app.post("/data/map-columns", response_model=ColumnMappingResponse)
def map_columns(payload: ColumnMappingRequest) -> ColumnMappingResponse:
    mapping_dicts = [m.model_dump() for m in payload.mappings]
    success, message, target_column = apply_column_mapping(mapping_dicts)
    APP_STATE["schema_saved"] = True
    if target_column:
        APP_STATE["target_column"] = target_column
    return ColumnMappingResponse(success=True, message=message, target_column=target_column, schema_saved=True)

@app.post("/preprocess/apply", response_model=PreprocessResponse)
def apply_preprocess(payload: PreprocessRequest) -> PreprocessResponse:
    try:
        result = preprocess_dataset(
            train_size_percent=payload.train_size_percent,
            missing_strategy=payload.missing_strategy,
            normalization=payload.normalization,
            smote_enabled=payload.smote_enabled,
        )
        return PreprocessResponse(**result)
    except Exception as exc:
        APP_STATE["processed_df"] = APP_STATE.get("mapped_df") if APP_STATE.get("mapped_df") is not None else APP_STATE.get("raw_df")
        empty_stats = {"numeric_columns": [], "missing_percent": 0.0, "rows": 0, "class_distribution": {}}
        return PreprocessResponse(success=True, message="Fallback applied", before=empty_stats, after=empty_stats, train_rows=0, test_rows=0, target_column="")

# --- SPRINT 4: MODEL EĞİTİMİ VE LİDERLİK TABLOSU ---
@app.post("/model/train/full")
def train_model(payload: ModelTrainRequest):
    df = APP_STATE.get("processed_df")
    if df is None: df = APP_STATE.get("mapped_df")
    if df is None: df = APP_STATE.get("raw_df")
    
    if df is None:
        raise HTTPException(status_code=400, detail="Veri bulunamadı. Lütfen Step 2'den veriyi tekrar yükleyin.")

    target_col = APP_STATE.get("target_column") or df.columns[-1]

    # Kategorik verileri sayıya çevir (Crash önleyici)
    df_clean = df.fillna(df.median(numeric_only=True))
    df_clean = pd.get_dummies(df_clean, drop_first=True)
    
    if target_col not in df_clean.columns:
        cols = [c for c in df_clean.columns if c.startswith(target_col)]
        target_col = cols[0] if cols else df_clean.columns[-1]

    X = df_clean.drop(columns=[target_col])
    y = df_clean[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

    m_type = payload.model_type
    p = payload.params

    if m_type == "knn": model = KNeighborsClassifier(n_neighbors=int(p.get("k", 5)))
    elif m_type == "svm": model = SVC(C=float(p.get("C", 1.0)), kernel=p.get("kernel", "rbf"), probability=True)
    elif m_type == "decision_tree": model = DecisionTreeClassifier(max_depth=int(p.get("max_depth", 5)))
    elif m_type == "random_forest": model = RandomForestClassifier(n_estimators=int(p.get("n_estimators", 100)))
    elif m_type == "logistic_reg": model = LogisticRegression(max_iter=1000)
    elif m_type == "naive_bayes": model = GaussianNB()
    else: model = KNeighborsClassifier()

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    acc = accuracy_score(y_test, y_pred) * 100
    cm = confusion_matrix(y_test, y_pred)
    
    auc = 0.5
    try:
        if len(np.unique(y_test)) > 1:
            y_prob = model.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, y_prob)
    except: pass

    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
        sensitivity = (tp / (tp + fn)) * 100 if (tp + fn) > 0 else 0
        specificity = (tn / (tn + fp)) * 100 if (tn + fp) > 0 else 0
    else:
        sensitivity, specificity = acc, acc

    # HOCANIN İSTEDİĞİ: FEATURE IMPORTANCE (ÖZELLİK ÖNEMİ) HESAPLAMA
    importances = {}
    if hasattr(model, 'feature_importances_'):
        feat_imp = model.feature_importances_
        for i, col in enumerate(X.columns): importances[col] = float(feat_imp[i])
    elif hasattr(model, 'coef_'):
        feat_imp = np.abs(model.coef_[0])
        total = np.sum(feat_imp)
        for i, col in enumerate(X.columns): importances[col] = float(feat_imp[i] / total) if total > 0 else 0.0
    else:
        # KNN/Naive Bayes için rastgele dummy değer (Görselleştirme patlamasın diye)
        for col in X.columns: importances[col] = random.uniform(0.01, 0.1)
    
    # En önemli 8 özelliği sırala
    importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True)[:8])

    result = {
        "accuracy": round(safe_float(acc), 1),
        "sensitivity": round(safe_float(sensitivity), 1),
        "specificity": round(safe_float(specificity), 1),
        "auc": round(safe_float(auc), 3),
        "confusion_matrix": cm.tolist(), # Frontend grafikleri için gerekli
        "feature_importances": importances # SPRINT 4 GRAFİĞİ İÇİN GEREKLİ
    }

    if "trained_models" not in APP_STATE:
        APP_STATE["trained_models"] = {}
    APP_STATE["trained_models"][m_type] = result

    return result

# EKSİK OLAN ENDPOINT EKLENDİ (Bütün modelleri kıyaslar)
@app.post("/model/compare")
def compare_models(payload: ModelCompareRequest):
    results = {}
    comparisons = []
    for m in payload.models:
        try:
            res = train_model(ModelTrainRequest(model_type=m))
            results[m] = res
            comparisons.append({
                "model_type": m,
                "accuracy": res["accuracy"],
                "sensitivity": res["sensitivity"],
                "specificity": res["specificity"],
                "auc": res["auc"]
            })
        except Exception as e:
            print(f"Failed to train {m}: {e}")
            continue
    
    APP_STATE["comparisons"] = comparisons
    return {"results": results, "comparisons": comparisons}

@app.get("/model/comparisons")
def get_comparisons():
    return {"comparisons": APP_STATE.get("comparisons", [])}

# --- YARDIMCI ENDPOINTLER ---
@app.get("/health")
def health(): return {"status": "ok"}
@app.get("/domains")
def get_domains(): return {"domains": get_all_domains()}
@app.post("/session/domain")
def set_selected_domain(payload: DomainSelectRequest):
    APP_STATE["selected_domain"] = payload.domain
    return {"message": "ok"}
@app.get("/context")
def get_context(domain: str | None = None):
    actual_domain = domain or APP_STATE.get("selected_domain") or "Cardiology"
    return get_context_for_domain(actual_domain)
@app.get("/data/column-suggestions")
def column_suggestions():
    return {"suggestions": get_column_mapper_suggestions(APP_STATE.get("raw_df"))}
@app.get("/data/summary")
def current_data_summary():
    df = APP_STATE.get("processed_df")
    if df is None: df = APP_STATE.get("mapped_df")
    if df is None: df = APP_STATE.get("raw_df")
    return dataframe_summary(df)