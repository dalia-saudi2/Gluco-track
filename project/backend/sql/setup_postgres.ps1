#Requires -Version 5.1
<#
.SYNOPSIS
  Apply healthcare PostgreSQL schema locally.

.DESCRIPTION
  Tries Docker first, then local psql. Opens schema.sql in VS Code/Cursor when done.
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SchemaFile = Join-Path $Root "schema.sql"
$SeedFile = Join-Path $Root "seed.sql"
$ComposeRoot = Resolve-Path (Join-Path $Root "..\..\..")

$DbUser = "healthcare"
$DbPass = "healthcare_dev"
$DbName = "healthcare"
$DbHost = "localhost"
$DbPort = "5432"

Write-Host "Healthcare PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "Schema: $SchemaFile" -ForegroundColor Gray

function Test-Docker {
    try {
        docker info 2>$null | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-Psql {
    return [bool](Get-Command psql -ErrorAction SilentlyContinue)
}

function Invoke-PsqlFile {
    param([string]$File, [switch]$UseDocker)
    if ($UseDocker) {
        Get-Content $File -Raw | docker exec -i healthcare_postgres psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1
    } else {
        $env:PGPASSWORD = $DbPass
        & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f $File
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Show-Tables {
    param([switch]$UseDocker)
    $query = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1;"
    if ($UseDocker) {
        docker exec healthcare_postgres psql -U $DbUser -d $DbName -c $query
    } else {
        $env:PGPASSWORD = $DbPass
        & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -c $query
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# --- Docker path ---
if (Test-Docker) {
    Write-Host "`nDocker found. Starting PostgreSQL container..." -ForegroundColor Green
    Push-Location $ComposeRoot
    docker compose up -d
    Pop-Location

    Write-Host "Waiting for database..." -ForegroundColor Yellow
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        $status = docker inspect -f "{{.State.Health.Status}}" healthcare_postgres 2>$null
        if ($status -eq "healthy") { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Host "Container started; schema may still be initializing on first run." -ForegroundColor Yellow
    }

    Write-Host "`nTables in database:" -ForegroundColor Cyan
    Show-Tables -UseDocker

    Write-Host "`nApplying seed data (optional)..." -ForegroundColor Yellow
    try {
        Invoke-PsqlFile -File $SeedFile -UseDocker
        Write-Host "Seed data applied." -ForegroundColor Green
    } catch {
        Write-Host "Seed skipped or failed (schema may already have data): $_" -ForegroundColor Yellow
    }

    Write-Host "`nConnection string:" -ForegroundColor Cyan
    Write-Host "postgresql://${DbUser}:${DbPass}@${DbHost}:${DbPort}/${DbName}"
}
elseif (Test-Psql) {
    Write-Host "`npsql found. Applying schema..." -ForegroundColor Green
    Invoke-PsqlFile -File $SchemaFile
    try { Invoke-PsqlFile -File $SeedFile } catch { Write-Host "Seed skipped: $_" -ForegroundColor Yellow }
    Show-Tables
    Write-Host "`nConnection string:" -ForegroundColor Cyan
    Write-Host "postgresql://${DbUser}:${DbPass}@${DbHost}:${DbPort}/${DbName}"
}
else {
    Write-Host "`nNeither Docker nor psql is installed." -ForegroundColor Red
    Write-Host @"

To run the database:

  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
     Then re-run:  .\setup_postgres.ps1

  OR

  2. Install PostgreSQL 16: https://www.postgresql.org/download/windows/
     Create user/db, then:
       psql -U postgres -c "CREATE USER healthcare WITH PASSWORD 'healthcare_dev';"
       psql -U postgres -c "CREATE DATABASE healthcare OWNER healthcare;"
       psql -U healthcare -d healthcare -f schema.sql

The SQL schema file is ready at:
  $SchemaFile
"@ -ForegroundColor Yellow
}

# Open schema.sql in editor
foreach ($editor in @("cursor", "code")) {
    if (Get-Command $editor -ErrorAction SilentlyContinue) {
        & $editor $SchemaFile
        Write-Host "`nOpened schema.sql in $editor" -ForegroundColor Green
        break
    }
}

Write-Host "`nDone." -ForegroundColor Cyan
