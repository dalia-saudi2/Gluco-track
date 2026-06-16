# PostgreSQL Database Setup

Full 20-table schema for the healthcare platform.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Complete DDL — enums, tables, indexes, triggers, views, RLS |
| `patient_features.sqlite.sql` | Groups 1–5 feature tables (SQLite dev) |
| `healthcare.sqlite.schema.sql` | Live SQLite schema export (auto-generated) |
| `healthcare.sqlite.snapshot.sql` | Full SQLite backup — schema + data (auto-generated) |
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
py -3.12 setup_database.py          # create tables + migrations
py -3.12 setup_database.py --seed   # optional sample data
py -3.12 export_database.py         # save live DB to sql/*.sql files
```

Restore from snapshot:

```powershell
py -3.12 setup_database.py --fresh
Get-Content sql\healthcare.sqlite.snapshot.sql | sqlite3 healthcare.db
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
