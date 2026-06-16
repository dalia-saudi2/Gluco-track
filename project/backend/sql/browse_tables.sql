-- Open all application tables (run in SQLTools → Healthcare (SQLite))

SELECT 'users' AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'patients', COUNT(*) FROM patients
UNION ALL SELECT 'patient_clinical_profile', COUNT(*) FROM patient_clinical_profile
UNION ALL SELECT 'patient_measurements', COUNT(*) FROM patient_measurements
UNION ALL SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL SELECT 'lab_uploads', COUNT(*) FROM lab_uploads
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'medical_records', COUNT(*) FROM medical_records
UNION ALL SELECT 'medications', COUNT(*) FROM medications
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL SELECT 'app_notifications', COUNT(*) FROM app_notifications
ORDER BY table_name;

-- Browse one table (uncomment):
-- SELECT * FROM users;
-- SELECT * FROM patients;
-- SELECT * FROM patient_clinical_profile;
-- SELECT * FROM patient_measurements;
-- SELECT * FROM predictions;
