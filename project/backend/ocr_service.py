"""OCR pipeline: extract text from uploads, parse lab fields (stub-friendly)."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any, Dict, Tuple

from lab_parser import average_confidence, overall_ocr_status, parse_lab_text

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


def process_lab_file(file_path: Path, file_type: str) -> Dict[str, Any]:
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
