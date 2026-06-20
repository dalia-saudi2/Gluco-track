"""
Load medical documents (images, PDFs) into a common representation for OCR.
"""
from __future__ import annotations

from typing import List

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False


def sniff_kind(filename: str | None, content_type: str | None) -> str:
    fn = (filename or "").lower()
    ct = (content_type or "").lower()
    if ct.startswith("image/") or fn.endswith((".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp")):
        return "image"
    if ct == "application/pdf" or fn.endswith(".pdf"):
        return "pdf"
    return "image" if ct.startswith("image") else "unknown"


def extract_pdf_text(pdf_bytes: bytes) -> str:
    if not HAS_PYMUPDF:
        return ""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        parts: List[str] = []
        for i in range(len(doc)):
            parts.append(doc.load_page(i).get_text("text") or "")
        return "\n".join(parts)
    finally:
        doc.close()


def render_pdf_pages_to_png_bytes(pdf_bytes: bytes, zoom: float = 2.0) -> List[bytes]:
    """Rasterize each page for OCR (scanned PDFs)."""
    if not HAS_PYMUPDF:
        return []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    out: List[bytes] = []
    try:
        mat = fitz.Matrix(zoom, zoom)
        for i in range(len(doc)):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            out.append(pix.tobytes("png"))
    finally:
        doc.close()
    return out


def is_probably_digital_pdf(text: str, min_chars: int = 400) -> bool:
    """Enough embedded text to parse without full-page OCR."""
    t = (text or "").strip()
    lines = [ln for ln in t.splitlines() if ln.strip()]
    return len(t) >= min_chars and len(lines) >= 8
