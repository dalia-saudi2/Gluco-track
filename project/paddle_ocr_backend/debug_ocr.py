import os
import sys
# Add current directory to path so we can import ocr_service
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

base_dir = os.path.dirname(os.path.abspath(__file__))

from ocr_service import process_ocr_image

def main():
    image_path = os.path.join(base_dir, "uploads", "Laboratory-Blood-Test-Results.png")
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    print(f"Processing {image_path}...")
    with open(image_path, "rb") as f:
        image_data = f.read()

    result = process_ocr_image(image_data)
    
    print("\n" + "="*50)
    print("EXTRACTED DATA SUMMARY")
    print("="*50)
    print(f"Patient Name: {result.get('patient_name')}")
    print(f"General Tests Found: {len(result.get('general_tests', []))}")
    print(f"Differential Counts Found: {len(result.get('differential_counts', []))}")
    
    print("\nRAW LINES (Cleaned):")
    print("-" * 30)
    for i, line in enumerate(result.get('ocr_lines', [])):
        print(f"{i}: {line}")

if __name__ == "__main__":
    main()
