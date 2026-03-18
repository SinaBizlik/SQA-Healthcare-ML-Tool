from typing import Any, Literal
from pydantic import BaseModel, Field


class DomainContextResponse(BaseModel):
    domain: str
    clinical_question: str
    patient_impact: str
    healthcare_system_impact: str
    clinical_workflow: str
    clinical_note: str


class DomainSelectRequest(BaseModel):
    domain: str


class DataSummaryResponse(BaseModel):
    rows: int
    columns: int
    column_names: list[str]
    missing_percent: float
    preview: list[dict[str, Any]]


class ColumnRoleItem(BaseModel):
    column_name: str
    role: Literal["target", "number", "category", "ignore"]


class ColumnMappingRequest(BaseModel):
    mappings: list[ColumnRoleItem]


class ColumnMappingResponse(BaseModel):
    success: bool
    message: str
    target_column: str | None
    schema_saved: bool


class PreprocessRequest(BaseModel):
    train_size_percent: int = Field(80, ge=60, le=90)
    missing_strategy: Literal["median", "mode", "remove"] = "median"
    normalization: Literal["zscore", "minmax", "none"] = "zscore"
    smote_enabled: bool = False


class SimpleStats(BaseModel):
    numeric_columns: list[str]
    missing_percent: float
    rows: int
    class_distribution: dict[str, int] | None = None


class PreprocessResponse(BaseModel):
    success: bool
    message: str
    before: SimpleStats
    after: SimpleStats
    train_rows: int
    test_rows: int
    target_column: str