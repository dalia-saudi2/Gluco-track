#!/usr/bin/env python3
"""Redirect — Paddle OCR moved to project/paddle_ocr_backend/."""

import subprocess
import sys
from pathlib import Path

PADDLE_DIR = Path(__file__).resolve().parent.parent / "paddle_ocr_backend"
VENV_PYTHON = PADDLE_DIR / ".venv-paddle" / "Scripts" / "python.exe"
LEGACY_VENV = Path(__file__).resolve().parent / ".venv-paddle" / "Scripts" / "python.exe"

if __name__ == "__main__":
    python_exe = VENV_PYTHON if VENV_PYTHON.is_file() else LEGACY_VENV
    if not python_exe.is_file():
        print("Paddle OCR venv not found.")
        print("Run: cd project\\paddle_ocr_backend && .\\setup_venv.ps1")
        sys.exit(1)
    raise SystemExit(
        subprocess.call([str(python_exe), "run_paddle_ocr.py"], cwd=str(PADDLE_DIR))
    )
