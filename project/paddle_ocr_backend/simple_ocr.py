import os
import sys
import numpy as np
from PIL import Image
try:
    from paddleocr import PaddleOCR
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False

class PaddleOCREngine:
    def __init__(self, lang='ar'):
        if not PADDLEOCR_AVAILABLE:
            raise ImportError("PaddleOCR is not installed. Please run: pip install paddlepaddle paddleocr")
        
        # Initialize PaddleOCR
        # use_angle_cls: recognizes text direction
        # lang: 'ar' for Arabic/English, 'en' for English only
        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)

    def extract_text(self, image_path):
        """Extracts text from an image file path."""
        if not os.path.exists(image_path):
            return f"Error: File {image_path} not found"

        try:
            # Load image
            img = Image.open(image_path).convert('RGB')
            img_np = np.array(img)
            
            # Predict
            result = self.ocr.ocr(img_np, cls=True)
            
            # Process results
            # Result is a list of [bbox, (text, confidence)]
            if not result or not result[0]:
                return ""
            
            lines = []
            for line in result[0]:
                text = line[1][0]
                lines.append(text)
            
            return "\n".join(lines)
        except Exception as e:
            return f"Error during OCR: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python simple_ocr.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    engine = PaddleOCREngine()
    print(f"\n--- Extracting Text from {image_path} ---\n")
    text = engine.extract_text(image_path)
    print(text)
    print("\n--- End of Extraction ---\n")
