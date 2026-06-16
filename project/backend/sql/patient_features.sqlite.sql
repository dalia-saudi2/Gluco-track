-- =============================================================================
-- Patient Feature Database — SQLite (Groups 1–5)
-- Tables: patients | patient_clinical_profile | patient_measurements
-- Dev note: `users` holds auth; `patients.id` = `users.id` (1:1)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- GROUP 1 — Demographics & identity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS patients (
    id                  INTEGER PRIMARY KEY,
    user_id             INTEGER NOT NULL UNIQUE,
    date_of_birth       TEXT,
    age                 INTEGER NOT NULL CHECK (age BETWEEN 20 AND 79),
    gender              TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    ethnicity           TEXT NOT NULL CHECK (ethnicity IN ('white', 'black', 'hispanic', 'asian', 'other')),
    education_level     INTEGER NOT NULL CHECK (education_level BETWEEN 0 AND 4),
    employment_status   TEXT NOT NULL CHECK (employment_status IN ('employed_full', 'employed_part', 'unemployed', 'retired')),
    income_level        INTEGER NOT NULL CHECK (income_level BETWEEN 0 AND 3),
  -- EMR-only demographics
    nationality         TEXT,
    marital_status      TEXT CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed', 'other')),
    caregiver_name      TEXT,
    caregiver_phone     TEXT,
    preferred_language  TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar')),
    is_diabetic_path    INTEGER,
    lab_upload_pending  INTEGER NOT NULL DEFAULT 0,
    onboarding_complete INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);

-- ---------------------------------------------------------------------------
-- GROUP 2 — Diabetes-specific clinical facts (1:1 with patient)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS patient_clinical_profile (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id                  INTEGER NOT NULL UNIQUE,
    diabetes_type               TEXT CHECK (diabetes_type IS NULL OR diabetes_type IN ('type1', 'type2', 'unknown')),
    year_of_diagnosis           INTEGER CHECK (year_of_diagnosis IS NULL OR year_of_diagnosis BETWEEN 1950 AND 2100),
    years_since_diagnosis       INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN year_of_diagnosis IS NULL THEN NULL
            ELSE CAST(strftime('%Y', 'now') AS INTEGER) - year_of_diagnosis
        END
    ) STORED,
    on_insulin                  INTEGER,
    insulin_regimen             TEXT CHECK (insulin_regimen IS NULL OR insulin_regimen IN ('basal', 'basal_bolus', 'pump')),
    on_sglt2i                   INTEGER,
    on_metformin                INTEGER,
    on_statin                   INTEGER,
    on_antihypertensive         INTEGER,
    medication_list             TEXT,
    last_eye_exam_date          TEXT,
    last_kidney_function_date   TEXT,
    last_foot_exam_date         TEXT,
    created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                  TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clinical_profile_patient ON patient_clinical_profile (patient_id);

-- ---------------------------------------------------------------------------
-- GROUPS 3–5 — Lifestyle, home measurements, labs (time-series)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS patient_measurements (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id                  INTEGER NOT NULL,
    source                      TEXT NOT NULL DEFAULT 'manual'
        CHECK (source IN ('manual', 'manual_partial', 'ocr', 'device_sync')),
    source_lab_upload_id        INTEGER,
    lab_data_complete           INTEGER NOT NULL DEFAULT 1,
    is_current                  INTEGER NOT NULL DEFAULT 1,
  -- Snapshot for model (copied from patients at measurement time)
    age                         INTEGER NOT NULL CHECK (age >= 0),
  -- Group 4 — body (BMI derived from weight + height)
    weight_kg                   REAL NOT NULL CHECK (weight_kg BETWEEN 30 AND 250),
    height_cm                   REAL NOT NULL CHECK (height_cm BETWEEN 100 AND 220),
    bmi                         REAL GENERATED ALWAYS AS (
        ROUND(weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 2)
    ) STORED,
    bmi_group                   TEXT GENERATED ALWAYS AS (
        CASE
            WHEN (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0))) < 18.5 THEN 'underweight'
            WHEN (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0))) < 25 THEN 'normal'
            WHEN (weight_kg / ((height_cm / 100.0) * (height_cm / 100.0))) < 30 THEN 'overweight'
            ELSE 'obese'
        END
    ) STORED,
    waist_cm                    REAL NOT NULL CHECK (waist_cm BETWEEN 50 AND 200),
    hip_cm                      REAL NOT NULL CHECK (hip_cm BETWEEN 50 AND 200),
    waist_to_hip_ratio          REAL GENERATED ALWAYS AS (
        ROUND(waist_cm / hip_cm, 3)
    ) STORED,
    abdominal_obesity           INTEGER NOT NULL DEFAULT 0,
  -- Vitals
    systolic_bp                 INTEGER CHECK (systolic_bp IS NULL OR systolic_bp BETWEEN 80 AND 200),
    diastolic_bp                INTEGER CHECK (diastolic_bp IS NULL OR diastolic_bp BETWEEN 50 AND 130),
    heart_rate                  INTEGER CHECK (heart_rate IS NULL OR heart_rate BETWEEN 45 AND 120),
  -- Group 3 — lifestyle
    smoking_status              TEXT NOT NULL CHECK (smoking_status IN ('never', 'former', 'current')),
    years_since_quit            INTEGER,
    cigarettes_per_day          INTEGER,
    alcohol_group               TEXT NOT NULL CHECK (alcohol_group IN ('none', 'light', 'moderate', 'heavy')),
    physical_activity_minutes   INTEGER NOT NULL CHECK (physical_activity_minutes BETWEEN 0 AND 420),
    activity_level              TEXT GENERATED ALWAYS AS (
        CASE
            WHEN physical_activity_minutes = 0 THEN 'sedentary'
            WHEN physical_activity_minutes < 90 THEN 'light'
            WHEN physical_activity_minutes < 210 THEN 'moderate'
            ELSE 'active'
        END
    ) STORED,
    sleep_hours_per_day         REAL NOT NULL CHECK (sleep_hours_per_day BETWEEN 4.0 AND 10.0),
    screen_time_hours_per_day   REAL NOT NULL CHECK (screen_time_hours_per_day BETWEEN 0 AND 16),
    diet_quality                TEXT CHECK (diet_quality IS NULL OR diet_quality IN ('poor', 'fair', 'good', 'excellent')),
    stress_level                INTEGER CHECK (stress_level IS NULL OR stress_level BETWEEN 1 AND 5),
    steps_per_day               INTEGER,
  -- History flags (model inputs)
    family_history_diabetes     INTEGER NOT NULL,
    hypertension_history        INTEGER NOT NULL,
    cardiovascular_history      INTEGER NOT NULL,
  -- Group 5 — labs
    cholesterol_total           INTEGER CHECK (cholesterol_total IS NULL OR cholesterol_total BETWEEN 100 AND 350),
    ldl_cholesterol             INTEGER CHECK (ldl_cholesterol IS NULL OR ldl_cholesterol BETWEEN 50 AND 250),
    hdl_cholesterol             INTEGER CHECK (hdl_cholesterol IS NULL OR hdl_cholesterol BETWEEN 20 AND 100),
    triglycerides               INTEGER CHECK (triglycerides IS NULL OR triglycerides BETWEEN 50 AND 500),
    hba1c                       REAL CHECK (hba1c IS NULL OR (hba1c BETWEEN 4.0 AND 14.0)),
    hematocrit                  REAL CHECK (hematocrit IS NULL OR (hematocrit BETWEEN 20 AND 60)),
    fasting_glucose             REAL,
    creatinine                  REAL,
    egfr                        REAL,
    urine_acr                   REAL,
    alt                         REAL,
    tsh                         REAL,
    measured_at                 TEXT NOT NULL DEFAULT (datetime('now')),
    created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
    FOREIGN KEY (source_lab_upload_id) REFERENCES lab_uploads (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_measurements_patient ON patient_measurements (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_current ON patient_measurements (patient_id, is_current);

-- ---------------------------------------------------------------------------
-- Views — applied by build_patient_features_db.py (after table migrations)
-- ---------------------------------------------------------------------------
