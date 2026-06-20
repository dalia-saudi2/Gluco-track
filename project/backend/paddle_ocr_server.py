"""Paddle OCR microservice — run on port 8001 (see run_paddle_ocr.py)."""

from __future__ import annotations

import io
import os
import re
import tempfile
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None  # type: ignore

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None  # type: ignore

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore

from lab_parser import parse_lab_text

app = FastAPI(title="Paddle OCR Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ocr_engine: Any = None
_ocr_error: Optional[str] = None

TEST_LINE_RE = re.compile(
    r"^(.{2,60}?)\s+(\d{2,3}(?:\.\d+)?)\s*([a-zA-Z%/]+)?",
    re.I,
)
BP_LINE_RE = re.compile(
    r"(?:blood\s+pressure|bp)\s*[:\-]?\s*(\d{2,3})\s*[/\\]\s*(\d{2,3})",
    re.I,
)


def _paddle_lang() -> str:
    return os.getenv("PADDLE_OCR_LANG", "en")


def _get_ocr() -> Any:
    global _ocr_engine, _ocr_error
    if _ocr_engine is not None:
        return _ocr_engine
    if PaddleOCR is None:
        _ocr_error = "paddleocr not installed — pip install -r requirements-paddle.txt"
        raise RuntimeError(_ocr_error)
    try:
        use_gpu = os.getenv("PADDLE_OCR_USE_GPU", "0").strip() in ("1", "true", "yes")
        _ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang=_paddle_lang(),
            use_gpu=use_gpu,
            show_log=False,
        )
        return _ocr_engine
    except Exception as exc:
        _ocr_error = str(exc)
        raise


def _lines_from_paddle_result(result: Any) -> List[str]:
    lines: List[str] = []
    if not result:
        return lines
    for block in result:
        if not block:
            continue
        for item in block:
            if not item or len(item) < 2:
                continue
            text = item[1][0] if isinstance(item[1], (list, tuple)) else str(item[1])
            text = str(text).strip()
            if text:
                lines.append(text)
    return lines


def _ocr_image_bytes(data: bytes) -> List[str]:
    if Image is None:
        raise RuntimeError("Pillow not installed")
    engine = _get_ocr()
    image = Image.open(io.BytesIO(data))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        image.save(tmp.name, format="PNG")
        tmp_path = tmp.name
    try:
        raw = engine.ocr(tmp_path, cls=True)
        return _lines_from_paddle_result(raw)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _pdf_text_pypdf(data: bytes, max_pages: int = 5) -> str:
    if PdfReader is None:
        return ""
    reader = PdfReader(io.BytesIO(data))
    chunks: List[str] = []
    for page in reader.pages[:max_pages]:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def _pdf_to_image_lines(data: bytes, max_pages: int = 3) -> List[str]:
    if fitz is None:
        return []
    lines: List[str] = []
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        for page_index in range(min(len(doc), max_pages)):
            page = doc[page_index]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("png")
            lines.extend(_ocr_image_bytes(img_bytes))
    finally:
        doc.close()
    return lines


def _extract_lines(data: bytes, filename: str, content_type: str) -> Tuple[List[str], str]:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()
    is_pdf = name.endswith(".pdf") or ctype == "application/pdf"

    if is_pdf:
        text = _pdf_text_pypdf(data)
        if text.strip():
            return [ln.strip() for ln in text.splitlines() if ln.strip()], "pypdf"
        image_lines = _pdf_to_image_lines(data)
        if image_lines:
            return image_lines, "paddle_pdf_ocr"
        return [], "pdf_empty"

    return _ocr_image_bytes(data), "paddle"


def _tests_from_lines(lines: List[str]) -> List[Dict[str, Any]]:
    tests: List[Dict[str, Any]] = []
    joined = "\n".join(lines)

    for match in BP_LINE_RE.finditer(joined):
        tests.append(
            {
                "name": "Blood Pressure Systolic",
                "test_name": "Systolic BP",
                "value": float(match.group(1)),
                "unit": "mmHg",
                "confidence": 0.9,
            }
        )
        tests.append(
            {
                "name": "Blood Pressure Diastolic",
                "test_name": "Diastolic BP",
                "value": float(match.group(2)),
                "unit": "mmHg",
                "confidence": 0.9,
            }
        )

    for line in lines:
        m = TEST_LINE_RE.match(line.strip())
        if not m:
            continue
        label = m.group(1).strip(" :-")
        value = float(m.group(2))
        unit = (m.group(3) or "-").strip()
        tests.append(
            {
                "name": label,
                "test_name": label,
                "value": value,
                "unit": unit,
                "confidence": 0.85,
            }
        )
    return tests


def _build_payload(lines: List[str], engine: str) -> Dict[str, Any]:
    tests = _tests_from_lines(lines)
    lab_parsed = parse_lab_text("\n".join(lines))
    return {
        "engine": engine,
        "ocr_lines": lines,
        "text": "\n".join(lines),
        "structured": {"tests": tests},
        "general_tests": tests,
        "differential_counts": [],
        "lab_fields": lab_parsed,
        "confidence": 0.88 if lines else 0.0,
    }


@app.get("/health")
async def health():
    ready = PaddleOCR is not None and _ocr_error is None
    if ready:
        try:
            _get_ocr()
            ready = True
        except Exception:
            ready = False
    return {
        "status": "healthy" if ready else "degraded",
        "paddle_available": PaddleOCR is not None,
        "engine_loaded": _ocr_engine is not None,
        "error": _ocr_error,
        "lang": _paddle_lang(),
    }


@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    data = await file.read()
    lines, engine = _extract_lines(data, file.filename or "upload", file.content_type or "")
    return _build_payload(lines, engine)


@app.post("/medical-report/process")
async def medical_report_process(file: UploadFile = File(...)):
    data = await file.read()
    lines, engine = _extract_lines(data, file.filename or "upload", file.content_type or "")
    payload = _build_payload(lines, engine)
    payload["document_type"] = "medical_report"
    return payload
