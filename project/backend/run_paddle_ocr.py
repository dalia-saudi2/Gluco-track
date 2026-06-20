#!/usr/bin/env python3
"""Start the Paddle OCR microservice on port 8001."""

import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PADDLE_OCR_PORT", "8001"))
    uvicorn.run(
        "paddle_ocr_server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
