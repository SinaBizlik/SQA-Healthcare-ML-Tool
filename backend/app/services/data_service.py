from io import StringIO
from pathlib import Path
from typing import Any

import pandas as pd

from app.state import APP_STATE

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"


def load_default_dataset() -> pd.DataFrame:
    file_path = DATA_DIR / "cardiology_sample.csv"
    df = pd.read_csv(file_path)
    APP_STATE["raw_df"] = df.copy()
    APP_STATE["mapped_df"] = None
    APP_STATE["column_roles"] = {}
    APP_STATE["target_column"] = None
    APP_STATE["schema_saved"] = False
    APP_STATE["dataset_source"] = "default"
    return df


def load_uploaded_csv(file_bytes: bytes) -> pd.DataFrame:
    decoded = file_bytes.decode("utf-8", errors="ignore")
    df = pd.read_csv(StringIO(decoded))

    APP_STATE["raw_df"] = df.copy()
    APP_STATE["mapped_df"] = None
    APP_STATE["column_roles"] = {}
    APP_STATE["target_column"] = None
    APP_STATE["schema_saved"] = False
    APP_STATE["dataset_source"] = "upload"
    return df


def dataframe_summary(df: pd.DataFrame) -> dict[str, Any]:
    rows, columns = df.shape
    missing_percent = round((df.isna().sum().sum() / max(rows * columns, 1)) * 100, 2)

    preview = df.head(5).fillna("").to_dict(orient="records")

    return {
        "rows": rows,
        "columns": columns,
        "column_names": list(df.columns),
        "missing_percent": missing_percent,
        "preview": preview,
    }


def infer_column_role(series: pd.Series) -> str:
    name = series.name.lower()

    if "id" in name:
        return "ignore"

    if pd.api.types.is_numeric_dtype(series):
        unique_count = series.nunique(dropna=True)
        if unique_count <= 5:
            return "category"
        return "number"

    unique_count = series.nunique(dropna=True)
    if unique_count <= 10:
        return "category"

    return "ignore"


def get_column_mapper_suggestions(df: pd.DataFrame) -> list[dict[str, str]]:
    suggestions = []
    for col in df.columns:
        suggestions.append({
            "column_name": col,
            "suggested_role": infer_column_role(df[col]),
        })
    return suggestions


def apply_column_mapping(mappings: list[dict[str, str]]) -> tuple[bool, str, str | None]:
    raw_df = APP_STATE["raw_df"]
    if raw_df is None:
        return False, "No dataset loaded.", None

    target_candidates = [m["column_name"] for m in mappings if m["role"] == "target"]
    if len(target_candidates) != 1:
        return False, "Exactly one target column must be selected.", None

    target_column = target_candidates[0]

    if target_column not in raw_df.columns:
        return False, "Target column does not exist in the dataset.", None

    kept_columns = [m["column_name"] for m in mappings if m["role"] != "ignore"]
    mapped_df = raw_df[kept_columns].copy()

    APP_STATE["mapped_df"] = mapped_df
    APP_STATE["column_roles"] = {m["column_name"]: m["role"] for m in mappings}
    APP_STATE["target_column"] = target_column
    APP_STATE["schema_saved"] = True

    return True, "Column mapping saved successfully. Step 3 is now unlocked.", target_column