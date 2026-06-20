import requests
import os

_DEFAULT_OCR = "http://127.0.0.1:8001/ocr"


def _paddle_base_url() -> str:
    b = os.getenv("PADDLE_OCR_BASE", "").strip().rstrip("/")
    if b:
        return b
    legacy = os.getenv("PADDLE_OCR_URL", _DEFAULT_OCR).strip()
    if legacy.endswith("/ocr"):
        return legacy[: -len("/ocr")]
    return legacy.rstrip("/")


PADDLE_OCR_BASE = _paddle_base_url()
PADDLE_OCR_URL = os.getenv("PADDLE_OCR_URL", f"{PADDLE_OCR_BASE}/ocr")
MEDICAL_REPORT_PROCESS_URL = os.getenv(
    "PADDLE_MEDICAL_REPORT_URL", f"{PADDLE_OCR_BASE}/medical-report/process"
)
# First scan on CPU can exceed 3 min (en+ar models + parsing). Match verify_ocr.
PADDLE_OCR_TIMEOUT = int(os.getenv("PADDLE_OCR_TIMEOUT", "900"))


class PaddleOCRService:
    @staticmethod
    def build_external_structured(ocr_result: dict | None) -> dict:
        """Map Paddle OCR payload → flat analyte dict for AIService / UI."""
        external: dict = {}
        if not ocr_result or not isinstance(ocr_result, dict):
            return external

        def _add(name: str, row: dict) -> None:
            if not name or not isinstance(row, dict):
                return
            val = row.get("value")
            if val is None:
                val = row.get("value_text")
            if val is None or val == "":
                return
            external[str(name)] = {
                "value": val,
                "unit": (row.get("unit") or "-") if row.get("unit") != "" else "-",
                "reference_range": (
                    row.get("reference_range")
                    or row.get("reference_range_text")
                    or "-"
                ),
            }

        structured_payload = ocr_result.get("structured")
        if isinstance(structured_payload, dict):
            for row in structured_payload.get("tests") or []:
                if isinstance(row, dict):
                    _add(row.get("test_name") or row.get("name"), row)

        for test in ocr_result.get("general_tests") or []:
            if isinstance(test, dict):
                _add(test.get("name"), test)

        for test in ocr_result.get("differential_counts") or []:
            if isinstance(test, dict):
                _add(test.get("name"), test)

        return external

    @staticmethod
    def scan_image(image_bytes: bytes, filename: str = "image.png", content_type: str = "image/png") -> dict | None:
        """Single OCR call to Paddle /ocr (same pipeline AI Assistant uses)."""
        is_pdf = (
            (content_type or "").lower() == "application/pdf"
            or (filename or "").lower().endswith(".pdf")
        )
        if is_pdf:
            return PaddleOCRService.process_medical_document(
                image_bytes, filename=filename, content_type=content_type
            )
        return PaddleOCRService.get_ocr_data(image_bytes, filename=filename, content_type=content_type)

    @staticmethod
    def get_ocr_data(
        image_bytes: bytes,
        filename: str = "image.png",
        content_type: str = "image/png",
    ) -> dict | None:
        """Sends image to PaddleOCR backend and returns the full response dictionary."""
        try:
            files = {"file": (filename, image_bytes, content_type or "image/png")}
            response = requests.post(PADDLE_OCR_URL, files=files, timeout=PADDLE_OCR_TIMEOUT)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"PaddleOCR error: {response.status_code} - {response.text[:500]}")
                return None
        except Exception as e:
            print(f"Failed to connect to PaddleOCR: {e}")
            return None

    @staticmethod
    def process_medical_document(
        file_bytes: bytes,
        filename: str = "upload",
        content_type: str = "application/octet-stream",
    ) -> dict | None:
        """Full structured OCR + parse (images + PDFs) from the Paddle OCR microservice."""
        try:
            files = {"file": (filename, file_bytes, content_type)}
            response = requests.post(
                MEDICAL_REPORT_PROCESS_URL, files=files, timeout=PADDLE_OCR_TIMEOUT
            )
            if response.status_code == 200:
                return response.json()
            print(
                f"Medical report OCR error: {response.status_code} - {response.text}"
            )
            return None
        except Exception as e:
            print(f"Failed medical report OCR: {e}")
            return None

    @staticmethod
    def extract_text(image_bytes: bytes) -> str:
        """Sends image to PaddleOCR backend and returns extracted text."""
        result = PaddleOCRService.scan_image(image_bytes)
        if result and "ocr_lines" in result:
            return "\n".join(result["ocr_lines"])
        return ""
