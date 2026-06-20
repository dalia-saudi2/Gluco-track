#!/usr/bin/env python3
"""
FastAPI Healthcare Backend Server
Run this file to start the development server
"""

import uvicorn
from main import app

if __name__ == "__main__":
    from ai_gateway_service import _resolve_api_key

    key = _resolve_api_key()
    prefix = key[:8] if key else "MISSING"
    print(f"AI Gateway key prefix: {prefix} (from backend/.env)")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # reload=True can leave orphan workers on Windows holding :8000
        log_level="info"
    )

