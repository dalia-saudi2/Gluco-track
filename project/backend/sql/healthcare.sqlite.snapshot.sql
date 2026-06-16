-- Full SQLite snapshot (schema + data) from healthcare.db.
-- Exported: 2026-06-16T22:01:29.595325+00:00
-- Restore: py -3.12 setup_database.py --fresh && sqlite3 healthcare.db < healthcare.sqlite.snapshot.sql

BEGIN TRANSACTION;
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
INSERT INTO "app_notifications" VALUES(1,4,'lab_upload_reminder','push','Complete your health profile','Upload your lab results to get a full diabetes risk score.','2026-06-17 01:54:08.932037',NULL,0,1,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(2,4,'lab_upload_reminder','push','Your risk score is still estimated','A quick lab upload takes 30 seconds.','2026-06-19 17:54:08.932037',NULL,0,0,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(3,4,'lab_upload_reminder','push','Profile still incomplete','Upload your results or book a lab test today.','2026-06-23 17:54:08.932037',NULL,0,0,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(4,4,'lab_upload_reminder','push','Half your risk factors are still unknown','An incomplete profile means an incomplete picture of your health.','2026-06-30 17:54:08.932037',NULL,0,0,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(5,4,'lab_upload_reminder','push','Your doctor needs the full picture','Upload lab results or book a test — it only takes a moment.','2026-07-16 17:54:08.932037',NULL,0,0,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(6,4,'lab_upload_reminder','push','Need help finding a lab?','We can help you find a lab near you. Upload when ready.','2026-08-15 17:54:08.932037',NULL,0,0,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(7,4,'lab_upload_reminder','in_app','Action required: Complete your health profile','Your risk score is based on partial data. Upload lab results to unlock a full prediction.',NULL,NULL,0,1,'2026-06-16 17:54:08');
INSERT INTO "app_notifications" VALUES(8,5,'lab_upload_reminder','push','Complete your health profile','Upload your lab results to get a full diabetes risk score.','2026-06-17 04:54:08.382196',NULL,0,1,'2026-06-16 20:54:08');
INSERT INTO "app_notifications" VALUES(9,5,'lab_upload_reminder','push','Your risk score is still estimated','A quick lab upload takes 30 seconds.','2026-06-19 20:54:08.382196',NULL,0,0,'2026-06-16 20:54:08');
INSERT INTO "app_notifications" VALUES(10,5,'lab_upload_reminder','push','Profile still incomplete','Upload your results or book a lab test today.','2026-06-23 20:54:08.382196',NULL,0,0,'2026-06-16 20:54:08');
INSERT INTO "app_notifications" VALUES(11,5,'lab_upload_reminder','push','Half your risk factors are still unknown','An incomplete profile means an incomplete picture of your health.','2026-06-30 20:54:08.382196',NULL,0,0,'2026-06-16 20:54:08');
INSERT INTO "app_notifications" VALUES(12,5,'lab_upload_reminder','push','Your doctor needs the full picture','Upload lab results or book a test — it only takes a moment.','2026-07-16 20:54:08.382196',NULL,0,0,'2026-06-16 20:54:08');
INSERT INTO "app_notifications" VALUES(13,5,'lab_upload_reminder','push','Need help finding a lab?','We can help you find a lab near you. Upload when ready.','2026-08-15 20:54:08.382196',NULL,0,0,'2026-06-16 20:54:08');
INSERT INTO "app_notifications" VALUES(14,5,'lab_upload_reminder','in_app','Action required: Complete your health profile','Your risk score is based on partial data. Upload lab results to unlock a full prediction.',NULL,NULL,0,1,'2026-06-16 20:54:08');
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
INSERT INTO "appointments" VALUES(1,4,'Dr. Mahmoud El-Sayed','2026-06-17 07:30:00.000000',30,'Telehealth','huhcs','scheduled','routine','2026-06-16 18:28:55',NULL);
INSERT INTO "appointments" VALUES(2,5,'Dr. Sarah Johnson','2026-06-23 23:42:31.997167',30,'Main Clinic - Room 101','Annual checkup','scheduled','General Consultation','2026-06-16 20:42:32',NULL);
INSERT INTO "appointments" VALUES(3,5,'Dr. Michael Chen','2026-06-30 23:42:31.997167',45,'Cardiology Center - Room 205','Follow-up on blood pressure','scheduled','Cardiology','2026-06-16 20:42:32',NULL);
INSERT INTO "appointments" VALUES(4,5,'Dr. Emily Rodriguez','2026-06-11 23:42:31.997167',30,'Main Clinic - Room 102','Completed - Blood test results normal','completed','Lab Results Review','2026-06-16 20:42:32',NULL);
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
INSERT INTO "chat_messages" VALUES(1,'a74f78c3-0da2-4071-b00c-08f5216921c2','ai','Hello! How can I help you today?','text',NULL,'2026-06-16 20:42:32');
INSERT INTO "chat_messages" VALUES(2,'a74f78c3-0da2-4071-b00c-08f5216921c2','user','I''d like to schedule an appointment','text',NULL,'2026-06-16 20:42:32');
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
INSERT INTO "chat_sessions" VALUES(1,4,'2dc18bc8-8c60-441c-9c3d-9bc7a27b2078',1,'2026-06-16 18:08:04',NULL);
INSERT INTO "chat_sessions" VALUES(2,5,'a74f78c3-0da2-4071-b00c-08f5216921c2',1,'2026-06-16 20:42:32',NULL);
INSERT INTO "chat_sessions" VALUES(3,5,'f29c1687-470a-4e61-97b3-15ccaadb1490',1,'2026-06-16 20:54:22',NULL);
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
INSERT INTO "medical_records" VALUES(1,5,'lab','Complete Blood Count','2026-06-11 23:42:32.000837','LabCorp','reviewed',0,'https://example.com/reports/cbc_2024.pdf','All values within normal range.',NULL,'2026-06-16 20:42:32',NULL);
INSERT INTO "medical_records" VALUES(2,5,'imaging','Chest X-Ray','2026-06-06 23:42:32.000837','Radiology Associates','reviewed',0,'https://example.com/reports/chest_xray_2024.pdf','Clear lung fields, no acute findings.',NULL,'2026-06-16 20:42:32',NULL);
INSERT INTO "medical_records" VALUES(3,5,'summary','Annual Physical Summary','2026-05-17 23:42:32.000837','Dr. Sarah Johnson','reviewed',0,NULL,'Overall health good. Continue current medications.',NULL,'2026-06-16 20:42:32',NULL);
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
INSERT INTO "medications" VALUES(1,5,'Lisinopril','10mg','Once daily','2026-03-18 23:42:32.000837','2027-06-16 23:42:32.000837',1,0,'Blood Pressure','Take with food','2026-06-16 20:42:32',NULL);
INSERT INTO "medications" VALUES(2,5,'Metformin','500mg','Twice daily','2026-04-17 23:42:32.000837','2026-12-13 23:42:32.000837',1,0,'Diabetes','Take with meals','2026-06-16 20:42:32',NULL);
INSERT INTO "medications" VALUES(3,5,'Aspirin','81mg','Once daily','2026-02-16 23:42:32.000837',NULL,1,0,'Cardiovascular','Low dose for heart health','2026-06-16 20:42:32',NULL);
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
INSERT INTO "messages" VALUES(1,5,'Dr. Sarah Johnson','Your lab results are ready for review.','notification',0,'normal','2026-06-16 20:42:32');
INSERT INTO "messages" VALUES(2,5,'Pharmacy','Your prescription for Lisinopril is ready for pickup.','reminder',1,'normal','2026-06-16 20:42:32');
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
INSERT INTO "patient_clinical_profile" VALUES(3,4,'unknown',2019,NULL,0,NULL,0,0,0,NULL,NULL,NULL,NULL,NULL,'2026-06-16 17:45:14',NULL);
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
INSERT INTO "patient_measurements" VALUES(5,4,'manual_partial',NULL,0,1,28,70.0,170.0,80.0,95.0,0,NULL,NULL,NULL,'never',NULL,NULL,'none',150,7.0,4.0,NULL,3,NULL,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-16 17:54:08','2026-06-16 17:54:08');
INSERT INTO "patient_measurements" VALUES(6,5,'manual_partial',NULL,0,1,26,70.0,170.0,80.0,95.0,0,NULL,NULL,NULL,'never',NULL,NULL,'none',150,7.0,4.0,NULL,3,NULL,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-16 20:54:08','2026-06-16 20:54:08');
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
INSERT INTO "patients" VALUES(4,4,'1997-09-28 00:00:00.000000',28,'female','hispanic',4,'employed_full',0,'xnhuayhcuas','single','dalia','01000449704','en',1,0,0,'2026-06-16 17:43:55','2026-06-16 17:53:36');
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
INSERT INTO "predictions" VALUES(1,4,5,0,16.56,0,0.058,0.0464,0.053,'{"bmi": {"weight": 0.28, "imputed": false}, "systolic_bp": {"weight": 0.18, "imputed": true}, "family_history_diabetes": {"weight": 0.22, "imputed": false}, "physical_activity_minutes": {"weight": 0.14, "imputed": false}, "cholesterol_total": {"weight": 0.12, "imputed": true}}',0.55,0.52,'onboarding','heuristic_staging_v1_partial','2026-06-16 17:54:08',1,18,25,'["systolic_bp", "diastolic_bp", "heart_rate", "cholesterol_total", "ldl_cholesterol", "hdl_cholesterol", "triglycerides"]');
INSERT INTO "predictions" VALUES(2,5,6,0,16.56,0,0.058,0.0464,0.053,'{"bmi": {"weight": 0.28, "imputed": false}, "systolic_bp": {"weight": 0.18, "imputed": true}, "family_history_diabetes": {"weight": 0.22, "imputed": false}, "physical_activity_minutes": {"weight": 0.14, "imputed": false}, "cholesterol_total": {"weight": 0.12, "imputed": true}}',0.55,0.52,'onboarding','heuristic_staging_v1_partial','2026-06-16 20:54:08',1,18,25,'["systolic_bp", "diastolic_bp", "heart_rate", "cholesterol_total", "ldl_cholesterol", "hdl_cholesterol", "triglycerides"]');
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
INSERT INTO "users" VALUES(4,'daliasaudi2@gmail.com','$2b$12$y/nin341tyxXzfYmGZcZfOVgf0escl3IsBNkVinznnRkXwGyCA1GO','huncjnas',NULL,NULL,'0121886744255','1997-09-28 00:00:00.000000',NULL,NULL,NULL,NULL,NULL,'female',28,'hispanic','Master''s Degree','employed_full','Under $25k',1,0,NULL,NULL,NULL,1,'2026-06-16 17:23:05','2026-06-16 17:54:08','Software Engineering',1,'xnhuayhcuas','single','dalia','01000449704','en',1);
INSERT INTO "users" VALUES(5,'test@example.com','$2b$12$rnj1vIt4CsMsLQdqpLF8/.k7W618gEAth6Pj58YwLarq.qJ9A5mVG','John Doe',NULL,NULL,'+1234567890','2000-05-05 00:00:00.000000','O+',NULL,NULL,'Jane Doe - +1234567891',NULL,'female',NULL,'white','Bachelor''s Degree','employed_full','Under $25k',1,0,NULL,NULL,NULL,1,'2026-06-16 20:42:31','2026-06-16 20:54:08','Mechanical Engineering',1,'egyptian','single',NULL,NULL,'en',0);
CREATE UNIQUE INDEX ix_users_google_id ON users (google_id);
CREATE INDEX ix_users_id ON users (id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_appointments_id ON appointments (id);
CREATE INDEX ix_medical_records_id ON medical_records (id);
CREATE INDEX ix_medications_id ON medications (id);
CREATE INDEX ix_messages_id ON messages (id);
CREATE INDEX ix_chat_sessions_id ON chat_sessions (id);
CREATE UNIQUE INDEX ix_chat_sessions_session_id ON chat_sessions (session_id);
CREATE INDEX ix_chat_messages_id ON chat_messages (id);
CREATE INDEX ix_lab_uploads_id ON lab_uploads (id);
CREATE INDEX ix_lab_uploads_patient_id ON lab_uploads (patient_id);
CREATE INDEX ix_predictions_id ON predictions (id);
CREATE INDEX ix_predictions_patient_id ON predictions (patient_id);
CREATE INDEX ix_app_notifications_patient_id ON app_notifications (patient_id);
CREATE INDEX ix_app_notifications_id ON app_notifications (id);
CREATE INDEX idx_patients_user_id ON patients (user_id);
CREATE INDEX idx_clinical_profile_patient ON patient_clinical_profile (patient_id);
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
CREATE INDEX idx_measurements_patient ON patient_measurements (patient_id, created_at DESC);
CREATE INDEX idx_measurements_current ON patient_measurements (patient_id, is_current);
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('patient_clinical_profile',3);
INSERT INTO "sqlite_sequence" VALUES('patient_measurements',6);
COMMIT;
