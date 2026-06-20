import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ocr_service import extract_text_fallback, parse_tables

def main():
    print("Testing Regex Parsing on Fallback Data")
    
    # Get mock lines
    lines = extract_text_fallback(None)
    
    print(f"\nProcessing {len(lines)} lines...")
    
    # Run parsing
    general_tests, differential_counts = parse_tables(lines)
    
    print("\nRESULTS:")
    print(f"General Tests: {len(general_tests)}")
    for t in general_tests:
        print(f" - {t['name']}: {t['value']} {t['unit']} (Ref: {t['reference_range']})")
        
    print(f"\nDifferential Counts: {len(differential_counts)}")
    for t in differential_counts:
        print(f" - {t['name']}: {t['value']} {t['unit']}")

if __name__ == "__main__":
    main()
