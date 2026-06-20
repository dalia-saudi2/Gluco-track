"""OCR pipeline: Paddle OCR when available, else pypdf/tesseract fallback."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Tuple

import requests

from lab_parser import average_confidence, overall_ocr_status, parse_lab_text
from paddle_lab_mapper import map_paddle_to_lab_fields
from paddle_ocr_service import PADDLE_OCR_BASE, PaddleOCRService

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None  # type: ignore

try:
    import pytesseract
    from PIL import Image
except ImportError:
    pytesseract = None  # type: ignore
    Image = None  # type: ignore


def paddle_ocr_reachable(timeout: float = 3.0) -> bool:
    try:
        resp = requests.get(f"{PADDLE_OCR_BASE}/health", timeout=timeout)
        if resp.status_code != 200:
            return False
        data = resp.json()
        return data.get("status") in ("healthy", "degraded") or data.get("paddle_available") is True
    except Exception:
        return False


def _content_type_for(file_type: str) -> str:
    ft = file_type.lower()
    if ft == "pdf":
        return "application/pdf"
    if ft in ("jpg", "jpeg"):
        return "image/jpeg"
    if ft == "png":
        return "image/png"
    return "application/octet-stream"


def _extract_text_pdf(file_path: Path) -> str:
    if PdfReader is None:
        return ""
    reader = PdfReader(str(file_path))
    chunks = []
    for page in reader.pages[:5]:
        text = page.extract_text() or ""
        chunks.append(text)
    return "\n".join(chunks)


def _extract_text_image(file_path: Path) -> str:
    if pytesseract is None or Image is None:
        return ""
    image = Image.open(file_path)
    return pytesseract.image_to_string(image)


def extract_text_from_file(file_path: Path, file_type: str) -> Tuple[str, str]:
    """Returns (raw_text, engine_name)."""
    ft = file_type.lower()
    if ft == "pdf":
        text = _extract_text_pdf(file_path)
        return text, "pypdf" if text.strip() else "pypdf_empty"
    if ft in ("jpeg", "jpg", "png"):
        text = _extract_text_image(file_path)
        if text.strip():
            return text, "tesseract"
        return "", "tesseract_unavailable"
    return "", "unsupported"


def _process_with_paddle(file_path: Path, file_type: str) -> Dict[str, Any] | None:
    if not paddle_ocr_reachable():
        return None
    data = file_path.read_bytes()
    filename = file_path.name
    content_type = _content_type_for(file_type)
    ocr_result = PaddleOCRService.scan_image(data, filename=filename, content_type=content_type)
    if not ocr_result:
        return None

    extracted = map_paddle_to_lab_fields(ocr_result)
    lines = ocr_result.get("ocr_lines") or []
    raw_text = ocr_result.get("text") or "\n".join(str(x) for x in lines)
    status = overall_ocr_status(extracted)
    if not raw_text.strip() and status == "failed":
        status = "partial"

    return {
        "ocr_status": status,
        "ocr_raw_output": {
            "engine": ocr_result.get("engine") or "paddle",
            "text_preview": raw_text[:4000] if raw_text else "",
            "char_count": len(raw_text),
            "paddle_structured": ocr_result.get("structured"),
        },
        "ocr_extracted_values": extracted,
        "ocr_confidence_score": average_confidence(extracted),
    }


def _process_with_paddle_medical(file_path: Path, file_type: str) -> Dict[str, Any] | None:
    """Full medical-report pipeline (PDF + images) via Paddle /medical-report/process."""
    if not paddle_ocr_reachable():
        return None
    data = file_path.read_bytes()
    medical = PaddleOCRService.process_medical_document(
        data,
        filename=file_path.name,
        content_type=_content_type_for(file_type),
    )
    if not medical:
        return None

    extracted = map_paddle_to_lab_fields(medical)
    lines = medical.get("ocr_lines") or []
    raw_text = medical.get("text") or "\n".join(str(x) for x in lines)
    status = overall_ocr_status(extracted)
    if raw_text.strip() and status == "failed":
        status = "partial"

    return {
        "ocr_status": status,
        "ocr_raw_output": {
            "engine": medical.get("engine") or "paddle_medical",
            "text_preview": raw_text[:4000] if raw_text else "",
            "char_count": len(raw_text),
            "paddle_structured": medical.get("structured"),
            "general_tests": medical.get("general_tests"),
        },
        "ocr_extracted_values": extracted,
        "ocr_confidence_score": average_confidence(extracted) or float(medical.get("confidence") or 0),
    }


def process_lab_file(file_path: Path, file_type: str) -> Dict[str, Any]:
    paddle_result = _process_with_paddle(file_path, file_type)
    if paddle_result is not None:
        return paddle_result

    raw_text, engine = extract_text_from_file(file_path, file_type)
    extracted = parse_lab_text(raw_text)
    status = overall_ocr_status(extracted)

    if not raw_text.strip() and status == "failed":
        status = "partial"

    return {
        "ocr_status": status,
        "ocr_raw_output": {
            "engine": engine,
            "text_preview": raw_text[:4000] if raw_text else "",
            "char_count": len(raw_text),
        },
        "ocr_extracted_values": extracted,
        "ocr_confidence_score": average_confidence(extracted),
    }


def process_medical_report_file(file_path: Path, file_type: str) -> Dict[str, Any]:
    """Records page: prefer full Paddle medical pipeline, then lab OCR, then local fallback."""
    medical = _process_with_paddle_medical(file_path, file_type)
    if medical is not None:
        return medical
    return process_lab_file(file_path, file_type)
