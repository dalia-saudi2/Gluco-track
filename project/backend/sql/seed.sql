-- Optional seed data for local development
-- Password for all users: Test1234! (bcrypt hash below)

INSERT INTO users (id, full_name, email, phone, password_hash, role, language, email_verified_at)
VALUES
    ('11111111-1111-1111-1111-111111111101', 'Sarah Patient', 'patient@example.com', '+15550000001',
     '$2b$12$8lZXb7dQxi29df6qxweYJ.XoJup5MQQa3JpR5UBSG6TNkG4wn6C3S', 'patient', 'en', now()),
    ('11111111-1111-1111-1111-111111111102', 'Dr. Ahmed Hassan', 'doctor@example.com', '+15550000002',
     '$2b$12$8lZXb7dQxi29df6qxweYJ.XoJup5MQQa3JpR5UBSG6TNkG4wn6C3S', 'doctor', 'en', now()),
    ('11111111-1111-1111-1111-111111111103', 'Admin User', 'admin@example.com', NULL,
     '$2b$12$8lZXb7dQxi29df6qxweYJ.XoJup5MQQa3JpR5UBSG6TNkG4wn6C3S', 'admin', 'en', now());

INSERT INTO patients (id, user_id, date_of_birth, age, gender, ethnicity, education_level, employment_status, income_level, blood_type, onboarding_complete, profile_completed_at)
VALUES (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    '1988-03-15', 37, 'female', 'asian', 3, 'employed_full', 2, 'A+', TRUE, now()
);

INSERT INTO doctors (id, user_id, specialty, license_number, clinic_name, clinic_city, years_experience, accepting_patients, verified_at)
VALUES (
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111102',
    'Endocrinology', 'MD-2024-001', 'City Diabetes Clinic', 'Amman', 12, TRUE, now()
);

INSERT INTO doctor_availability (doctor_id, day_of_week, slot_start, slot_end)
VALUES
    ('33333333-3333-3333-3333-333333333301', 'monday', '09:00', '09:30'),
    ('33333333-3333-3333-3333-333333333301', 'monday', '09:30', '10:00');

INSERT INTO notification_preferences (user_id)
SELECT id FROM users;

INSERT INTO model_versions (id, model_name, version_tag, task_type, algorithm, file_url, feature_names, feature_dtypes, is_active, deployed_at, deployed_by_user_id)
VALUES
    ('44444444-4444-4444-4444-444444444401', 'xgboost_diabetes_staging', 'v1.0.0', 'diabetes_staging', 'XGBoost',
     's3://models/staging_v1.pkl', '["bmi","age","systolic_bp"]'::jsonb, '{"bmi":"float"}'::jsonb, TRUE, now(),
     '11111111-1111-1111-1111-111111111103'),
    ('44444444-4444-4444-4444-444444444402', 'xgboost_complications', 'v1.0.0', 'complications', 'XGBoost',
     's3://models/complications_v1.pkl', '["bmi","age"]'::jsonb, '{"bmi":"float"}'::jsonb, TRUE, now(),
     '11111111-1111-1111-1111-111111111103');

INSERT INTO patient_measurements (
    id, patient_id, age, bmi, waist_to_hip_ratio, systolic_bp, diastolic_bp, heart_rate,
    smoking_status, alcohol_group, physical_activity_minutes, sleep_hours_per_day,
    screen_time_hours_per_day, family_history_diabetes, hypertension_history, cardiovascular_history,
    measured_at
) VALUES (
    '55555555-5555-5555-5555-555555555501',
    '22222222-2222-2222-2222-222222222201',
    37, 26.50, 0.820, 128, 82, 72,
    'never', 'light', 150, 7.0, 4.5,
    TRUE, FALSE, FALSE, now()
);

INSERT INTO predictions (
    id, patient_id, measurement_id,
    staging_model_version_id, complications_model_version_id,
    diabetes_stage, diabetes_risk_score, diagnosed_diabetes,
    retinopathy_risk, nephropathy_risk, neuropathy_risk, triggered_by
) VALUES (
    '66666666-6666-6666-6666-666666666601',
    '22222222-2222-2222-2222-222222222201',
    '55555555-5555-5555-5555-555555555501',
    '44444444-4444-4444-4444-444444444401',
    '44444444-4444-4444-4444-444444444402',
    1, 42.50, FALSE, 0.1200, 0.0800, 0.1500, 'onboarding'
);

INSERT INTO health_tips (title, body, category, applicable_stages, language, is_published, published_at)
VALUES (
    'Monitor your blood sugar regularly',
    'Regular monitoring helps detect pre-diabetic patterns early.',
    'monitoring', ARRAY[0, 1]::SMALLINT[], 'en', TRUE, now()
);
