from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from ocr_service import process_ocr_image, process_medical_document, warmup_paddle_models
import base64

# One OCR job at a time — avoids RAM spikes / crashes on Windows when two scans overlap.
_ocr_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="paddle-ocr")


async def _run_ocr(fn, *args):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_ocr_executor, fn, *args)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _run_ocr(warmup_paddle_models)
    yield
    _ocr_executor.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)

# Allow CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "PaddleOCR"}

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(None), image_base64: str = Form(None)):
    """
    OCR endpoint that accepts either file upload or base64 image data
    """
    try:
        image_data = None
        
        if file:
            print(f"Received OCR request for file: {file.filename}")
            image_data = await file.read()
            print(f"File size: {len(image_data)} bytes")
        elif image_base64:
            print("Received OCR request with base64 image data")
            # Remove data URL prefix if present
            if image_base64.startswith('data:image'):
                image_base64 = image_base64.split(',')[1]
            
            image_data = base64.b64decode(image_base64)
            print(f"Base64 image size: {len(image_data)} bytes")
        else:
            return {"error": "No image data provided. Send either a file or base64 image data."}
        
        if not image_data:
            return {"error": "Failed to read image data"}
        
        print("Processing image with OCR pipeline...")
        result = await _run_ocr(process_ocr_image, image_data)
        print(f"OCR processing completed. Result keys: {list(result.keys())}")
        
        # Add additional debugging info
        if "patient_name" in result:
            print(f"Extracted patient name: {result['patient_name']}")
        
        return result
        
    except Exception as e:
        print(f"OCR processing error: {str(e)}")
        return {"error": f"Failed to process image: {str(e)}"}


@app.get("/medical-report/process")
async def medical_report_process_info():
    """Browser-friendly hint: this URL expects POST + file upload (use /docs)."""
    return {
        "detail": "This endpoint requires POST with multipart form field 'file' (image or PDF).",
        "try_it": "Open http://127.0.0.1:8001/docs → POST /medical-report/process → Try it out.",
        "method": "POST",
        "field_name": "file",
    }


@app.post("/medical-report/process")
async def medical_report_process(
    file: UploadFile = File(...),
):
    """
    Full OCR + structured lab parse for images or PDFs.
    Returns `structured` (ML-ready) + legacy `general_tests` / `ocr_lines`.
    """
    try:
        data = await file.read()
        fn = file.filename or ""
        ct = file.content_type or "application/octet-stream"
        result = await _run_ocr(process_medical_document, data, fn, ct)
        return result
    except Exception as e:
        print(f"medical-report error: {e}")
        return {
            "error": str(e),
            "patient_name": "Error",
            "general_tests": [],
            "differential_counts": [],
            "ocr_lines": [],
            "structured": None,
            "source": "error",
        }


@app.get("/test-ocr")
async def test_ocr():
    """
    Test endpoint that processes a sample image
    """
    try:
        # Try to load a sample image from uploads directory
        sample_path = "uploads/Laboratory-Blood-Test-Results.png"
        
        try:
            with open(sample_path, 'rb') as f:
                image_data = f.read()
            print(f"Testing with sample image: {sample_path}")
        except FileNotFoundError:
            return {"error": f"Sample image not found: {sample_path}"}
        
        result = await _run_ocr(process_ocr_image, image_data)
        return result
        
    except Exception as e:
        print(f"Test OCR error: {str(e)}")
        return {"error": f"Test failed: {str(e)}"}
