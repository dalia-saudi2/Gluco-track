"""OCR routes for the main API (proxies Paddle microservice for the mobile app)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth import get_current_active_user
from models import User
from ocr_service import paddle_ocr_reachable
from paddle_ocr_service import PaddleOCRService

router = APIRouter(tags=["ocr"])


def _confidence_from_result(result: dict) -> float:
    raw = result.get("confidence")
    if isinstance(raw, (int, float)):
        return float(raw) if raw <= 1 else float(raw) / 100.0
    return 0.88 if result.get("ocr_lines") else 0.0


def _structured_for_ui(result: dict) -> Dict[str, Any]:
    structured: Dict[str, Any] = {}
    external = PaddleOCRService.build_external_structured(result)
    for name, row in external.items():
        structured[name] = row
    lab_fields = result.get("lab_fields") or {}
    for key, cell in lab_fields.items():
        if isinstance(cell, dict) and cell.get("value") is not None:
            structured[key] = cell["value"]
    return structured


@router.get("/health/ocr")
async def health_ocr():
    ok = paddle_ocr_reachable()
    return {
        "ok": ok,
        "message": "Paddle OCR is reachable" if ok else "Start Paddle OCR: cd project/paddle_ocr_backend && python run_paddle_ocr.py",
    }


@router.post("/ocr/scan")
async def ocr_scan(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    if not paddle_ocr_reachable():
        raise HTTPException(
            status_code=503,
            detail="Paddle OCR service is not running. Start it from project/paddle_ocr_backend (run_paddle_ocr.py).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload.")

    filename = file.filename or "upload.jpg"
    content_type = file.content_type or "image/jpeg"
    result = PaddleOCRService.scan_image(data, filename=filename, content_type=content_type)
    if not result:
        raise HTTPException(status_code=502, detail="Paddle OCR returned no result.")

    lines = result.get("ocr_lines") or []
    confidence = _confidence_from_result(result)
    structured = _structured_for_ui(result)

    return {
        "rawText": lines,
        "structured": structured,
        "confidence": confidence,
        "patient_id": patient_id or str(current_user.id),
        "savedExtraction": {
            "patient_id": patient_id or current_user.id,
            "filename": filename,
            "structured": result.get("structured"),
            "raw_text": lines,
            "confidence": confidence,
        },
    }
