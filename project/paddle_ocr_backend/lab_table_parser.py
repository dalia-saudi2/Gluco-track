"""
Unified analyte-table parser for noisy OCR line lists.
Template-agnostic: matches known analytes + extracts value/unit/reference from nearby lines.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

# canonical name -> fuzzy aliases (lowercase)
ANALYTE_CATALOG: Dict[str, Tuple[str, ...]] = {
    "Red Cell Count": ("red cell count", "rbc count", "rbcs count", "red cell", "erythrocyte count"),
    "Hemoglobin": ("hemoglobin", "haemoglobin", "hemogobin", "hgb", "hb "),
    "HCT": ("hct", "hematocrit", "haematocrit", "pcv"),
    "MCV": ("mcv", "mean corpuscular volume"),
    "MCH": ("mch", "mean corpuscular hemoglobin"),
    "MCHC": ("mchc", "mean corpuscular hemoglobin concentration"),
    "RDW-CV": ("rdw-cv", "rdw cv", "rdw", "rd-c", "red cell distribution"),
    "White Cell Count": ("white cell count", "wbc", "leucocyte count", "leukocyte count", "tlc", "total leucocytic count", "total leucocytic", "total leukocytic count"),
    "Neutrophils": ("neutrophils", "neutrophis", "neutrophil", "segmented"),
    "Lymphocytes": ("lymphocytes", "lymphosytes", "lymphocyte"),
    "Monocytes": ("monocytes", "monocyte", "mooc/te"),
    "Eosinophils": ("eosinophils", "eosinophi", "eosinophil"),
    "Basophils": ("basophils", "basophil", "asoph"),
    "Platelet Count": ("platelet count", "platelet", "plaelet", "plt count"),
    "Creatinine": ("creatinine", "creat inine", "creatinin"),
    "eGFR": ("egfr", "gfr", "estimated glomerular"),
    "Patient time": ("patient time",),
    "Control time": ("control time",),
    "Patient Concentration": ("patient concentration", "prothrombin concentration"),
    "INR": ("inr",),
    "Ratio": ("ratio",),
    "Prothrombin time": ("prothrombin time",),
    "Glucose": ("glucose", "fasting glucose", "blood sugar"),
    "Urea": ("urea", "bun"),
    "Cholesterol": ("cholesterol", "total cholesterol"),
    "Triglycerides": ("triglycerides",),
    "ALT": ("alt", "sgpt"),
    "AST": ("ast", "sgot"),
    "Albumin": ("albumin",),
    "Bilirubin": ("bilirubin",),
    "Calcium": ("calcium",),
    "Iron": ("iron",),
    "HbA1c": ("hba1c", "a1c", "glycated hemoglobin"),
}

UNIT_TOKENS = {
    "g/l", "g/dl", "g/dL", "mg/dl", "mmol/l", "umol/l", "iu/l", "u/l",
    "fl", "pg", "%", "sec", "second", "seconds", "ratio", "l/l",
    "10^12/l", "10^9/l", "10^3/ul", "x10^12/l", "x10^9/l", "x10^3/ul",
    "ml/min/1.73m2", "ml/min", "/ul", "/hpf", "/lpf",
    "millions/cmm", "millions/cmm", "thousands/cmm", "thousands/cmm",
    "million/cmm", "thousand/cmm", "cmm",
}

DIFFERENTIAL_ANALYTES = frozenset({
    "Neutrophils", "Lymphocytes", "Monocytes", "Eosinophils", "Basophils",
})

DEFAULT_UNITS: Dict[str, str] = {
    "HCT": "%",
    "RDW-CV": "%",
    "Neutrophils": "%",
    "Lymphocytes": "%",
    "Monocytes": "%",
    "Eosinophils": "%",
    "Basophils": "%",
}

CANONICAL_NAME_ALIASES: Dict[str, str] = {
    "haematocrit": "HCT",
    "hematocrit": "HCT",
    "hct": "HCT",
    "pcv": "HCT",
    "rbcs count": "Red Cell Count",
    "rbc count": "Red Cell Count",
    "red cell count": "Red Cell Count",
    "haemoglobin (edta": "Hemoglobin",
    "hemoglobin (edta": "Hemoglobin",
    "haemoglobin": "Hemoglobin",
    "hemoglobin": "Hemoglobin",
    "platelet count (edta": "Platelet Count",
    "total leucocytic count": "White Cell Count",
    "total leukocytic count": "White Cell Count",
}

VALUE_BOUNDS: Dict[str, Tuple[float, float]] = {
    "Red Cell Count": (0.5, 12.0),
    "Hemoglobin": (4.0, 25.0),
    "HCT": (0.05, 80.0),
    "MCV": (40.0, 130.0),
    "MCH": (10.0, 60.0),
    "MCHC": (25.0, 45.0),
    "RDW-CV": (5.0, 35.0),
    "White Cell Count": (0.1, 80.0),
    "Neutrophils": (0.0, 80.0),
    "Lymphocytes": (0.0, 80.0),
    "Monocytes": (0.0, 40.0),
    "Eosinophils": (0.0, 40.0),
    "Basophils": (0.0, 20.0),
    "Platelet Count": (5.0, 1500.0),
    "Creatinine": (0.05, 2500.0),
    "eGFR": (1.0, 200.0),
    "Patient time": (5.0, 60.0),
    "Control time": (5.0, 60.0),
    "Patient Concentration": (10.0, 200.0),
    "INR": (0.1, 10.0),
    "Ratio": (0.1, 5.0),
}

SKIP_LINE = frozenset({
    "test", "result", "unit", "reference", "range", "analyte", "si unit", "ref range",
    "reporting", "request", "years",
    "male", "female", "referred", "by", "doctor", "signature",
    "diagnostics", "not", "provided", "your", "sample", "referring",
})


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _fix_ocr_chars(s: str) -> str:
    """Fix common OCR confusions in numeric tokens."""
    t = s.strip()
    t = t.replace(",", ".")
    t = re.sub(r"^[↓↑⬇⬆▼▲]\s*", "", t)
    # isolated letter-digit OCR errors at start of token
    if re.match(r"^[Zz](\d)", t):
        t = "2" + t[1:]
    if re.match(r"^[Oo](\d)", t):
        t = "0" + t[1:]
    t = t.replace("O", "0").replace("o", "0")
    t = t.replace("l", "1").replace("I", "1")
    return t


def _parse_num(s: str) -> Optional[float]:
    t = _fix_ocr_chars(s)
    m = re.search(r"-?(?:\d+\.\d+|\.\d+|\d+)", t)
    if not m:
        return None
    n_s = m.group(0)
    if n_s.startswith("."):
        n_s = "0" + n_s
    if n_s.startswith("-."):
        n_s = "-0." + n_s[2:]
    try:
        return float(n_s)
    except ValueError:
        return None


def _normalize_unit_text(unit: str) -> str:
    if not unit:
        return ""
    raw = unit.strip()
    low = _norm(raw)
    compact = low.replace(" ", "").replace("/", "")
    if "million" in low and "cmm" in compact:
        return "Millions/cmm"
    if "thousand" in low or re.match(r"^thousands?\s*\d+$", low):
        return "Thousands/cmm"
    if compact in {"cmm", "mm3", "mm³"}:
        return "/cmm"
    if re.match(r"^x10?\d?/?l$", compact) or compact in {"x109/l", "x10^9/l"}:
        return "x10^9/L"
    if re.match(r"^g\/?d?l$", compact):
        return "g/dL"
    if low == "fl":
        return "fl"
    if low == "pg":
        return "pg"
    return raw.replace("g/dl", "g/dL").replace("G/DL", "g/dL")


def _is_unit(s: str) -> bool:
    sl = _norm(s)
    sl_compact = sl.replace(" ", "").replace("/", "")
    if sl_compact in {u.replace(" ", "").replace("/", "") for u in UNIT_TOKENS}:
        return True
    if re.match(r"^10[\^x×]?\d+/l$", sl_compact, re.I):
        return True
    if re.match(r"^x10?\d?/?l$", sl_compact, re.I):
        return True
    if sl_compact in {"second", "seconds", "ratio", "percent", "%", "cmm", "mm3"}:
        return True
    if "million" in sl and len(sl) < 30:
        return True
    if "thousand" in sl and len(sl) < 30:
        return True
    return False


def _canonical_display_name(canonical: str, raw_label: str) -> str:
    """Prefer catalog name; map legacy parser labels to canonical keys."""
    key = _norm(raw_label)
    if key in CANONICAL_NAME_ALIASES:
        return CANONICAL_NAME_ALIASES[key]
    return canonical


def _merge_unit_with_next(current: str, nxt: str) -> str:
    """Join split OCR tokens like 'Thousands /' + 'cmm'."""
    combined = f"{current} {nxt}".strip()
    if _is_unit(combined):
        return _normalize_unit_text(combined)
    cur = _norm(current)
    nxt_n = _norm(nxt)
    if "thousand" in cur or "million" in cur:
        if nxt_n in {"cmm", "/ cmm", "cmm"} or nxt_n.startswith("cmm"):
            return _normalize_unit_text(f"{current} {nxt}")
    if cur.rstrip("/") in {"thousands", "millions", "thousand", "million"} and "cmm" in nxt_n:
        return _normalize_unit_text(f"{current} {nxt}")
    return _normalize_unit_text(current)


def _parse_ref(s: str) -> str:
    m = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m2 = re.search(r"(?:<=|≥|>=)\s*(\d+(?:\.\d+)?)", s)
    if m2:
        return f">={m2.group(1)}"
    return ""


def _alias_matches(norm: str, alias: str) -> bool:
    if norm == alias:
        return True
    if alias not in norm:
        return False
    # Avoid false positives like "ratio" inside "concentration"
    return bool(
        re.search(rf"(?:^|\s){re.escape(alias)}(?:\s|$)", norm)
        or norm.startswith(alias + " ")
        or norm.endswith(" " + alias)
    )


def _match_analyte(text: str) -> Optional[str]:
    norm = re.sub(r"[^a-z0-9 ]", " ", _norm(text))
    norm = re.sub(r"\s+", " ", norm).strip()
    if not norm or norm in SKIP_LINE:
        return None

    best: Optional[str] = None
    best_len = 0
    for canonical, aliases in ANALYTE_CATALOG.items():
        for alias in sorted(aliases, key=len, reverse=True):
            if _alias_matches(norm, alias) and len(alias) > best_len:
                best = canonical
                best_len = len(alias)
    return best


def _plausible(canonical: str, value: float) -> bool:
    bounds = VALUE_BOUNDS.get(canonical)
    if not bounds:
        return True
    lo, hi = bounds
    return lo <= value <= hi


def _status(value: float, ref: str) -> str:
    m = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)", ref or "")
    if not m:
        return "Unknown"
    lo, hi = float(m.group(1)), float(m.group(2))
    if value < lo:
        return "Low"
    if value > hi:
        return "High"
    return "Normal"


def _combine_name(lines: List[str], i: int, max_parts: int = 2) -> Tuple[str, int]:
    """Join consecutive short alpha lines into one analyte label."""
    parts = [lines[i].strip()]
    j = i + 1
    while j < len(lines) and len(parts) < max_parts:
        nxt = lines[j].strip()
        if not nxt or _parse_num(nxt) is not None:
            break
        if _match_analyte(nxt):
            break
        if re.match(r"^\(.*\)$", nxt):
            break
        if re.match(r"^[A-Za-z\u0600-\u06FF][A-Za-z0-9\u0600-\u06FF\s\-\(\)]{0,40}$", nxt):
            parts.append(nxt)
            j += 1
        else:
            break
    return " ".join(parts), j - 1


def _extract_fields(
    lines: List[str],
    start: int,
    canonical: str = "",
    in_differential_section: bool = False,
) -> Tuple[Optional[float], str, str, int]:
    """From index `start`, scan forward for value, unit, reference range."""
    value: Optional[float] = None
    unit = ""
    ref = ""
    end = start
    is_diff = in_differential_section and canonical in DIFFERENTIAL_ANALYTES

    for j in range(start, min(start + 10, len(lines))):
        raw = lines[j].strip()
        if not raw:
            continue

        ref_hit = _parse_ref(raw)
        if ref_hit and not ref:
            if is_diff and value is not None and not unit:
                end = j
                continue
            ref = ref_hit
            end = j
            if value is not None:
                break
            continue

        if _is_unit(raw) and not unit and not _match_analyte(raw):
            if is_diff and value is not None:
                # x10^9/L belongs to absolute column, not percent row
                end = j
                continue
            if j + 1 < len(lines):
                nxt = lines[j + 1].strip()
                if _is_unit(raw + " " + nxt) or _norm(nxt) in {"cmm", "/ cmm"}:
                    unit = _merge_unit_with_next(raw, nxt)
                    end = j + 1
                    continue
            unit = _normalize_unit_text(raw)
            end = j
            continue

        n = _parse_num(raw)
        if n is not None:
            if value is None:
                value = n
                end = j
            elif is_diff and not unit:
                # Second numeric is absolute count — ignore for percent row
                end = j
                break
            continue

        if _match_analyte(raw) and j > start:
            break

    if value is not None and not unit:
        default = DEFAULT_UNITS.get(canonical, "")
        if default:
            unit = default
        elif canonical == "Platelet Count" and ref and float(value) > 20:
            unit = "Thousands/cmm"
        elif canonical == "Red Cell Count" and ref:
            unit = "Millions/cmm"

    if unit:
        unit = _normalize_unit_text(unit)

    return value, unit, ref, end


def _extract_fields_backward(lines: List[str], name_idx: int, canonical: str) -> Tuple[Optional[float], str, str]:
    """When OCR puts result lines before the analyte label (common on Al Borg WBC rows)."""
    value: Optional[float] = None
    unit = ""
    ref = ""
    start = max(0, name_idx - 6)
    for j in range(name_idx - 1, start - 1, -1):
        raw = lines[j].strip()
        if not raw or _match_analyte(raw):
            break
        ref_hit = _parse_ref(raw)
        if ref_hit and not ref:
            ref = ref_hit
            continue
        if _is_unit(raw) and not unit:
            unit = _normalize_unit_text(raw)
            if j - 1 >= start:
                prev = lines[j - 1].strip()
                if _is_unit(prev + " " + raw):
                    unit = _merge_unit_with_next(prev, raw)
            continue
        n = _parse_num(raw)
        if n is not None and value is None:
            value = n
            continue
    if value is not None and not unit:
        unit = DEFAULT_UNITS.get(canonical, "")
        if canonical == "White Cell Count" and ref:
            unit = "Thousands/cmm"
        elif canonical == "Platelet Count" and ref and float(value) > 20:
            unit = "Thousands/cmm"
        elif canonical == "Red Cell Count" and ref:
            unit = "Millions/cmm"
    if unit:
        unit = _normalize_unit_text(unit)
    return value, unit, ref


def parse_analyte_table(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Primary parser: walk OCR lines, match analytes, extract row fields.
    Returns list of dicts compatible with ocr_service test entries.
    """
    if not lines:
        return []

    tests: List[Dict[str, Any]] = []
    seen: set = set()
    i = 0
    in_differential_section = False

    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        line_norm = _norm(line)
        if "percent values" in line_norm or "differential" in line_norm:
            in_differential_section = True

        combined, end_name_idx = _combine_name(lines, i)
        canonical = _match_analyte(combined)
        if not canonical:
            canonical = _match_analyte(line)
            combined = line
            end_name_idx = i

        if not canonical:
            i += 1
            continue

        display_name = _canonical_display_name(canonical, combined)
        dedup_key = display_name.lower()

        if dedup_key in seen:
            i += 1
            continue

        value, unit, ref, end_val_idx = _extract_fields(
            lines,
            end_name_idx + 1,
            canonical=display_name,
            in_differential_section=in_differential_section,
        )
        if value is None:
            value, unit, ref = _extract_fields_backward(lines, end_name_idx, display_name)
            end_val_idx = end_name_idx
        elif not _plausible(canonical, value):
            b_val, b_unit, b_ref = _extract_fields_backward(lines, end_name_idx, display_name)
            if b_val is not None and _plausible(canonical, b_val):
                value, unit, ref = b_val, b_unit, b_ref
                end_val_idx = end_name_idx
        if value is None or not _plausible(canonical, value):
            i += 1
            continue

        seen.add(dedup_key)
        tests.append(
            {
                "name": display_name,
                "value": str(value).rstrip("0").rstrip(".") if "." in str(value) else str(value),
                "unit": unit,
                "reference_range": ref,
                "status": _status(value, ref) if ref else "Unknown",
            }
        )
        i = max(end_val_idx, end_name_idx) + 1

    return tests


def score_ocr_lines(lines: List[str]) -> float:
    """Score OCR quality for language/model selection."""
    if not lines:
        return 0.0
    text = "\n".join(lines).lower()
    score = 0.0
    keywords = (
        "hemoglobin", "creatinine", "analyte", "reference", "patient", "platelet",
        "neutrophil", "lymphocyte", "inr", "prothrombin", "coagulation", "egfr",
        "mcv", "mch", "wbc", "rbc", "complete blood", "result", "unit",
    )
    for kw in keywords:
        if kw in text:
            score += 3.0
    for line in lines:
        if re.search(r"\d+\.?\d*\s*[-–]\s*\d+\.?\d*", line):
            score += 2.0
        if len(line.strip()) <= 2:
            score -= 0.5
    latin = sum(1 for c in text if "a" <= c <= "z")
    arabic = sum(1 for c in text if "\u0600" <= c <= "\u06ff")
    if latin > max(20, arabic * 2):
        score += 5.0
    if arabic > latin * 2:
        score += 5.0
    return score
