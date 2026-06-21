"""POST /predict/stage — diabetes staging inference API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_active_user
from diabetes_staging_service import predict_from_measurement
from ml.staging.physio_validation import validate_physio_values
from ml.staging.schemas import StageInput, StageOutput
from models import User

router = APIRouter(tags=["diabetes-staging"])


@router.post("/predict/stage", response_model=StageOutput)
async def predict_stage_endpoint(
    payload: StageInput,
    current_user: User = Depends(get_current_active_user),
):
    del current_user  # auth gate only
    values = payload.model_dump()
    partial = bool(values.pop("partial", False))
    errors = validate_physio_values(values)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    try:
        result = predict_from_measurement(values, partial=partial)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return StageOutput(
        predicted_stage=result["diabetes_stage"],
        predicted_stage_label=result["diabetes_stage_label"],
        stage_probabilities=result.get("stage_probabilities") or {},
        confidence=float(result.get("staging_confidence") or 0.0),
        diabetes_risk_score=result["diabetes_risk_score"],
        diabetes_stage=result["diabetes_stage"],
        diabetes_stage_label=result["diabetes_stage_label"],
        is_estimated=bool(result.get("is_estimated")),
        features_used=int(result.get("features_used") or 0),
        features_total=int(result.get("features_total") or 0),
        imputed_features=result.get("imputed_features"),
        model_name=result.get("model_name"),
        predicted_at=result.get("predicted_at"),
    )
