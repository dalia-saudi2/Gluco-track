"""Map OCR raw text to structured lab fields (glucose/HbA1c intentionally skipped)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

LAB_FIELDS = (
    "cholesterol_total",
    "ldl_cholesterol",
    "hdl_cholesterol",
    "triglycerides",
    "systolic_bp",
    "diastolic_bp",
    "heart_rate",
)

IGNORED_PATTERNS = (
    r"\b(fasting\s+)?glucose\b",
    r"\bhba1c\b",
    r"\bhb\s*a1c\b",
    r"\binsulin\b",
)

FIELD_RULES: List[Tuple[str, re.Pattern[str]]] = [
    ("cholesterol_total", re.compile(r"(?:total\s+)?cholesterol(?!\s*(?:hdl|ldl))", re.I)),
    ("ldl_cholesterol", re.compile(r"\bldl\b|low\s+density\s+lipoprotein", re.I)),
    ("hdl_cholesterol", re.compile(r"\bhdl\b|high\s+density\s+lipoprotein", re.I)),
    ("triglycerides", re.compile(r"\btriglycerides?\b|\btg\b", re.I)),
    ("systolic_bp", re.compile(r"\bsystolic\b|\bs\.?\s*b\.?\s*p\.?\b|\bbp\s*systolic", re.I)),
    ("diastolic_bp", re.compile(r"\bdiastolic\b|\bd\.?\s*b\.?\s*p\.?\b|\bbp\s*diastolic", re.I)),
    ("heart_rate", re.compile(r"\bheart\s+rate\b|\bpulse\b", re.I)),
]

NUMBER_RE = re.compile(r"(\d{2,3}(?:\.\d+)?)")

BP_PAIR_RE = re.compile(
    r"(?:blood\s+pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*[/\\]\s*(\d{2,3})",
    re.I,
)


def _line_ignored(line: str) -> bool:
    return any(re.search(pat, line, re.I) for pat in IGNORED_PATTERNS)


def _extract_number_after_label(line: str, label_pattern: re.Pattern[str]) -> Optional[Tuple[float, float]]:
    if _line_ignored(line):
        return None
    if not label_pattern.search(line):
        return None
    nums = NUMBER_RE.findall(line)
    if not nums:
        return None
    value = float(nums[0])
    conf = 0.92 if len(nums) == 1 else 0.78
    return value, conf


def parse_lab_text(raw_text: str) -> Dict[str, Dict[str, Any]]:
    """Return per-field { value, confidence, status }."""
    results: Dict[str, Dict[str, Any]] = {
        field: {"value": None, "confidence": 0.0, "status": "missing"}
        for field in LAB_FIELDS
    }

    if not raw_text or not raw_text.strip():
        return results

    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]

    for match in BP_PAIR_RE.finditer(raw_text):
        sys_v, dia_v = float(match.group(1)), float(match.group(2))
        results["systolic_bp"] = {"value": sys_v, "confidence": 0.9, "status": "ok"}
        results["diastolic_bp"] = {"value": dia_v, "confidence": 0.9, "status": "ok"}

    for line in lines:
        for field, pattern in FIELD_RULES:
            if field in ("systolic_bp", "diastolic_bp") and results[field]["value"] is not None:
                continue
            extracted = _extract_number_after_label(line, pattern)
            if not extracted:
                continue
            value, conf = extracted
            status = "ok" if conf >= 0.85 else "low"
            current = results[field]
            if current["value"] is None or conf > current["confidence"]:
                results[field] = {"value": value, "confidence": conf, "status": status}

    return results


def flatten_extracted(extracted: Dict[str, Dict[str, Any]]) -> Dict[str, Optional[float]]:
    return {k: (v.get("value") if isinstance(v.get("value"), (int, float)) else None) for k, v in extracted.items()}


def average_confidence(extracted: Dict[str, Dict[str, Any]]) -> Optional[float]:
    scores = [float(v["confidence"]) for v in extracted.values() if v.get("value") is not None]
    if not scores:
        return None
    return round(sum(scores) / len(scores), 3)


def overall_ocr_status(extracted: Dict[str, Dict[str, Any]]) -> str:
    found = sum(1 for v in extracted.values() if v.get("value") is not None)
    if found == 0:
        return "failed"
    if found >= 4:
        return "success"
    return "partial"
