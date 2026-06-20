"""
Normalize OCR + parsed lab output into a stable, ML-ready JSON shape.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

UNIT_NORMALIZATION_MAP = {
    "mg/dl": "mg/dL",
    "mgdl": "mg/dL",
    "g/dl": "g/dL",
    "mmol/l": "mmol/L",
    "iu/l": "IU/L",
    "u/l": "U/L",
    "x10^3/ul": "x10^3/uL",
    "x10^6/ul": "x10^6/uL",
    "/ul": "/uL",
}


def _parse_numeric_value(value: str | None) -> Optional[float]:
    if not value or not isinstance(value, str):
        return None
    s = re.sub(r"^[↓↑⬇⬆<≥≤]\s*", "", value.strip())
    m = re.search(r"-?\d+(?:[.,]\d+)?(?:\s*[eE]\s*-?\d+)?", s)
    if not m:
        return None
    try:
        return float(m.group(0).replace(",", "."))
    except ValueError:
        return None


def _parse_ref_range_text(ref: str | None) -> Tuple[Optional[float], Optional[float], str]:
    """Return (low, high, normalized text). Handles '11.5-16', 'M: 13-17 F: 12-16', etc."""
    if not ref:
        return None, None, ""
    raw = ref.replace("–", "-").strip()
    # Split sex-specific refs — take first numeric range pair
    nums = re.findall(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)", raw)
    if nums:
        try:
            lo, hi = float(nums[0][0]), float(nums[0][1])
            return lo, hi, f"{lo}-{hi}"
        except ValueError:
            pass
    return None, None, raw


def extract_dates_from_lines(lines: List[str]) -> List[str]:
    found: List[str] = []
    pat = re.compile(
        r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"
    )
    for line in lines:
        for m in pat.findall(line):
            if m not in found:
                found.append(m)
    return found[:30]


def extract_notes_from_lines(lines: List[str]) -> List[str]:
    """Heuristic: lines that look like remarks / impressions / comments."""
    keys = (
        "remark",
        "comment",
        "note",
        "impression",
        "interpretation",
        "conclusion",
        "recommend",
        "ملاحظ",
        "تعليق",
    )
    out: List[str] = []
    for line in lines:
        low = line.lower()
        if any(k in low for k in keys) and len(line.strip()) > 3:
            out.append(line.strip())
    return out[:20]


def guess_facility_from_lines(lines: List[str]) -> Optional[str]:
    for line in lines[:40]:
        low = line.lower()
        if any(
            x in low
            for x in (
                "laboratory",
                "laboratories",
                "hospital",
                "medical center",
                "clinic",
                "lab ",
                "معمل",
                "مستشفى",
                "مختبر",
            )
        ):
            if len(line.strip()) > 5 and len(line) < 200:
                return line.strip()
    return None


def _normalize_test_row(t: Dict[str, Any], section: str) -> Dict[str, Any]:
    name = (t.get("name") or "").strip()
    val = t.get("value")
    val_s = str(val).strip() if val is not None else ""
    unit = _normalize_unit((t.get("unit") or "").strip())
    ref = (t.get("reference_range") or "").strip()
    status = _normalize_status((t.get("status") or "").strip() or "Unknown", val_s, ref)
    lo, hi, ref_norm = _parse_ref_range_text(ref)
    num = _parse_numeric_value(val_s)
    return {
        "section": section,
        "test_name": name,
        "value_text": val_s,
        "value_numeric": num,
        "unit": unit or None,
        "reference_range_text": ref_norm or ref or None,
        "ref_low": lo,
        "ref_high": hi,
        "status_flag": status,
        "confidence": _row_confidence(name=name, value_text=val_s, unit=unit, ref_text=ref_norm or ref),
        "evidence": {
            "source": "ocr_parsed_row",
            "line_index": None,
            "source_text": f"{name} {val_s} {unit} {ref_norm or ref}".strip(),
        },
    }


def _normalize_unit(unit: str) -> str:
    if not unit:
        return ""
    u = unit.strip().replace(" ", "")
    low = u.lower()
    return UNIT_NORMALIZATION_MAP.get(low, unit.strip())


def _normalize_status(status: str, value_text: str, reference_range: str) -> str:
    s = (status or "").strip().lower()
    if s in {"high", "h"}:
        return "High"
    if s in {"low", "l"}:
        return "Low"
    if s in {"normal", "n"}:
        return "Normal"
    if s in {"abnormal", "abn"}:
        return "Abnormal"

    n = _parse_numeric_value(value_text)
    lo, hi, _ = _parse_ref_range_text(reference_range)
    if n is not None and lo is not None and hi is not None:
        if n < lo:
            return "Low"
        if n > hi:
            return "High"
        return "Normal"
    return "Unknown"


def _row_confidence(name: str, value_text: str, unit: str, ref_text: str) -> float:
    score = 0.0
    if name:
        score += 0.35
    if value_text:
        score += 0.30
    if unit:
        score += 0.15
    if ref_text:
        score += 0.15
    if _parse_numeric_value(value_text) is not None:
        score += 0.05
    return round(min(1.0, score), 3)


def _line_is_noise(line: str) -> bool:
    l = line.strip().lower()
    if not l:
        return True
    # Common page/footer artifacts
    if re.search(r"\bpage\s*\d+\s*(of|/)\s*\d+\b", l):
        return True
    if len(l) <= 1:
        return True
    return False


def _extract_unmapped_entities(lines: List[str], tests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Keep potentially-clinical lines not represented in parsed tests.
    This is the no-silent-loss bucket for downstream review.
    """
    matched_tokens = set()
    for t in tests:
        tn = (t.get("test_name") or "").strip().lower()
        if tn:
            matched_tokens.add(tn)

    out: List[Dict[str, Any]] = []
    for i, line in enumerate(lines):
        raw = line.strip()
        low = raw.lower()
        if _line_is_noise(raw):
            continue

        # Skip lines already covered by parsed tests
        if any(tok in low for tok in matched_tokens):
            continue

        # Keep lines likely to carry medical signal
        has_num = bool(re.search(r"\d", raw))
        has_med_kw = bool(
            re.search(
                r"(test|result|range|unit|patient|age|gender|name|diagnosis|impression|clinical|hba1c|hemoglobin|wbc|rbc|creatinine|glucose|ضغط|سكر|تحاليل|مريض)",
                low,
            )
        )
        if has_num or has_med_kw:
            out.append(
                {
                    "line_index": i,
                    "text": raw,
                    "reason": "unmapped_candidate",
                    "confidence": 0.45 if has_num else 0.35,
                }
            )
    return out[:250]


def _fallback_tests_from_lines(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Noisy-scan fallback: parse simple analyte rows from free text.
    Example: 'Glucose 110 mg/dL 70-110'
    """
    tests: List[Dict[str, Any]] = []
    seen = set()
    pat = re.compile(
        r"^\s*([A-Za-z\u0600-\u06FF][\w\s\-\(\)%\/]{1,80}?)\s+([<>]?\s*-?\d+(?:[.,]\d+)?)\s*([A-Za-z%\/\^0-9]+)?\s*(\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*$"
    )
    for idx, line in enumerate(lines):
        m = pat.match(line.strip())
        if not m:
            continue
        name = (m.group(1) or "").strip(" :-")
        value_text = (m.group(2) or "").replace(" ", "")
        unit = _normalize_unit((m.group(3) or "").strip())
        ref_text = (m.group(4) or "").strip()
        if len(name) < 2:
            continue
        key = (name.lower(), value_text, unit, ref_text)
        if key in seen:
            continue
        seen.add(key)
        lo, hi, ref_norm = _parse_ref_range_text(ref_text)
        tests.append(
            {
                "section": "fallback_line_parse",
                "test_name": name,
                "value_text": value_text,
                "value_numeric": _parse_numeric_value(value_text),
                "unit": unit or None,
                "reference_range_text": ref_norm or ref_text or None,
                "ref_low": lo,
                "ref_high": hi,
                "status_flag": _normalize_status("Unknown", value_text, ref_text),
                "confidence": 0.4,
                "evidence": {
                    "source": "fallback_line_regex",
                    "line_index": idx,
                    "source_text": line.strip(),
                },
            }
        )
    return tests[:200]


def _completeness_score(ocr_result: Dict[str, Any], tests: List[Dict[str, Any]]) -> float:
    """0–1 rough score for downstream QA (not clinical validation)."""
    pts = 0.0
    max_pts = 6.0
    if ocr_result.get("patient_name") and ocr_result["patient_name"] not in (
        "Not Found",
        "Error",
        "Patient Name Not Found",
        "Collected",
        "Registered",
        "Authenticated",
        "Reported",
    ):
        pts += 1
    if ocr_result.get("test_date"):
        pts += 1
    if ocr_result.get("patient_id") or ocr_result.get("patient_age"):
        pts += 1
    if tests:
        pts += 2
        named = sum(1 for t in tests if t.get("test_name"))
        pts += min(1.0, named / max(10, len(tests)))
    q = ocr_result.get("quality_score")
    if isinstance(q, (int, float)) and q > 0:
        pts += min(1.0, float(q) / 100.0)
    return round(min(1.0, pts / max_pts), 3)


def build_ml_ready_payload(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
    """Single document-level structure for ML / AI consumers."""
    lines = ocr_result.get("ocr_lines") or []
    all_tests: List[Dict[str, Any]] = []
    for t in ocr_result.get("general_tests") or []:
        if isinstance(t, dict):
            all_tests.append(_normalize_test_row(t, "general"))
    for t in ocr_result.get("differential_counts") or []:
        if isinstance(t, dict):
            all_tests.append(_normalize_test_row(t, "differential"))
    if not all_tests:
        all_tests.extend(_fallback_tests_from_lines(lines))

    unmapped = _extract_unmapped_entities(lines, all_tests)
    completeness = _completeness_score(ocr_result, all_tests)
    if unmapped:
        # Penalize slightly when many clinically-relevant lines remain unmapped.
        completeness = round(max(0.0, completeness - min(0.2, len(unmapped) / 500)), 3)

    return {
        "schema_version": "1.1",
        "patient": {
            "name": ocr_result.get("patient_name"),
            "id": ocr_result.get("patient_id"),
            "age": ocr_result.get("patient_age"),
            "gender": ocr_result.get("patient_gender"),
            "report_date": ocr_result.get("test_date"),
        },
        "dates_detected": extract_dates_from_lines(lines),
        "facility_guess": guess_facility_from_lines(lines),
        "notes_segments": extract_notes_from_lines(lines),
        "tests": all_tests,
        "test_count": len(all_tests),
        "completeness_score": completeness,
        "quality_score": ocr_result.get("quality_score"),
        "processing_steps": ocr_result.get("processing_steps") or [],
        "unmapped_entities": unmapped,
        "raw_text_lines": lines,
        "warnings": [
            "template_agnostic_mode_enabled",
            "no_silent_drop: unmapped_entities preserved",
        ],
    }
