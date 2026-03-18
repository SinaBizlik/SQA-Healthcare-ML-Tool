from typing import Any

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, StandardScaler

from app.state import APP_STATE


def _class_distribution(df: pd.DataFrame, target_column: str | None) -> dict[str, int] | None:
    if not target_column or target_column not in df.columns:
        return None
    counts = df[target_column].astype(str).value_counts(dropna=False).to_dict()
    return {str(k): int(v) for k, v in counts.items()}


def _missing_percent(df: pd.DataFrame) -> float:
    rows, cols = df.shape
    return round((df.isna().sum().sum() / max(rows * cols, 1)) * 100, 2)


def _get_numeric_feature_columns(df: pd.DataFrame, target_column: str) -> list[str]:
    numeric_cols = []
    for col in df.columns:
        if col == target_column:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)
    return numeric_cols


def preprocess_dataset(
    train_size_percent: int,
    missing_strategy: str,
    normalization: str,
    smote_enabled: bool,
) -> dict[str, Any]:
    del smote_enabled  # Sprint 2 için UI'da dursun, backend fallback ile sessizce geçiyoruz.

    if not APP_STATE["schema_saved"]:
        raise ValueError("Column mapping must be saved before preprocessing.")

    df = APP_STATE["mapped_df"]
    target_column = APP_STATE["target_column"]

    if df is None or target_column is None:
        raise ValueError("Mapped dataset or target column is missing.")

    before_stats = {
        "numeric_columns": _get_numeric_feature_columns(df, target_column),
        "missing_percent": _missing_percent(df),
        "rows": len(df),
        "class_distribution": _class_distribution(df, target_column),
    }

    work_df = df.copy()

    if missing_strategy == "remove":
        work_df = work_df.dropna()
    elif missing_strategy == "median":
        for col in work_df.columns:
            if col == target_column:
                continue
            if pd.api.types.is_numeric_dtype(work_df[col]):
                work_df[col] = work_df[col].fillna(work_df[col].median())
            else:
                mode = work_df[col].mode(dropna=True)
                fill_value = mode.iloc[0] if not mode.empty else "Unknown"
                work_df[col] = work_df[col].fillna(fill_value)
    elif missing_strategy == "mode":
        for col in work_df.columns:
            if col == target_column:
                continue
            mode = work_df[col].mode(dropna=True)
            fill_value = mode.iloc[0] if not mode.empty else "Unknown"
            work_df[col] = work_df[col].fillna(fill_value)

    numeric_cols = _get_numeric_feature_columns(work_df, target_column)

    if normalization in {"zscore", "minmax"} and numeric_cols:
        scaler = StandardScaler() if normalization == "zscore" else MinMaxScaler()
        work_df[numeric_cols] = scaler.fit_transform(work_df[numeric_cols])

    train_df, test_df = train_test_split(
        work_df,
        train_size=train_size_percent / 100,
        random_state=42,
        stratify=work_df[target_column] if work_df[target_column].nunique() > 1 else None,
    )

    after_stats = {
        "numeric_columns": numeric_cols,
        "missing_percent": _missing_percent(work_df),
        "rows": len(work_df),
        "class_distribution": _class_distribution(work_df, target_column),
    }

    result = {
        "success": True,
        "message": "Preprocessing applied successfully.",
        "before": before_stats,
        "after": after_stats,
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "target_column": target_column,
    }

    APP_STATE["last_preprocess_result"] = result
    return result