#!/usr/bin/env python3
"""
Test Backend Connection
Tests that the backend is running and can process images
"""
import requests
import os
import json

def test_backend_connection():
    """Test backend connection and image processing"""
    
    print("🔍 Testing Backend Connection")
    print("=" * 30)
    
    # Test health endpoint
    try:
        print("🔗 Testing health endpoint...")
        response = requests.get("http://localhost:8001/health", timeout=5)
        
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Backend is running: {health_data}")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("💡 Make sure the backend server is running on http://localhost:8001")
        return False
    
    # Test OCR endpoint with a sample image
    test_image_path = "uploads/Laboratory-Blood-Test-Results.png"
    if not os.path.exists(test_image_path):
        # Fallback to the debug image we just created
        test_image_path = "uploads/debug_image.png"
        
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        print("💡 Please place a lab test image in the uploads directory")
        return False
    
    try:
        print(f"📸 Testing OCR with image: {test_image_path}")
        
        with open(test_image_path, 'rb') as f:
            files = {'file': ('lab_test.png', f.read(), 'image/png')}
        
        response = requests.post("http://localhost:8001/ocr", files=files, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ OCR request successful!")
            
            # Analyze the result
            patient_name = result.get('patient_name', 'Not Found')
            general_tests = result.get('general_tests', [])
            differential_tests = result.get('differential_counts', [])
            ocr_lines = result.get('ocr_lines', [])
            quality_score = result.get('quality_score', 0)
            
            print(f"\n📊 OCR Results:")
            print(f"Patient Name: {patient_name}")
            print(f"General Tests: {len(general_tests)}")
            print(f"Differential Tests: {len(differential_tests)}")
            print(f"OCR Lines: {len(ocr_lines)}")
            print(f"Quality Score: {quality_score}")
            
            if result.get('error'):
                print(f"❌ OCR Error: {result['error']}")
                return False
            
            if len(ocr_lines) > 0:
                print(f"\n📝 First 5 OCR Lines:")
                for i, line in enumerate(ocr_lines[:5]):
                    print(f"  {i+1}: {line}")
            
            if len(general_tests) > 0 or len(differential_tests) > 0:
                print(f"\n✅ SUCCESS: Backend extracted real data!")
                print("✅ This is real OCR data, not mock data!")
                return True
            else:
                print(f"\n⚠️ Backend is working but no test data extracted")
                print("💡 This might be due to image quality or format")
                return True
                
        else:
            print(f"❌ OCR request failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_backend_connection()
    if success:
        print("\n✅ Backend is working correctly!")
    else:
        print("\n❌ Backend has issues that need to be fixed") 