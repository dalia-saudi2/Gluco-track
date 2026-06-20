#!/usr/bin/env python3
"""
Start PaddleOCR Backend Server
Enhanced startup script with better error handling and debugging
"""
import sys
import os
import subprocess
import time

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("[ERROR] Python 3.8+ is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"[OK] Python version: {sys.version}")
    return True

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import paddleocr
        import fastapi
        import uvicorn
        print("[OK] All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def start_backend():
    """Start the FastAPI backend server"""
    try:
        print("Starting PaddleOCR Backend Server...")
        print("Server: http://127.0.0.1:8001")
        print("API docs: http://127.0.0.1:8001/docs")
        print("Health: http://127.0.0.1:8001/health")
        print("=" * 50)
        
        # Get the directory where the script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8001"
        ], cwd=script_dir)
        
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"[ERROR] Failed to start server: {e}")
        return False
    
    return True

def test_backend():
    """Test if backend is responding"""
    try:
        import requests
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("[OK] Backend is responding correctly")
            return True
        else:
            print(f"[ERROR] Backend responded with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"[ERROR] Backend test failed: {e}")
        return False

def main():
    """Main function"""
    print("PaddleOCR Backend Server Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        return
    
    # Check dependencies
    if not check_dependencies():
        return
    
    print("\nStarting server...")
    print("Press Ctrl+C to stop the server")
    print("=" * 40)
    
    # Start the server
    start_backend()

if __name__ == "__main__":
    main() 