-- Auto-generated from live healthcare.db — do not edit by hand.
-- Exported: 2026-06-16T22:01:29.595325+00:00

PRAGMA foreign_keys = OFF;

CREATE INDEX idx_clinical_profile_patient ON patient_clinical_profile (patient_id);

CREATE INDEX idx_measurements_current ON patient_measurements (patient_id, is_current);

CREATE INDEX idx_measurements_patient ON patient_measurements (patient_id, created_at DESC);

CREATE INDEX idx_patients_user_id ON patients (user_id);

CREATE INDEX ix_app_notifications_id ON app_notifications (id);

CREATE INDEX ix_app_notifications_patient_id ON app_notifications (patient_id);

CREATE INDEX ix_appointments_id ON appointments (id);

CREATE INDEX ix_chat_messages_id ON chat_messages (id);

CREATE INDEX ix_chat_sessions_id ON chat_sessions (id);

CREATE UNIQUE INDEX ix_chat_sessions_session_id ON chat_sessions (session_id);

CREATE INDEX ix_lab_uploads_id ON lab_uploads (id);

CREATE INDEX ix_lab_uploads_patient_id ON lab_uploads (patient_id);

CREATE INDEX ix_medical_records_id ON medical_records (id);

CREATE INDEX ix_medications_id ON medications (id);

CREATE INDEX ix_messages_id ON messages (id);

CREATE INDEX ix_predictions_id ON predictions (id);

CREATE INDEX ix_predictions_patient_id ON predictions (patient_id);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE UNIQUE INDEX ix_users_google_id ON users (google_id);

CREATE INDEX ix_users_id ON users (id);

CREATE TABLE app_notifications (
	id INTEGER NOT NULL, 
	patient_id INTEGER NOT NULL, 
	notification_type VARCHAR NOT NULL, 
	channel VARCHAR, 
	title VARCHAR NOT NULL, 
	body TEXT NOT NULL, 
	scheduled_at DATETIME, 
	sent_at DATETIME, 
	cancelled BOOLEAN, 
	pinned BOOLEAN, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE appointments (
	id INTEGER NOT NULL, 
	patient_id INTEGER, 
	doctor_name VARCHAR NOT NULL, 
	appointment_date DATETIME NOT NULL, 
	duration INTEGER, 
	location VARCHAR, 
	notes TEXT, 
	status VARCHAR, 
	appointment_type VARCHAR, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE chat_messages (
	id INTEGER NOT NULL, 
	session_id VARCHAR, 
	sender VARCHAR NOT NULL, 
	content TEXT NOT NULL, 
	message_type VARCHAR, 
	message_data JSON, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES chat_sessions (session_id)
);

CREATE TABLE chat_sessions (
	id INTEGER NOT NULL, 
	patient_id INTEGER, 
	session_id VARCHAR, 
	is_active BOOLEAN, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE lab_uploads (
	id INTEGER NOT NULL, 
	patient_id INTEGER NOT NULL, 
	file_url VARCHAR NOT NULL, 
	file_type VARCHAR NOT NULL, 
	file_size_kb INTEGER, 
	ocr_status VARCHAR, 
	ocr_raw_output JSON, 
	ocr_extracted_values JSON, 
	ocr_confidence_score FLOAT, 
	manually_corrected BOOLEAN, 
	review_confirmed BOOLEAN, 
	lab_date DATETIME, 
	uploaded_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	processed_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE medical_records (
	id INTEGER NOT NULL, 
	patient_id INTEGER, 
	record_type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	date DATETIME NOT NULL, 
	provider VARCHAR, 
	status VARCHAR, 
	critical BOOLEAN, 
	file_url VARCHAR, 
	content TEXT, 
	record_data JSON, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE medications (
	id INTEGER NOT NULL, 
	patient_id INTEGER, 
	name VARCHAR NOT NULL, 
	dosage VARCHAR NOT NULL, 
	frequency VARCHAR NOT NULL, 
	start_date DATETIME, 
	end_date DATETIME, 
	is_active BOOLEAN, 
	critical BOOLEAN, 
	category VARCHAR, 
	notes TEXT, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE messages (
	id INTEGER NOT NULL, 
	patient_id INTEGER, 
	sender VARCHAR NOT NULL, 
	content TEXT NOT NULL, 
	message_type VARCHAR, 
	is_read BOOLEAN, 
	priority VARCHAR, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
);

CREATE TABLE patient_clinical_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    diabetes_type VARCHAR,
    year_of_diagnosis INTEGER,
    years_since_diagnosis INTEGER,
    on_insulin BOOLEAN,
    insulin_regimen VARCHAR,
    on_sglt2i BOOLEAN,
    on_metformin BOOLEAN,
    on_statin BOOLEAN,
    on_antihypertensive BOOLEAN,
    medication_list TEXT,
    last_eye_exam_date TEXT,
    last_kidney_function_date TEXT,
    last_foot_exam_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES users(id)
);

CREATE TABLE patient_measurements (
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

CREATE TABLE patients (
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

CREATE TABLE predictions (
	id INTEGER NOT NULL, 
	patient_id INTEGER NOT NULL, 
	measurement_id INTEGER NOT NULL, 
	diabetes_stage INTEGER NOT NULL, 
	diabetes_risk_score FLOAT NOT NULL, 
	diagnosed_diabetes BOOLEAN, 
	retinopathy_risk FLOAT NOT NULL, 
	nephropathy_risk FLOAT NOT NULL, 
	neuropathy_risk FLOAT NOT NULL, 
	feature_importances JSON, 
	staging_confidence FLOAT, 
	risk_score_confidence FLOAT, 
	triggered_by VARCHAR, 
	model_name VARCHAR, 
	predicted_at DATETIME DEFAULT (CURRENT_TIMESTAMP), is_estimated BOOLEAN DEFAULT 0, features_used INTEGER, features_total INTEGER DEFAULT 25, imputed_features TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id), 
	FOREIGN KEY(measurement_id) REFERENCES "patient_measurements_legacy" (id)
);

CREATE TABLE users (
	id INTEGER NOT NULL, 
	email VARCHAR NOT NULL, 
	hashed_password VARCHAR, 
	full_name VARCHAR NOT NULL, 
	google_id VARCHAR, 
	google_picture VARCHAR, 
	phone VARCHAR, 
	date_of_birth DATETIME, 
	blood_type VARCHAR, 
	bmi VARCHAR, 
	blood_pressure VARCHAR, 
	emergency_contact VARCHAR, 
	address VARCHAR, 
	gender VARCHAR, 
	age INTEGER, 
	ethnicity VARCHAR, 
	education_level VARCHAR, 
	employment_status VARCHAR, 
	income_level VARCHAR, 
	onboarding_completed BOOLEAN, 
	onboarding_lab_opt_in BOOLEAN, 
	isf_mg_dl_per_unit FLOAT, 
	icr_grams_per_unit FLOAT, 
	dexcom_refresh_token_enc TEXT, 
	is_active BOOLEAN, 
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
	updated_at DATETIME, education_major TEXT, lab_upload_pending BOOLEAN DEFAULT 0, nationality VARCHAR, marital_status VARCHAR, caregiver_name VARCHAR, caregiver_phone VARCHAR, preferred_language VARCHAR DEFAULT 'en', is_diabetic_path BOOLEAN, 
	PRIMARY KEY (id)
);

CREATE VIEW v_complications_model_features AS
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

CREATE VIEW v_staging_model_features AS
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

PRAGMA foreign_keys = ON;
