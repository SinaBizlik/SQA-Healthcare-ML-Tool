from typing import Any
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    ColumnMappingRequest,
    ColumnMappingResponse,
    DataSummaryResponse,
    DomainSelectRequest,
    DomainContextResponse,
    PreprocessRequest,
    PreprocessResponse,
)
from app.services.data_service import (
    apply_column_mapping,
    dataframe_summary,
    get_column_mapper_suggestions,
    load_default_dataset,
    load_uploaded_csv,
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

@app.get("/")
def root():
    return {"message": "Backend working."}

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/domains")
def get_domains() -> dict[str, list[str]]:
    return {"domains": get_all_domains()}

@app.post("/session/domain")
def set_selected_domain(payload: DomainSelectRequest) -> dict[str, str]:
    APP_STATE["selected_domain"] = payload.domain
    return {"message": f"Domain set to {payload.domain}"}

@app.get("/context", response_model=DomainContextResponse)
def get_context(domain: str | None = None) -> DomainContextResponse:
    actual_domain = domain or APP_STATE.get("selected_domain")
    if not actual_domain:
        actual_domain = "Cardiology"
        APP_STATE["selected_domain"] = actual_domain
        
    return get_context_for_domain(actual_domain)

@app.post("/data/default", response_model=DataSummaryResponse)
def load_default_data() -> DataSummaryResponse:
    df = load_default_dataset()
    APP_STATE["raw_df"] = df # Kritik satır
    APP_STATE["mapped_df"] = None
    APP_STATE["schema_saved"] = False
    summary = dataframe_summary(df)
    return DataSummaryResponse(**summary)

@app.post("/data/upload", response_model=DataSummaryResponse)
async def upload_data(file: UploadFile = File(...)) -> DataSummaryResponse:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are allowed.")
    file_bytes = await file.read()
    try:
        df = load_uploaded_csv(file_bytes)
        APP_STATE["raw_df"] = df # Kritik satır
        APP_STATE["mapped_df"] = None
        APP_STATE["schema_saved"] = False
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"CSV could not be parsed: {exc}")
    summary = dataframe_summary(df)
    return DataSummaryResponse(**summary)

@app.get("/data/column-suggestions")
def column_suggestions() -> dict[str, Any]:
    df = APP_STATE.get("raw_df")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded.")
    return {"suggestions": get_column_mapper_suggestions(df)}

@app.post("/data/map-columns", response_model=ColumnMappingResponse)
def map_columns(payload: ColumnMappingRequest) -> ColumnMappingResponse:
    mapping_dicts = [m.model_dump() for m in payload.mappings]
    success, message, target_column = apply_column_mapping(mapping_dicts)
    return ColumnMappingResponse(
        success=success,
        message=message,
        target_column=target_column,
        schema_saved=APP_STATE.get("schema_saved", False),
    )

@app.get("/data/summary", response_model=DataSummaryResponse)
def current_data_summary() -> DataSummaryResponse:
    df = APP_STATE.get("mapped_df") if APP_STATE.get("mapped_df") is not None else APP_STATE.get("raw_df")
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset loaded.")
    return DataSummaryResponse(**dataframe_summary(df))

@app.post("/preprocess/apply", response_model=PreprocessResponse)
def apply_preprocess(payload: PreprocessRequest) -> PreprocessResponse:
    try:
        result = preprocess_dataset(
            train_size_percent=payload.train_size_percent,
            missing_strategy=payload.missing_strategy,
            normalization=payload.normalization,
            smote_enabled=payload.smote_enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return PreprocessResponse(**result)