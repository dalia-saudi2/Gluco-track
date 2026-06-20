"""Map Paddle OCR payloads to lab onboarding field format."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from lab_parser import LAB_FIELDS, parse_lab_text

# Paddle / medical-parser test name → lab onboarding field key
_NAME_TO_FIELD: List[Tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?:total\s+)?cholesterol(?!\s*(?:hdl|ldl))", re.I), "cholesterol_total"),
    (re.compile(r"\bldl\b|low\s+density\s+lipoprotein", re.I), "ldl_cholesterol"),
    (re.compile(r"\bhdl\b|high\s+density\s+lipoprotein", re.I), "hdl_cholesterol"),
    (re.compile(r"\btriglycerides?\b|\btg\b", re.I), "triglycerides"),
    (re.compile(r"\bsystolic\b|\bs\.?\s*b\.?\s*p\.?\b", re.I), "systolic_bp"),
    (re.compile(r"\bdiastolic\b|\bd\.?\s*b\.?\s*p\.?\b", re.I), "diastolic_bp"),
    (re.compile(r"\bheart\s+rate\b|\bpulse\b", re.I), "heart_rate"),
]

NUMBER_RE = re.compile(r"(\d{2,3}(?:\.\d+)?)")


def _empty_extracted() -> Dict[str, Dict[str, Any]]:
    return {
        field: {"value": None, "confidence": 0.0, "status": "missing"}
        for field in LAB_FIELDS
    }


def _field_for_name(name: str) -> Optional[str]:
    if not name:
        return None
    for pattern, field in _NAME_TO_FIELD:
        if pattern.search(name):
            return field
    return None


def _coerce_value(raw: Any) -> Optional[float]:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip()
    if not text:
        return None
    match = NUMBER_RE.search(text.replace(",", ""))
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def _merge_cell(
    target: Dict[str, Dict[str, Any]],
    field: str,
    value: float,
    confidence: float = 0.9,
) -> None:
    current = target[field]
    conf = max(0.0, min(1.0, confidence))
    if current["value"] is None or conf > float(current.get("confidence") or 0):
        target[field] = {
            "value": value,
            "confidence": conf,
            "status": "ok" if conf >= 0.85 else "low",
        }


def _rows_from_paddle(ocr_result: dict) -> List[dict]:
    rows: List[dict] = []
    structured = ocr_result.get("structured")
    if isinstance(structured, dict):
        for row in structured.get("tests") or []:
            if isinstance(row, dict):
                rows.append(row)
    for key in ("general_tests", "differential_counts"):
        for row in ocr_result.get(key) or []:
            if isinstance(row, dict):
                rows.append(row)
    return rows


def map_paddle_to_lab_fields(ocr_result: dict | None) -> Dict[str, Dict[str, Any]]:
    """Convert Paddle OCR JSON into lab_parser-style extracted values."""
    extracted = _empty_extracted()
    if not ocr_result or not isinstance(ocr_result, dict):
        return extracted

    for row in _rows_from_paddle(ocr_result):
        name = row.get("test_name") or row.get("name") or ""
        field = _field_for_name(str(name))
        if not field:
            continue
        value = _coerce_value(row.get("value") if row.get("value") is not None else row.get("value_text"))
        if value is None:
            continue
        conf_raw = row.get("confidence")
        confidence = float(conf_raw) if isinstance(conf_raw, (int, float)) else 0.88
        _merge_cell(extracted, field, value, confidence)

    lines = ocr_result.get("ocr_lines") or []
    if isinstance(lines, list) and lines:
        text = "\n".join(str(line) for line in lines if line)
        parsed = parse_lab_text(text)
        for field in LAB_FIELDS:
            cell = parsed.get(field) or {}
            value = cell.get("value")
            if value is None:
                continue
            conf = float(cell.get("confidence") or 0.0)
            _merge_cell(extracted, field, float(value), conf)

    return extracted
