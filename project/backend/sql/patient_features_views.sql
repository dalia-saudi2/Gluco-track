CREATE VIEW IF NOT EXISTS v_staging_model_features AS
SELECT
    m.id AS measurement_id,
    m.patient_id,
    m.age,
    p.gender,
    p.ethnicity,
    p.education_level,
    p.employment_status,
    p.income_level,
    m.smoking_status,
    m.alcohol_group,
    m.physical_activity_minutes,
    m.activity_level,
    m.sleep_hours_per_day,
    m.screen_time_hours_per_day,
    m.bmi,
    m.bmi_group,
    m.waist_to_hip_ratio,
    m.abdominal_obesity,
    m.systolic_bp,
    m.diastolic_bp,
    m.heart_rate,
    m.cholesterol_total,
    m.ldl_cholesterol,
    m.hdl_cholesterol,
    m.triglycerides,
    m.family_history_diabetes,
    m.hypertension_history,
    m.cardiovascular_history,
    m.measured_at
FROM patient_measurements m
JOIN patients p ON p.id = m.patient_id
WHERE m.is_current = 1;

CREATE VIEW IF NOT EXISTS v_complications_model_features AS
SELECT
    m.id AS measurement_id,
    m.patient_id,
    c.diabetes_type,
    c.years_since_diagnosis,
    c.on_insulin,
    c.on_sglt2i,
    m.hypertension_history,
    m.hba1c,
    m.hematocrit,
    m.ldl_cholesterol,
    m.hdl_cholesterol,
    m.triglycerides,
    m.measured_at
FROM patient_measurements m
JOIN patients p ON p.id = m.patient_id
LEFT JOIN patient_clinical_profile c ON c.patient_id = p.id
WHERE m.is_current = 1;
