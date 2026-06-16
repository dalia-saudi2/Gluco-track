# PostgreSQL Database Setup

Full 20-table schema for the healthcare platform.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Complete DDL — enums, tables, indexes, triggers, views, RLS |
| `migrations/001_feature_groups.sql` | Groups 1–5 columns + `patient_clinical_profile` (PostgreSQL patch) |
| `ERD_feature_groups.html` | Interactive ERD diagram (5 collection groups) |
| `FEATURE_GROUPS.md` | Feature-to-table mapping reference |
| `seed.sql` | Optional sample data for local testing |

## Connection (after setup)

```
Host:     localhost
Port:     5432
Database: healthcare
User:     healthcare
Password: healthcare_dev
```

Connection string for `.env`:

```env
DATABASE_URL=postgresql://healthcare:healthcare_dev@localhost:5432/healthcare
```

## Dev SQLite (Expo app default)

```powershell
cd c:\Users\dalia\final_patient\project\backend
python migrate_feature_groups.py
```

## Option A — Docker (recommended)

```powershell
cd c:\Users\dalia\final_patient
docker compose up -d
```

Schema runs automatically on first container start via `docker-entrypoint-initdb.d`.

Verify:

```powershell
docker exec -it healthcare_postgres psql -U healthcare -d healthcare -c "\dt"
```

## Option B — Local PostgreSQL

1. Install [PostgreSQL 16](https://www.postgresql.org/download/windows/)
2. Create database and user:

```sql
CREATE USER healthcare WITH PASSWORD 'healthcare_dev';
CREATE DATABASE healthcare OWNER healthcare;
```

3. Apply schema:

```powershell
psql -U healthcare -d healthcare -f schema.sql
```

## Option C — PowerShell setup script

```powershell
cd c:\Users\dalia\final_patient\project\backend\sql
.\setup_postgres.ps1
```

## Inspect schema in psql

```powershell
psql -U healthcare -d healthcare
```

```sql
\dt                          -- list tables
\d+ users                    -- describe table
\dT+                         -- list enum types
SELECT * FROM current_predictions;
```

## Views

- `current_predictions` — latest prediction per patient
- `current_patient_measurements` — rows where `is_current = TRUE`
