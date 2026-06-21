"""Pydantic input/output schemas for POST /predict/stage."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class StageInput(BaseModel):
    """Raw patient features (one field per training column)."""

    partial: bool = False
    age: float = Field(..., ge=1, le=120)
    gender: str
    ethnicity: Optional[str] = None
    education_level: Optional[str] = None
    employment_status: Optional[str] = None
    income_level: Optional[str] = None
    bmi: float = Field(..., ge=10, le=80)
    waist_to_hip_ratio: Optional[float] = Field(default=None, ge=0.5, le=1.5)
    abdominal_obesity: Optional[bool] = None
    smoking_status: str
    alcohol_group: str
    physical_activity_minutes: int = Field(..., ge=0, le=2000)
    sleep_hours_per_day: float = Field(..., ge=2, le=16)
    screen_time_hours_per_day: float = Field(..., ge=0, le=24)
    family_history_diabetes: bool = False
    hypertension_history: bool = False
    cardiovascular_history: bool = False
    systolic_bp: Optional[int] = Field(default=None, ge=60, le=250)
    diastolic_bp: Optional[int] = Field(default=None, ge=30, le=150)
    heart_rate: Optional[int] = Field(default=None, ge=30, le=220)
    cholesterol_total: Optional[int] = Field(default=None, ge=80, le=500)
    ldl_cholesterol: Optional[int] = Field(default=None, ge=20, le=400)
    hdl_cholesterol: Optional[int] = Field(default=None, ge=10, le=150)
    triglycerides: Optional[int] = Field(default=None, ge=30, le=2000)
    glucose_fasting: Optional[float] = Field(default=None, ge=40, le=600)
    fasting_glucose: Optional[float] = Field(default=None, ge=40, le=600)
    glucose_postprandial: Optional[float] = Field(default=None, ge=40, le=600)
    hba1c: Optional[float] = Field(default=None, ge=3.0, le=20.0)
    insulin_level: Optional[float] = Field(default=None, ge=0.1, le=500)


class StageOutput(BaseModel):
    predicted_stage: int
    predicted_stage_label: str
    stage_probabilities: Dict[str, float]
    confidence: float
    diabetes_risk_score: float
    diabetes_stage: int
    diabetes_stage_label: str
    is_estimated: bool
    features_used: int
    features_total: int
    imputed_features: Optional[List[str]] = None
    model_name: Optional[str] = None
    predicted_at: datetime
