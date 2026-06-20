#!/usr/bin/env python3
"""
Test OCR Working
Simple test to verify OCR is working correctly
"""
import os
import sys
from paddleocr import PaddleOCR
from PIL import Image
import numpy as np

def test_ocr_working():
    """Test that OCR can extract text from an image"""
    
    print("🔍 Testing OCR Working")
    print("=" * 30)
    
    # Check if test image exists
    test_image_path = "uploads/Laboratory-Blood-Test-Results.png"
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        return
    
    try:
        # Load image
        print(f"📸 Loading image: {test_image_path}")
        image = Image.open(test_image_path)
        image_np = np.array(image)
        print(f"📏 Image shape: {image_np.shape}")
        
        # Initialize OCR with minimal config
        print("🔧 Initializing PaddleOCR...")
        ocr = PaddleOCR(lang='ar')
        
        # Run OCR
        print("🔄 Running OCR...")
        result = ocr.predict(image_np)
        
        # Analyze result
        print(f"\n📊 OCR Result Analysis:")
        print(f"Result type: {type(result)}")
        print(f"Result length: {len(result) if isinstance(result, list) else 'N/A'}")
        
        if isinstance(result, list) and len(result) > 0:
            print(f"First result type: {type(result[0])}")
            print(f"First result length: {len(result[0]) if isinstance(result[0], list) else 'N/A'}")
            
            if isinstance(result[0], list) and len(result[0]) > 0:
                print(f"Number of detections: {len(result[0])}")
                
                # Extract and show text
                extracted_texts = []
                for i, detection in enumerate(result[0]):
                    text = None
                    
                    if isinstance(detection, list) and len(detection) >= 2:
                        if isinstance(detection[1], tuple) and len(detection[1]) >= 1:
                            text = detection[1][0]
                        elif isinstance(detection[1], str):
                            text = detection[1]
                        elif isinstance(detection[1], list) and len(detection[1]) >= 1:
                            text = detection[1][0]
                    elif isinstance(detection, tuple) and len(detection) >= 1:
                        text = detection[0]
                    elif isinstance(detection, str):
                        text = detection
                    
                    if text:
                        extracted_texts.append(text)
                        print(f"  Text {i+1}: '{text}'")
                
                print(f"\n✅ Successfully extracted {len(extracted_texts)} text lines")
                if extracted_texts:
                    print("✅ OCR is working correctly!")
                else:
                    print("❌ No text extracted - OCR may not be working")
            else:
                print("❌ No detections found")
        else:
            print("❌ Empty or invalid result")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ocr_working() 