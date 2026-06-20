#!/usr/bin/env python3
"""
Improved OCR Service for Lab Report Processing
Enhanced to handle specific lab report formats with better accuracy
"""

from paddleocr import PaddleOCR
from PIL import Image
import numpy as np
import re
from tabulate import tabulate
from imagepreprocessing import preprocess_image_from_bytes

def clean_line(line: str) -> str:
    """Clean OCR line by removing noise and normalizing special characters while preserving Arabic text."""
    if not line:
        return None
    line = line.strip().replace("：", ":").replace("–", "-")
    # Don't remove Arabic characters - only remove non-printable characters
    line = re.sub(r'[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', " ", line)
    line = re.sub(r"\s+", " ", line)
    return line if line else None

def process_ocr_image_improved(image_data: bytes):
    """Process an image for OCR and extract lab report data with improved accuracy."""
    try:
        print("Starting Improved OCR processing...")
        print(f"Image data size: {len(image_data)} bytes")
        
        # Preprocess the image
        print("Preprocessing image...")
        preprocess_result = preprocess_image_from_bytes(image_data)
        print(f"Preprocessing result: {preprocess_result}")
        
        if preprocess_result["processed_image"] is None:
            print("Preprocessing failed")
            return {
                "error": f"Preprocessing failed: {preprocess_result['processing_steps'][0]}",
                "patient_name": None,
                "general_tests": [],
                "differential_counts": [],
                "ocr_lines": [],
                "processing_steps": preprocess_result["processing_steps"],
                "quality_score": preprocess_result["quality_score"]
            }
        
        img = preprocess_result["processed_image"]
        image_np = np.array(img)
        print(f"Image shape: {image_np.shape}")
        print(f"Image data type: {image_np.dtype}")
        print(f"Image min/max values: {image_np.min()}/{image_np.max()}")

        # Initialize OCR with minimal configuration to avoid conflicts
        print("Initializing PaddleOCR...")
        ocr = PaddleOCR(lang='ar')
        print("Running OCR prediction...")
        result = ocr.predict(image_np)
        
        # Debug the result structure
        print(f"OCR result type: {type(result)}")
        print(f"OCR result length: {len(result) if isinstance(result, list) else 'N/A'}")
        
        # Extract text lines with robust handling of different result formats
        print("Extracting text lines...")
        lines = []
        
        if isinstance(result, list) and len(result) > 0:
            print(f"Processing {len(result[0])} detections...")
            
            # Debug the actual result structure
            print(f"Result[0] type: {type(result[0])}")
            if len(result[0]) > 0:
                print(f"First element type: {type(result[0][0])}")
                print(f"First element: {result[0][0]}")
            
            # Try different parsing approaches
            for i, detection in enumerate(result[0]):
                print(f"Detection {i+1}: {detection}")
                
                # Handle different possible result formats
                text = None
                
                # Approach 1: Standard PaddleOCR format [[coords], (text, confidence)]
                if isinstance(detection, list) and len(detection) >= 2:
                    if isinstance(detection[1], tuple) and len(detection[1]) >= 1:
                        text = detection[1][0]
                        print(f"  Found text in tuple: '{text}'")
                    elif isinstance(detection[1], str):
                        text = detection[1]
                        print(f"  Found text in string: '{text}'")
                    elif isinstance(detection[1], list) and len(detection[1]) >= 1:
                        text = detection[1][0]
                        print(f"  Found text in list: '{text}'")
                
                # Approach 2: Direct tuple format (text, confidence)
                elif isinstance(detection, tuple) and len(detection) >= 1:
                    text = detection[0]
                    print(f"  Found text in direct tuple: '{text}'")
                
                # Approach 3: Direct string
                elif isinstance(detection, str):
                    text = detection
                    print(f"  Found text in direct string: '{text}'")
                
                # Approach 4: Dictionary format
                elif isinstance(detection, dict):
                    text = detection.get('text', detection.get('content', ''))
                    print(f"  Found text in dict: '{text}'")
                
                if text:
                    cleaned_text = clean_line(text)
                    if cleaned_text:
                        lines.append(cleaned_text)
                        print(f"  ✅ Added cleaned line: '{cleaned_text}'")
                    else:
                        print(f"  ❌ Skipped empty/cleaned line: '{text}'")
                else:
                    print(f"  ❌ Could not extract text from detection: {detection}")
        
        print(f"✅ Extracted {len(lines)} text lines")
        
        # Show first 10 lines for debugging
        print("📝 First 10 OCR lines:")
        for i, line in enumerate(lines[:10]):
            print(f"  {i+1}: {line}")
        
        # Enhanced patient name extraction
        def extract_patient_name_improved(lines):
            """Enhanced patient name extraction with better Arabic support"""
            print("🔍 Extracting patient name...")
            
            # Look for patient name patterns
            name_patterns = [
                r'Patient[:\s]+([A-Za-z\u0600-\u06FF\s]+)',
                r'Name[:\s]+([A-Za-z\u0600-\u06FF\s]+)',
                r'Patient\'s Name[:\s]+([A-Za-z\u0600-\u06FF\s]+)',
                r'اسم المريض[:\s]+([A-Za-z\u0600-\u06FF\s]+)',
                r'([A-Za-z\u0600-\u06FF\s]{3,20})\s*\(Patient\)',
                r'([A-Za-z\u0600-\u06FF\s]{3,20})\s*\(Name\)',
            ]
            
            for line in lines:
                for pattern in name_patterns:
                    match = re.search(pattern, line, re.I)
                    if match:
                        name = match.group(1).strip()
                        if len(name) > 2:
                            print(f"✅ Found patient name: '{name}'")
                            return name
            
            # Look for Arabic names specifically
            for line in lines:
                arabic_chars = re.findall(r'[\u0600-\u06FF\s]+', line)
                if arabic_chars:
                    arabic_text = ' '.join(arabic_chars).strip()
                    if len(arabic_text) > 3 and not any(skip in arabic_text.lower() for skip in ["test", "result", "unit", "reference", "range", "report", "complete", "blood", "picture"]):
                        print(f"✅ Found Arabic name: '{arabic_text}'")
                        return arabic_text
            
            print("❌ No patient name found")
            return None

        # Enhanced table parsing for better lab test extraction
        def parse_tables_improved(lines):
            """Improved table parsing with better pattern matching"""
            general_tests = []
            differential_counts = []
            
            # Enhanced patterns for lab test detection
            test_patterns = [
                # Pattern 1: "Test Name: Value Unit (Reference Range)"
                r'^([A-Za-z\s\-\(\)]+(?:Count|Counts|%|#)?)\s*[:]\s*([\d.]+)\s*([A-Za-z\/%μ]+)\s*(?:\(([\d.-]+)\s*[-–]\s*([\d.-]+)\)|\(([^)]+)\))?',
                # Pattern 2: "Test Name Value Unit Reference Range"
                r'^([A-Za-z\s\-\(\)]+(?:Count|Counts|%|#)?)\s+([\d.]+)\s+([A-Za-z\/%μ]+)\s+([\d.-]+)\s*[-–]\s*([\d.-]+)',
                # Pattern 3: Tabular format with spaces
                r'^([A-Za-z\s\-\(\)]+(?:Count|Counts|%|#)?)\s+([\d.]+)\s+([A-Za-z\/%μ]+)\s+\(([\d.-]+)\s*[-–]\s*([\d.-]+)\)',
                # Pattern 4: Simple format with parentheses
                r'^([A-Za-z\s\-\(\)]+)\s+([\d.]+)\s+([A-Za-z\/%μ]+)\s+\(([^)]+)\)',
                # Pattern 5: Arabic test names
                r'^([\u0600-\u06FF\s\-\(\)]+)\s*[:]\s*([\d.]+)\s*([A-Za-z\/%μ]+)\s*(?:\(([\d.-]+)\s*[-–]\s*([\d.-]+)\)|\(([^)]+)\))?',
                # Pattern 6: Specific lab test patterns
                r'^(Haemoglobin|Hemoglobin|Hb)\s*[:]?\s*([\d.]+)\s*([A-Za-z\/%μ]+)',
                r'^(Platelet Count|Platelets)\s*[:]?\s*([\d.]+)\s*([A-Za-z\/%μ]+)',
                r'^(Total leucocyte count|WBC|White Blood Cells)\s*[:]?\s*([\d.]+)\s*([A-Za-z\/%μ]+)',
                r'^(Lymphocytes|Neutrophils|Monocytes|Eosinophils|Basophils)\s*[:]?\s*([\d.]+)\s*([A-Za-z\/%μ]+)',
            ]
            
            differential_keywords = {"neutrophils", "lymphocytes", "monocytes", "eosinophils", "basophils", "stab", "segmented"}
            skip_headers = {"test name", "result", "unit", "reference interval", "normal range", "percent values", "absolute values", "complete blood picture", "haematology examination", "clinical chemistry report", "test", "result", "unit", "ref.range", "c.b.c.", "differential leucocyte count"}

            def is_number(s):
                try:
                    float(s.replace(",", ".").split()[0])
                    return True
                except:
                    return False

            def get_status(val, ref, sex=None):
                try:
                    val = float(val.replace(",", ".").split()[0])
                    if "M:" in ref and "F:" in ref and sex:
                        ref_part = ref.split("F:")[1] if sex.lower() == "female" else ref.split("F:")[0].split("M:")[1]
                    else:
                        ref_part = ref
                    match = re.search(r"(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)", ref_part)
                    if match:
                        low, high = float(match.group(1)), float(match.group(2))
                        if val < low:
                            return "Low"
                        elif val > high:
                            return "High"
                        else:
                            return "Normal"
                    return "Normal"
                except:
                    return "Normal"

            # Process each line
            for i, line in enumerate(lines):
                line = line.strip()
                
                # Skip headers and empty lines
                if (not line or 
                    line.lower() in skip_headers or 
                    len(line) < 3 or
                    re.search(r"^[A-Z\s]+$", line) and len(line) < 10):
                    continue
                
                print(f"🔍 Processing line {i+1}: '{line}'")
                
                # Try to match test patterns
                matched = False
                for pattern_idx, pattern in enumerate(test_patterns):
                    match = re.match(pattern, line, re.I)
                    if match:
                        test_name = match.group(1).strip()
                        value = match.group(2)
                        unit = match.group(3)
                        ref_range = match.group(4) if match.group(4) else ""
                        
                        print(f"  ✅ Pattern {pattern_idx+1} matched: {test_name} = {value} {unit}")
                        
                        # Skip if it's a differential count
                        if any(keyword in test_name.lower() for keyword in differential_keywords):
                            differential_counts.append([test_name, value, unit, ref_range, get_status(value, ref_range)])
                        else:
                            general_tests.append([test_name, value, unit, ref_range, get_status(value, ref_range)])
                        
                        matched = True
                        break
                
                if not matched:
                    # Try to extract simple test data
                    parts = line.split()
                    if len(parts) >= 3 and is_number(parts[1]):
                        test_name = parts[0]
                        value = parts[1]
                        unit = parts[2] if len(parts) > 2 else ""
                        
                        print(f"  ✅ Simple extraction: {test_name} = {value} {unit}")
                        
                        if any(keyword in test_name.lower() for keyword in differential_keywords):
                            differential_counts.append([test_name, value, unit, "", "Normal"])
                        else:
                            general_tests.append([test_name, value, unit, "", "Normal"])
                    else:
                        print(f"  ❌ No pattern matched for line: '{line}'")
            
            return general_tests, differential_counts

        # Extract patient name
        patient_name = extract_patient_name_improved(lines)
        
        # Parse lab test data
        general_tests, differential_counts = parse_tables_improved(lines)
        
        # Calculate quality score
        quality_score = 0
        if patient_name:
            quality_score += 30
        if general_tests:
            quality_score += 40
        if differential_counts:
            quality_score += 30
        
        print(f"❌ No general tests found." if not general_tests else f"✅ Found {len(general_tests)} general tests")
        print(f"❌ No differential counts found." if not differential_counts else f"✅ Found {len(differential_counts)} differential counts")
        
        return {
            "patient_name": patient_name or "Not Found",
            "general_tests": general_tests,
            "differential_counts": differential_counts,
            "ocr_lines": lines,
            "processing_steps": preprocess_result["processing_steps"],
            "quality_score": quality_score
        }
        
    except Exception as e:
        print(f"OCR processing failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "error": f"OCR processing failed: {str(e)}",
            "patient_name": None,
            "general_tests": [],
            "differential_counts": [],
            "ocr_lines": [],
            "processing_steps": [],
            "quality_score": 0
        }

# Export the improved function
process_ocr_image = process_ocr_image_improved 