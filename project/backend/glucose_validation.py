"""
Validation layer for meal glucose prediction: carbs plausibility and delta sanity checks.
Not a substitute for clinical judgement or CGM calibration.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

# Tunable thresholds for rejecting inconsistent inputs
MAX_ABS_DELTA_ESTIMATE_MG_DL = 140
MAX_SINGLE_MEAL_CARBS_G = 260
MIN_REASONABLE_CARBS_G = 0.0
SOFT_CAP_CARBS_G = 220  # above this → flag recalibrate / portion review


@dataclass
class CarbsValidationResult:
    carbs_g: float
    flags: List[str]
    recalibrated: bool


def validate_and_normalize_carbs(carbs_g: float, usda_derived_total: Optional[float] = None) -> CarbsValidationResult:
    flags: List[str] = []
    recalibrated = False
    c = float(carbs_g)

    if c < MIN_REASONABLE_CARBS_G:
        flags.append("carbs_non_positive")
        return CarbsValidationResult(carbs_g=max(c, 0.0), flags=flags, recalibrated=recalibrated)

    if c > MAX_SINGLE_MEAL_CARBS_G:
        flags.append("carbs_exceeds_plausible_single_meal")
        c = min(c, MAX_SINGLE_MEAL_CARBS_G)
        recalibrated = True

    if usda_derived_total is not None and usda_derived_total > 0:
        # If client-entered carbs diverge strongly from USDA-based sum, prefer USDA sum
        ratio = max(carbs_g, 1e-6) / max(usda_derived_total, 1e-6)
        if ratio > 2.2 or ratio < 0.45:
            flags.append("carbs_recalibrated_from_usda_sum")
            c = float(usda_derived_total)
            recalibrated = True

    if carbs_g > SOFT_CAP_CARBS_G and not recalibrated:
        flags.append("carbs_high_review_portions")

    return CarbsValidationResult(carbs_g=c, flags=flags, recalibrated=recalibrated)


def estimate_glucose_delta_mg_dl(carbs_g: float, insulin_units: float, icr_g_per_unit: float, isf_mg_dl_per_unit: float) -> float:
    """
    Heuristic net expected excursion (mg/dL): positive ≈ rise if under-covered.
    Uses correction-units-style approximation for magnitude checks only.
    """
    icr = max(icr_g_per_unit, 4.0)
    isf = max(isf_mg_dl_per_unit, 20.0)
    correction_units = (carbs_g / icr) - max(insulin_units, 0.0)
    # Scale: each correction unit loosely tied to ISF / a divisor (empirical stabilizer for outliers)
    return correction_units * (isf * 0.55)


def validate_glucose_delta(delta_est: float) -> Tuple[bool, Optional[str]]:
    if delta_est != delta_est:  # NaN
        return False, "glucose_delta_nan"
    if abs(delta_est) > MAX_ABS_DELTA_ESTIMATE_MG_DL:
        return False, "glucose_delta_implausible"
    return True, None


def validate_reading_trend_slope(readings_mg_dl: List[float]) -> Tuple[bool, Optional[str]]:
    """Reject wildly unstable sparse trends (not physiological over typical CGM spacing)."""
    if len(readings_mg_dl) < 3:
        return True, None
    xs = readings_mg_dl
    slope = (xs[-1] - xs[0]) / max(len(xs) - 1, 1)
    # > 25 mg/dL per step ≈ 5 min → extreme
    if abs(slope) > 25:
        return False, "prior_trend_slope_extreme"
    return True, None
