# One-time setup: two isolated Python environments (fixes protobuf conflict on Windows).
# Run from project/backend in PowerShell:
#   .\setup_venvs.ps1

$ErrorActionPreference = "Stop"
$Backend = $PSScriptRoot

Write-Host "Creating main API venv..." -ForegroundColor Cyan
python -m venv "$Backend\.venv"
& "$Backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
& "$Backend\.venv\Scripts\python.exe" -m pip install -r "$Backend\requirements.txt"

$Paddle = Join-Path (Split-Path $Backend -Parent) "paddle_ocr_backend"
Write-Host "Creating Paddle OCR venv in paddle_ocr_backend..." -ForegroundColor Cyan
python -m venv "$Paddle\.venv-paddle"
& "$Paddle\.venv-paddle\Scripts\python.exe" -m pip install --upgrade pip
& "$Paddle\.venv-paddle\Scripts\python.exe" -m pip install -r "$Paddle\requirements-paddle.txt"

Write-Host ""
Write-Host "Done. Use these to start services:" -ForegroundColor Green
Write-Host "  Paddle OCR : cd ..\paddle_ocr_backend && .\.venv-paddle\Scripts\python.exe run_paddle_ocr.py"
Write-Host "  Main API   : .\.venv\Scripts\python.exe run.py"
Write-Host "  Database   : .\.venv\Scripts\python.exe setup_database.py"
