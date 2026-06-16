-- =============================================================================
-- Healthcare Platform — PostgreSQL Schema
-- 20 tables · 5 domains · UUID PKs · immutable measurements & predictions
-- Run: psql -U healthcare -d healthcare -f schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE app_language AS ENUM ('en', 'ar');

CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE ethnicity_type AS ENUM ('white', 'black', 'hispanic', 'asian', 'other');
CREATE TYPE employment_status_type AS ENUM ('employed_full', 'employed_part', 'unemployed', 'retired');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE onboarding_lab_source_type AS ENUM ('ocr_upload', 'manual_entry');

CREATE TYPE measurement_source_type AS ENUM ('manual', 'ocr', 'device_sync');
CREATE TYPE bmi_group_type AS ENUM ('underweight', 'normal', 'overweight', 'obese');
CREATE TYPE smoking_status_type AS ENUM ('never', 'former', 'current');
CREATE TYPE alcohol_group_type AS ENUM ('none', 'light', 'moderate', 'heavy');
CREATE TYPE activity_level_type AS ENUM ('sedentary', 'light', 'moderate', 'active');

CREATE TYPE lab_file_type AS ENUM ('pdf', 'jpeg', 'png');
CREATE TYPE ocr_status_type AS ENUM ('pending', 'processing', 'success', 'partial', 'failed');

CREATE TYPE model_task_type AS ENUM ('diabetes_staging', 'risk_score', 'complications');
CREATE TYPE prediction_trigger_type AS ENUM ('onboarding', 'data_update', 'manual', 'scheduled');
CREATE TYPE alert_type AS ENUM ('stage_change', 'risk_increase', 'complication_high');

CREATE TYPE day_of_week_type AS ENUM (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);
CREATE TYPE appointment_type AS ENUM ('in_person', 'video', 'phone');
CREATE TYPE appointment_status_type AS ENUM (
    'pending', 'confirmed', 'completed', 'cancelled', 'missed', 'rescheduled'
);
CREATE TYPE cancelled_by_type AS ENUM ('patient', 'doctor', 'system');

CREATE TYPE note_author_role AS ENUM ('patient', 'doctor', 'system');
CREATE TYPE note_type AS ENUM ('clinical', 'personal', 'system', 'lab_result', 'prescription');

CREATE TYPE notification_type AS ENUM (
    'appt_reminder_24h', 'appt_reminder_1h', 'appt_missed',
    'risk_spike', 'stage_change', 'lab_reminder', 'doctor_message', 'weekly_summary'
);
CREATE TYPE notification_channel AS ENUM ('push', 'in_app', 'email', 'sms');

CREATE TYPE health_tip_category AS ENUM (
    'nutrition', 'exercise', 'sleep', 'mental_health', 'medication', 'monitoring'
);

CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'divorced', 'widowed', 'other');
CREATE TYPE diabetes_type AS ENUM ('type1', 'type2', 'unknown');
CREATE TYPE insulin_regimen_type AS ENUM ('basal', 'basal_bolus', 'pump');
CREATE TYPE diet_quality_type AS ENUM ('poor', 'fair', 'good', 'excellent');

-- ---------------------------------------------------------------------------
-- DOMAIN 1 — Identity & Auth
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(20),
    password_hash       VARCHAR(255) NOT NULL,
    role                user_role NOT NULL,
    avatar_url          VARCHAR(500),
    language            app_language NOT NULL DEFAULT 'en',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at   TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

CREATE TABLE auth_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(255) NOT NULL,
    device_info         JSONB,
    ip_address          INET,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT auth_sessions_refresh_token_hash_unique UNIQUE (refresh_token_hash)
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT password_reset_tokens_token_hash_unique UNIQUE (token_hash)
);

-- ---------------------------------------------------------------------------
-- DOMAIN 2 — Patient Profile & Demographics
-- ---------------------------------------------------------------------------

CREATE TABLE patients (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    date_of_birth           DATE,
    age                     SMALLINT NOT NULL CHECK (age BETWEEN 20 AND 79),
    gender                  gender_type NOT NULL,
    ethnicity               ethnicity_type NOT NULL,
    education_level         SMALLINT NOT NULL CHECK (education_level BETWEEN 0 AND 4),
    education_major         VARCHAR(150),
    employment_status       employment_status_type NOT NULL,
    income_level            SMALLINT NOT NULL CHECK (income_level BETWEEN 0 AND 3),
    nationality             VARCHAR(100),
    marital_status          marital_status_type,
    caregiver_name          VARCHAR(150),
    caregiver_phone         VARCHAR(30),
    preferred_language      app_language NOT NULL DEFAULT 'en',
    blood_type              blood_type,
    onboarding_complete     BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_lab_source   onboarding_lab_source_type,
    lab_upload_pending      BOOLEAN NOT NULL DEFAULT FALSE,
    is_diabetic_path        BOOLEAN,
    profile_completed_at    TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_clinical_profile (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id                  UUID NOT NULL UNIQUE REFERENCES patients (id) ON DELETE CASCADE,
    diabetes_type               diabetes_type,
    year_of_diagnosis           SMALLINT CHECK (year_of_diagnosis IS NULL OR year_of_diagnosis BETWEEN 1950 AND 2100),
    years_since_diagnosis       SMALLINT GENERATED ALWAYS AS (
        CASE WHEN year_of_diagnosis IS NULL THEN NULL
        ELSE EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT - year_of_diagnosis END
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

CREATE INDEX idx_clinical_profile_patient ON patient_clinical_profile (patient_id);

CREATE TABLE lab_uploads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id              UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    file_url                VARCHAR(500) NOT NULL,
    file_type               lab_file_type NOT NULL,
    file_size_kb            INT,
    ocr_status              ocr_status_type NOT NULL DEFAULT 'pending',
    ocr_raw_output          JSONB,
    ocr_extracted_values    JSONB,
    ocr_confidence_score    DECIMAL(4, 3) CHECK (
        ocr_confidence_score IS NULL OR (ocr_confidence_score >= 0 AND ocr_confidence_score <= 1)
    ),
    manually_corrected      BOOLEAN NOT NULL DEFAULT FALSE,
    lab_date                DATE,
    uploaded_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at            TIMESTAMPTZ
);

CREATE INDEX idx_lab_uploads_patient_uploaded ON lab_uploads (patient_id, uploaded_at DESC);

CREATE TABLE patient_measurements (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id                  UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    source                      measurement_source_type NOT NULL DEFAULT 'manual',
    source_lab_upload_id        UUID REFERENCES lab_uploads (id) ON DELETE SET NULL,
    lab_data_complete           BOOLEAN NOT NULL DEFAULT TRUE,
    age                         SMALLINT NOT NULL CHECK (age >= 0),
    bmi                         DECIMAL(5, 2) NOT NULL,
    bmi_group                   bmi_group_type GENERATED ALWAYS AS (
        CASE
            WHEN bmi < 18.5 THEN 'underweight'::bmi_group_type
            WHEN bmi < 25 THEN 'normal'::bmi_group_type
            WHEN bmi < 30 THEN 'overweight'::bmi_group_type
            ELSE 'obese'::bmi_group_type
        END
    ) STORED,
    waist_to_hip_ratio          DECIMAL(4, 3) NOT NULL,
    abdominal_obesity           BOOLEAN NOT NULL DEFAULT FALSE,
    systolic_bp                 SMALLINT CHECK (systolic_bp IS NULL OR systolic_bp BETWEEN 80 AND 200),
    diastolic_bp                SMALLINT CHECK (diastolic_bp IS NULL OR diastolic_bp BETWEEN 50 AND 130),
    heart_rate                  SMALLINT CHECK (heart_rate IS NULL OR heart_rate BETWEEN 45 AND 120),
    cholesterol_total           SMALLINT CHECK (cholesterol_total IS NULL OR cholesterol_total BETWEEN 100 AND 350),
    ldl_cholesterol             SMALLINT CHECK (ldl_cholesterol IS NULL OR ldl_cholesterol BETWEEN 50 AND 250),
    hdl_cholesterol             SMALLINT CHECK (hdl_cholesterol IS NULL OR hdl_cholesterol BETWEEN 20 AND 100),
    triglycerides               SMALLINT CHECK (triglycerides IS NULL OR triglycerides BETWEEN 50 AND 500),
    hba1c                       DECIMAL(4, 2) CHECK (hba1c IS NULL OR hba1c BETWEEN 4.0 AND 14.0),
    hematocrit                  DECIMAL(4, 1) CHECK (hematocrit IS NULL OR hematocrit BETWEEN 20 AND 60),
    fasting_glucose             DECIMAL(5, 1),
    creatinine                  DECIMAL(5, 2),
    egfr                        DECIMAL(5, 1),
    urine_acr                   DECIMAL(7, 2),
    alt                         DECIMAL(6, 2),
    tsh                         DECIMAL(6, 3),
    years_since_quit            SMALLINT,
    cigarettes_per_day          SMALLINT,
    diet_quality                diet_quality_type,
    stress_level                SMALLINT CHECK (stress_level IS NULL OR stress_level BETWEEN 1 AND 5),
    steps_per_day               INTEGER,
    smoking_status              smoking_status_type NOT NULL,
    alcohol_group               alcohol_group_type NOT NULL,
    physical_activity_minutes   SMALLINT NOT NULL CHECK (physical_activity_minutes BETWEEN 0 AND 420),
    activity_level              activity_level_type GENERATED ALWAYS AS (
        CASE
            WHEN physical_activity_minutes = 0 THEN 'sedentary'::activity_level_type
            WHEN physical_activity_minutes < 90 THEN 'light'::activity_level_type
            WHEN physical_activity_minutes < 210 THEN 'moderate'::activity_level_type
            ELSE 'active'::activity_level_type
        END
    ) STORED,
    sleep_hours_per_day         DECIMAL(3, 1) NOT NULL CHECK (sleep_hours_per_day BETWEEN 4.0 AND 10.0),
    screen_time_hours_per_day   DECIMAL(3, 1) NOT NULL CHECK (screen_time_hours_per_day BETWEEN 0 AND 16),
    family_history_diabetes     BOOLEAN NOT NULL,
    hypertension_history        BOOLEAN NOT NULL,
    cardiovascular_history      BOOLEAN NOT NULL,
    height_cm                   DECIMAL(5, 1),
    weight_kg                   DECIMAL(5, 2),
    waist_cm                    DECIMAL(5, 1),
    hip_cm                      DECIMAL(5, 1),
    is_current                  BOOLEAN NOT NULL DEFAULT TRUE,
    measured_at                 TIMESTAMPTZ NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_measurements_patient_created ON patient_measurements (patient_id, created_at DESC);
CREATE INDEX idx_patient_measurements_current ON patient_measurements (patient_id, is_current)
    WHERE is_current = TRUE;

-- ---------------------------------------------------------------------------
-- DOMAIN 3 — ML Predictions
-- ---------------------------------------------------------------------------

CREATE TABLE model_versions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name              VARCHAR(100) NOT NULL,
    version_tag             VARCHAR(50) NOT NULL,
    task_type               model_task_type NOT NULL,
    algorithm               VARCHAR(100),
    file_url                VARCHAR(500) NOT NULL,
    feature_names           JSONB NOT NULL,
    feature_dtypes          JSONB NOT NULL,
    accuracy                DECIMAL(5, 4),
    f1_score                DECIMAL(5, 4),
    auc_roc                 DECIMAL(5, 4),
    confusion_matrix        JSONB,
    training_dataset_size   INT,
    training_date           DATE,
    is_active               BOOLEAN NOT NULL DEFAULT FALSE,
    deployed_at             TIMESTAMPTZ,
    deployed_by_user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_model_versions_one_active_per_task
    ON model_versions (task_type) WHERE is_active = TRUE;

CREATE TABLE predictions (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id                      UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    measurement_id                  UUID NOT NULL REFERENCES patient_measurements (id) ON DELETE RESTRICT,
    staging_model_version_id        UUID NOT NULL REFERENCES model_versions (id) ON DELETE RESTRICT,
    complications_model_version_id    UUID NOT NULL REFERENCES model_versions (id) ON DELETE RESTRICT,
    diabetes_stage                  SMALLINT NOT NULL CHECK (diabetes_stage BETWEEN 0 AND 2),
    diabetes_risk_score             DECIMAL(5, 2) NOT NULL CHECK (diabetes_risk_score BETWEEN 0 AND 100),
    diagnosed_diabetes              BOOLEAN NOT NULL,
    retinopathy_risk                DECIMAL(5, 4) NOT NULL CHECK (retinopathy_risk BETWEEN 0 AND 1),
    nephropathy_risk                DECIMAL(5, 4) NOT NULL CHECK (nephropathy_risk BETWEEN 0 AND 1),
    neuropathy_risk                 DECIMAL(5, 4) NOT NULL CHECK (neuropathy_risk BETWEEN 0 AND 1),
    feature_importances             JSONB,
    staging_confidence              DECIMAL(5, 4),
    risk_score_confidence           DECIMAL(5, 4),
    triggered_by                    prediction_trigger_type NOT NULL,
    predicted_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_predictions_patient_predicted ON predictions (patient_id, predicted_at DESC);

CREATE TABLE prediction_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    prediction_id       UUID NOT NULL REFERENCES predictions (id) ON DELETE CASCADE,
    alert_type          alert_type NOT NULL,
    previous_value      DECIMAL(6, 2),
    new_value           DECIMAL(6, 2),
    delta               DECIMAL(6, 2),
    threshold_triggered DECIMAL(6, 2),
    notification_sent   BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- DOMAIN 4 — Doctor Portal & Appointments
-- ---------------------------------------------------------------------------

CREATE TABLE doctors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    specialty           VARCHAR(100) NOT NULL,
    license_number      VARCHAR(100) UNIQUE,
    clinic_name         VARCHAR(200),
    clinic_address      TEXT,
    clinic_city         VARCHAR(100),
    bio                 TEXT,
    years_experience    SMALLINT,
    languages_spoken    VARCHAR(200),
    consultation_fee    DECIMAL(8, 2),
    average_rating      DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    total_reviews       INT NOT NULL DEFAULT 0,
    accepting_patients  BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctors_specialty ON doctors (specialty);
CREATE INDEX idx_doctors_clinic_city ON doctors (clinic_city);
CREATE INDEX idx_doctors_accepting ON doctors (accepting_patients);

CREATE TABLE doctor_availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    day_of_week day_of_week_type NOT NULL,
    slot_start  TIME NOT NULL,
    slot_end    TIME NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT doctor_availability_unique_slot UNIQUE (doctor_id, day_of_week, slot_start),
    CONSTRAINT doctor_availability_slot_order CHECK (slot_end > slot_start)
);

CREATE TABLE doctor_blocked_dates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id    UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason       VARCHAR(200),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT doctor_blocked_dates_unique UNIQUE (doctor_id, blocked_date)
);

CREATE TABLE appointments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id                  UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    doctor_id                   UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    scheduled_at                TIMESTAMPTZ NOT NULL,
    duration_minutes            SMALLINT NOT NULL DEFAULT 30,
    appointment_type            appointment_type NOT NULL DEFAULT 'in_person',
    status                      appointment_status_type NOT NULL DEFAULT 'pending',
    patient_note                TEXT,
    doctor_note                 TEXT,
    cancellation_reason         TEXT,
    cancelled_by                cancelled_by_type,
    rescheduled_from_id         UUID REFERENCES appointments (id) ON DELETE SET NULL,
    reminder_24h_sent           BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_1h_sent            BOOLEAN NOT NULL DEFAULT FALSE,
    missed_alert_sent           BOOLEAN NOT NULL DEFAULT FALSE,
    prediction_id_at_booking    UUID REFERENCES predictions (id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at                TIMESTAMPTZ
);

CREATE INDEX idx_appointments_patient_scheduled ON appointments (patient_id, scheduled_at DESC);
CREATE INDEX idx_appointments_doctor_scheduled ON appointments (doctor_id, scheduled_at);
CREATE INDEX idx_appointments_status_scheduled ON appointments (status, scheduled_at);
CREATE INDEX idx_appointments_scheduled_at ON appointments (scheduled_at);

CREATE TABLE appointment_ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID NOT NULL UNIQUE REFERENCES appointments (id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    doctor_id       UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- DOMAIN 5 — Communication, EMR & Content
-- ---------------------------------------------------------------------------

CREATE TABLE emr_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id          UUID NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
    author_user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    author_role         note_author_role NOT NULL,
    appointment_id      UUID REFERENCES appointments (id) ON DELETE SET NULL,
    note_type           note_type NOT NULL,
    note_text           TEXT NOT NULL,
    visible_to_patient  BOOLEAN NOT NULL DEFAULT TRUE,
    pinned              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emr_notes_patient_created ON emr_notes (patient_id, created_at DESC);

CREATE TABLE messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL,
    sender_user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    appointment_id      UUID REFERENCES appointments (id) ON DELETE SET NULL,
    body                TEXT NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at);
CREATE INDEX idx_messages_recipient_unread ON messages (recipient_user_id, is_read);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    payload         JSONB,
    channel         notification_channel NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at         TIMESTAMPTZ,
    failed          BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason  VARCHAR(300)
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_user_sent ON notifications (user_id, sent_at DESC);

CREATE TABLE notification_preferences (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    appt_reminder_24h           BOOLEAN NOT NULL DEFAULT TRUE,
    appt_reminder_1h            BOOLEAN NOT NULL DEFAULT TRUE,
    appt_missed_alert           BOOLEAN NOT NULL DEFAULT TRUE,
    risk_spike_alert            BOOLEAN NOT NULL DEFAULT TRUE,
    risk_spike_threshold        SMALLINT NOT NULL DEFAULT 10,
    stage_change_alert          BOOLEAN NOT NULL DEFAULT TRUE,
    lab_upload_reminder         BOOLEAN NOT NULL DEFAULT TRUE,
    lab_reminder_interval_days  SMALLINT NOT NULL DEFAULT 30,
    doctor_message_alert        BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_summary              BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled                BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled               BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE health_tips (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(300) NOT NULL,
    body                    TEXT NOT NULL,
    image_url               VARCHAR(500),
    category                health_tip_category NOT NULL,
    applicable_stages       SMALLINT[] NOT NULL,
    applicable_risk_factors VARCHAR(100)[],
    language                app_language NOT NULL DEFAULT 'en',
    read_time_minutes       SMALLINT NOT NULL DEFAULT 3,
    source_url              VARCHAR(500),
    is_published            BOOLEAN NOT NULL DEFAULT FALSE,
    published_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT health_tips_stages_valid CHECK (
        applicable_stages <@ ARRAY[0::SMALLINT, 1::SMALLINT, 2::SMALLINT]
    )
);

CREATE INDEX idx_health_tips_stages_published ON health_tips (is_published)
    WHERE is_published = TRUE;

CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
    action       VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id    UUID,
    old_value    JSONB,
    new_value    JSONB,
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_table, target_id);

-- ---------------------------------------------------------------------------
-- TRIGGERS — updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_emr_notes_updated_at
    BEFORE UPDATE ON emr_notes
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER — patient_measurements.is_current (only latest row TRUE)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION patient_measurements_set_current()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE patient_measurements
    SET is_current = FALSE
    WHERE patient_id = NEW.patient_id
      AND id <> NEW.id
      AND is_current = TRUE;

    NEW.is_current := TRUE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patient_measurements_set_current
    BEFORE INSERT ON patient_measurements
    FOR EACH ROW EXECUTE PROCEDURE patient_measurements_set_current();

-- ---------------------------------------------------------------------------
-- TRIGGER — abdominal_obesity from WHR + patient gender
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION patient_measurements_set_abdominal_obesity()
RETURNS TRIGGER AS $$
DECLARE
    patient_gender gender_type;
BEGIN
    SELECT gender INTO patient_gender FROM patients WHERE id = NEW.patient_id;

    IF patient_gender = 'female' THEN
        NEW.abdominal_obesity := NEW.waist_to_hip_ratio > 0.85;
    ELSE
        NEW.abdominal_obesity := NEW.waist_to_hip_ratio > 0.90;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patient_measurements_abdominal_obesity
    BEFORE INSERT ON patient_measurements
    FOR EACH ROW EXECUTE PROCEDURE patient_measurements_set_abdominal_obesity();

-- ---------------------------------------------------------------------------
-- TRIGGER — doctors.average_rating & total_reviews
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION doctors_refresh_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_doctor_id UUID;
BEGIN
    target_doctor_id := COALESCE(NEW.doctor_id, OLD.doctor_id);

    UPDATE doctors
    SET
        average_rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM appointment_ratings
            WHERE doctor_id = target_doctor_id
        ), 0.00),
        total_reviews = (
            SELECT COUNT(*)::INT
            FROM appointment_ratings
            WHERE doctor_id = target_doctor_id
        )
    WHERE id = target_doctor_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_ratings_stats
    AFTER INSERT OR UPDATE OR DELETE ON appointment_ratings
    FOR EACH ROW EXECUTE PROCEDURE doctors_refresh_rating_stats();

-- ---------------------------------------------------------------------------
-- ROW-LEVEL SECURITY — audit_logs append-only
-- ---------------------------------------------------------------------------

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (TRUE);

CREATE POLICY audit_logs_insert_only ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY audit_logs_no_update ON audit_logs
    FOR UPDATE USING (FALSE);

CREATE POLICY audit_logs_no_delete ON audit_logs
    FOR DELETE USING (FALSE);

-- ---------------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW current_predictions AS
SELECT DISTINCT ON (p.patient_id)
    p.*
FROM predictions p
ORDER BY p.patient_id, p.predicted_at DESC;

CREATE OR REPLACE VIEW current_patient_measurements AS
SELECT pm.*
FROM patient_measurements pm
WHERE pm.is_current = TRUE;

-- Schema applied successfully (20 tables, enums, triggers, views, RLS)
