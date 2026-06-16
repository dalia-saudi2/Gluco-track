-- =============================================================================
-- Feature Groups 1–5 — PostgreSQL migration
-- Run after schema.sql:
--   psql -U healthcare -d healthcare -f migrations/001_feature_groups.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- New ENUM types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'divorced', 'widowed', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE diabetes_type AS ENUM ('type1', 'type2', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE insulin_regimen_type AS ENUM ('basal', 'basal_bolus', 'pump');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE diet_quality_type AS ENUM ('poor', 'fair', 'good', 'excellent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE measurement_source_type AS ENUM ('manual', 'manual_partial', 'ocr', 'device_sync');
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        ALTER TYPE measurement_source_type ADD VALUE IF NOT EXISTS 'manual_partial';
END $$;

-- ---------------------------------------------------------------------------
-- GROUP 1 — patients (demographics + EMR identity)
-- ---------------------------------------------------------------------------

ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
    ADD COLUMN IF NOT EXISTS marital_status marital_status_type,
    ADD COLUMN IF NOT EXISTS caregiver_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS caregiver_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS preferred_language app_language DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS education_major VARCHAR(150),
    ADD COLUMN IF NOT EXISTS lab_upload_pending BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_age_range;
ALTER TABLE patients ADD CONSTRAINT patients_age_range CHECK (age BETWEEN 20 AND 79);

COMMENT ON COLUMN patients.age IS 'Model snapshot; recalculate from date_of_birth annually';
COMMENT ON COLUMN patients.date_of_birth IS 'Source of truth for age; age column is model snapshot';

-- ---------------------------------------------------------------------------
-- GROUP 2 — patient_clinical_profile (diabetes-specific, 1:1)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS patient_clinical_profile (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id                  UUID NOT NULL UNIQUE REFERENCES patients (id) ON DELETE CASCADE,
    diabetes_type               diabetes_type,
    year_of_diagnosis           SMALLINT CHECK (year_of_diagnosis IS NULL OR year_of_diagnosis BETWEEN 1950 AND 2100),
    years_since_diagnosis       SMALLINT GENERATED ALWAYS AS (
        CASE
            WHEN year_of_diagnosis IS NULL THEN NULL
            ELSE EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT - year_of_diagnosis
        END
    ) STORED,
    on_insulin                  BOOLEAN,
    insulin_regimen             insulin_regimen_type,
    on_sglt2i                   BOOLEAN,
    on_metformin                BOOLEAN,
    on_statin                   BOOLEAN,
    on_antihypertensive         BOOLEAN,
    medication_list             TEXT,
    last_eye_exam_date          DATE,
    last_kidney_function_date   DATE,
    last_foot_exam_date         DATE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_profile_patient ON patient_clinical_profile (patient_id);

-- ---------------------------------------------------------------------------
-- GROUP 3–5 — patient_measurements extensions
-- ---------------------------------------------------------------------------

ALTER TABLE patient_measurements
    ADD COLUMN IF NOT EXISTS lab_data_complete BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS years_since_quit SMALLINT,
    ADD COLUMN IF NOT EXISTS cigarettes_per_day SMALLINT,
    ADD COLUMN IF NOT EXISTS diet_quality diet_quality_type,
    ADD COLUMN IF NOT EXISTS stress_level SMALLINT CHECK (stress_level IS NULL OR stress_level BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS steps_per_day INTEGER,
    ADD COLUMN IF NOT EXISTS hba1c DECIMAL(4, 2) CHECK (hba1c IS NULL OR hba1c BETWEEN 4.0 AND 14.0),
    ADD COLUMN IF NOT EXISTS hematocrit DECIMAL(4, 1) CHECK (hematocrit IS NULL OR hematocrit BETWEEN 20 AND 60),
    ADD COLUMN IF NOT EXISTS fasting_glucose DECIMAL(5, 1),
    ADD COLUMN IF NOT EXISTS creatinine DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS egfr DECIMAL(5, 1),
    ADD COLUMN IF NOT EXISTS urine_acr DECIMAL(7, 2),
    ADD COLUMN IF NOT EXISTS alt DECIMAL(6, 2),
    ADD COLUMN IF NOT EXISTS tsh DECIMAL(6, 3);

-- Allow partial / optional vitals (Flow B)
ALTER TABLE patient_measurements ALTER COLUMN systolic_bp DROP NOT NULL;
ALTER TABLE patient_measurements ALTER COLUMN diastolic_bp DROP NOT NULL;
ALTER TABLE patient_measurements ALTER COLUMN heart_rate DROP NOT NULL;

-- bmi_group generated column (requires bmi already stored)
DO $$ BEGIN
    ALTER TABLE patient_measurements
        ADD COLUMN bmi_group bmi_group_type GENERATED ALWAYS AS (
            CASE
                WHEN bmi < 18.5 THEN 'underweight'::bmi_group_type
                WHEN bmi < 25 THEN 'normal'::bmi_group_type
                WHEN bmi < 30 THEN 'overweight'::bmi_group_type
                ELSE 'obese'::bmi_group_type
            END
        ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

COMMENT ON TABLE patient_clinical_profile IS 'Group 2 — diabetes-specific clinical facts (complications model)';
COMMENT ON COLUMN patient_measurements.hba1c IS 'Complications model only — excluded from staging model';
COMMENT ON COLUMN patient_measurements.hematocrit IS 'Complications model — CBC';
COMMENT ON COLUMN patient_measurements.cholesterol_total IS 'EMR enrichment — optional in staging';
