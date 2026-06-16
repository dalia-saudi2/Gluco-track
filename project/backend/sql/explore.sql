-- List feature-group tables
SELECT name AS table_name
FROM sqlite_master
WHERE type = 'table'
  AND name IN ('patients', 'patient_clinical_profile', 'patient_measurements')
ORDER BY name;

-- Staging model features (25-feature set)
-- SELECT * FROM v_staging_model_features;

-- Complications model features
-- SELECT * FROM v_complications_model_features;

-- Full patient row with latest measurement
-- SELECT p.*, m.bmi, m.hba1c, m.systolic_bp
-- FROM patients p
-- LEFT JOIN patient_measurements m ON m.patient_id = p.id AND m.is_current = 1;
