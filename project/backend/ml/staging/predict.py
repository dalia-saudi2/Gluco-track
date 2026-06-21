"""predict_stage(): raw input → preprocess → predict_proba → stage + risk score."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np

from ml.staging.feature_builder import build_raw_row_from_api_payload, encode_raw_row
from ml.staging.model_loader import load_bundle

STAGE_LABELS = {0: "Normal", 1: "Prediabetes", 2: "Diabetic"}


def _stage_label(stage: int, estimated: bool) -> str:
    base = STAGE_LABELS.get(stage, "Unknown")
    return f"{base} (estimated)" if estimated else base


def _stage_probabilities(clf, proba: np.ndarray) -> Dict[str, float]:
    lr = clf.named_steps.get("lr") if hasattr(clf, "named_steps") else clf
    classes = getattr(lr, "classes_", [0, 1, 2])
    return {
        STAGE_LABELS.get(int(cls), str(cls)): round(float(proba[i]), 4)
        for i, cls in enumerate(classes)
    }


def predict_stage(
    payload: Dict[str, Any],
    *,
    partial: bool = False,
    imputed_fields: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Run staging inference.

    The classifier ``lr_clf_{mode}.pkl`` is a sklearn Pipeline (StandardScaler + LR).
    Ridge risk score uses separate ``lr_reg_{mode}.pkl`` + ``lr_reg_scaler_{mode}.pkl``.
    """
    mode = "lifestyle" if partial else "clinical"
    bundle = load_bundle(mode) or load_bundle("lifestyle")
    if bundle is None:
        raise FileNotFoundError(
            f"No LR artifacts in prediction_service/artifacts/. "
            f"Run: python -m prediction_service.export_models"
        )

    metadata = bundle["metadata"]
    values = dict(payload)
    values.setdefault("physical_activity_minutes_per_week", values.get("physical_activity_minutes"))

    raw_row, imputed = build_raw_row_from_api_payload(
        values,
        imputation_defaults=metadata["imputation_defaults"],
        partial=partial,
    )
    if imputed_fields:
        imputed = list(dict.fromkeys([*imputed_fields, *imputed]))

    X = encode_raw_row(
        raw_row,
        feature_names=metadata["feature_names"],
        categorical_columns=metadata["categorical_columns"],
        raw_feature_columns=metadata["raw_feature_columns"],
    )

    clf = bundle["clf"]
    reg = bundle["reg"]
    reg_scaler = bundle["reg_scaler"]

    stage = int(clf.predict(X)[0])
    proba = clf.predict_proba(X)[0]
    confidence = float(np.max(proba))
    risk_score = max(0.0, min(100.0, float(reg.predict(reg_scaler.transform(X))[0])))
    estimated = partial or bool(imputed)
    label = _stage_label(stage, estimated)

    return {
        "predicted_stage": stage,
        "predicted_stage_label": label,
        "diabetes_stage": stage,
        "diabetes_stage_label": label,
        "stage_probabilities": _stage_probabilities(clf, proba),
        "confidence": round(confidence, 4),
        "diabetes_risk_score": round(risk_score, 2),
        "imputed_features": imputed,
        "features_used": len(metadata["feature_names"]) - len(imputed),
        "features_total": len(metadata["feature_names"]),
        "is_estimated": estimated,
        "model_name": f"logistic_regression_{mode}_v1",
        "predicted_at": datetime.now(timezone.utc),
    }
