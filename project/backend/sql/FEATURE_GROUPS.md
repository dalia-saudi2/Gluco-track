# Feature Groups 1–5 — Database Schema

Five collection groups based on **when and how** the patient provides data.

| Group | When | Primary table |
|-------|------|----------------|
| **1** Demographics & identity | Registration / onboarding once | `patients` (+ `users` for auth) |
| **2** Diabetes clinical facts | Onboarding if diabetic path | `patient_clinical_profile` |
| **3** Lifestyle | Health form, updatable | `patient_measurements` |
| **4** Home measurements | Health form (scale, tape, BP cuff) | `patient_measurements` |
| **5** Lab results | OCR upload or manual / skip (Flow B) | `patient_measurements` + `lab_uploads` |

## Apply schema

### Dev SQLite (current app)

```powershell
cd project\backend
py -3.12 setup_database.py
# or feature tables only:
py -3.12 build_patient_features_db.py --seed
```

Schema files:
- `sql/patient_features.sqlite.sql` — 3-table DDL (patients, clinical_profile, measurements)
- `sql/patient_features_views.sql` — `v_staging_model_features`, `v_complications_model_features`

### PostgreSQL (production target)

```powershell
psql -U healthcare -d healthcare -f sql\schema.sql
psql -U healthcare -d healthcare -f sql\migrations\001_feature_groups.sql
```

## ERD diagram

Open in browser:

- `project/backend/sql/ERD_feature_groups.html`
- `E:\Grad\diagrams\ERD.file.html` (copy of same diagram)

## Derived fields (computed server-side in SQLite, GENERATED in PostgreSQL)

| Field | Formula |
|-------|---------|
| `activity_level` | 0→sedentary, 1–89→light, 90–209→moderate, ≥210→active |
| `bmi` | weight_kg / (height_m²) |
| `bmi_group` | underweight / normal / overweight / obese from BMI |
| `waist_to_hip_ratio` | waist_cm / hip_cm |
| `abdominal_obesity` | WHR > 0.90 (male) or > 0.85 (female) |
| `years_since_diagnosis` | current_year − year_of_diagnosis |

See `feature_derivations.py` and `feature_constants.py`.

## Model inputs vs EMR-only

- **Staging model (25 features):** G1 + G3 + G4 + G5 lipids/BP (partial allowed via Flow B)
- **Complications model:** G2 + HbA1c + hematocrit + insulin/SGLT2i flags
- **EMR-only:** nationality, caregiver, exam dates, optional labs (creatinine, eGFR, etc.)
