"""Feature counts for profile completeness and partial predictions."""

TOTAL_FEATURES = 25
LAB_FEATURE_KEYS = (
    "systolic_bp",
    "diastolic_bp",
    "heart_rate",
    "cholesterol_total",
    "ldl_cholesterol",
    "hdl_cholesterol",
    "triglycerides",
)

# Mean imputation defaults when lab fields are missing
LAB_MEAN_IMPUTATION = {
    "systolic_bp": 120,
    "diastolic_bp": 80,
    "heart_rate": 72,
    "cholesterol_total": 190,
    "ldl_cholesterol": 115,
    "hdl_cholesterol": 52,
    "triglycerides": 140,
}

STAGE_LABELS = {
    0: "Low risk",
    1: "Pre-diabetic",
    2: "High risk",
}


def activity_level_from_minutes(minutes: int) -> str:
    if minutes == 0:
        return "sedentary"
    if minutes < 90:
        return "light"
    if minutes < 210:
        return "moderate"
    return "active"


def count_filled_features(measurement, user) -> int:
    """Approximate filled feature count out of TOTAL_FEATURES."""
    filled = 0
    if user:
        if user.age or user.date_of_birth:
            filled += 1
        if user.gender:
            filled += 1
        if user.ethnicity:
            filled += 1
        if user.education_level:
            filled += 1
        if user.employment_status:
            filled += 1
        if user.income_level:
            filled += 1
    if not measurement:
        return filled

    for attr in (
        "bmi",
        "waist_to_hip_ratio",
        "smoking_status",
        "alcohol_group",
        "physical_activity_minutes",
        "sleep_hours_per_day",
        "screen_time_hours_per_day",
        "family_history_diabetes",
        "hypertension_history",
        "cardiovascular_history",
        "height_cm",
        "weight_kg",
        "waist_cm",
        "hip_cm",
    ):
        if getattr(measurement, attr, None) is not None:
            filled += 1

    for key in LAB_FEATURE_KEYS:
        if getattr(measurement, key, None) is not None:
            filled += 1

    return min(filled, TOTAL_FEATURES)


def profile_completeness_pct(filled: int) -> int:
    return round((filled / TOTAL_FEATURES) * 100)
