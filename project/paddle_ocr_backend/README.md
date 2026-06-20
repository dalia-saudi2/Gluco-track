# Enhanced PaddleOCR Backend for Arabic Lab Reports

A robust backend for OCR processing of medical lab test images using PaddleOCR with enhanced Arabic text support, optimized for extracting patient names and medical data from Arabic lab reports.

## 🚀 Key Improvements

### Arabic Name Extraction
- **Enhanced Arabic Text Recognition**: Improved OCR configuration for mixed Arabic-English documents
- **Smart Name Detection**: Multiple strategies to find Arabic patient names in lab reports
- **Bilingual Support**: Handles both Arabic and English names in the same document
- **Layout Awareness**: Understands typical lab report layouts to locate patient information

### Image Processing Enhancements
- **Arabic-Optimized Preprocessing**: Better contrast and noise reduction for Arabic text
- **Higher Resolution Processing**: Increased image resolution for better detail preservation
- **Enhanced Shadow Removal**: Improved visibility of text in challenging lighting conditions

## 📁 Folder Structure
```
paddle_ocr_backend/
├── main.py                   # FastAPI application with enhanced endpoints
├── ocr_service.py           # Enhanced OCR processing with Arabic support
├── imagepreprocessing.py    # Arabic-optimized image preprocessing
├── test_arabic_ocr.py      # Test script for Arabic name extraction
├── start_server.py          # Server startup script
├── requirements.txt         # Python dependencies
├── README.md               # This file
└── uploads/                # Test images directory
```

## 🛠️ Setup

### 1. Install Python 3.8+
Ensure Python 3.8 or higher is installed.

### 2. Create Virtual Environment
```bash
python -m venv paddle_env
source paddle_env/bin/activate  # On Windows: paddle_env\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

**Includes**: fastapi, uvicorn, paddleocr, paddlepaddle, pillow, numpy, tabulate, python-multipart, opencv-python

## 🚀 Running the Server

### Quick Start
```bash
python start_server.py
```

### Manual Start
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📡 API Endpoints

### POST /ocr
Process lab report images for Arabic name extraction and medical data parsing.

**Accepts**:
- `file`: Multipart form file upload
- `image_base64`: Base64 encoded image data

**Returns**: JSON with parsed lab report data
```json
{
  "patient_name": "الاستاذه / مريم شريف البرنس",
  "general_tests": [
    ["Calcium -Total (serum)", "9.9", "mg/dL", "8.4 - 10.2", "Normal"],
    ["IRON", "17.0", "ug/dL", "37.0 - 160.0", "Low"]
  ],
  "differential_counts": [],
  "ocr_lines": ["Patient's Name الاستاذه / مريم شريف البرنس", ...],
  "processing_steps": ["Loading and RGB conversion", ...],
  "quality_score": 95
}
```

### GET /test-ocr
Test endpoint that processes a sample image from the uploads directory.

### GET /health
Health check endpoint.

## 🧪 Testing

### Test Arabic Name Extraction
```bash
python test_arabic_ocr.py
```

This will test the enhanced OCR with a sample lab report image and show:
- Patient name extraction results
- First 10 OCR lines for debugging
- Lab test results
- Quality score
- Processing steps

### Test with Your Own Image
1. Place your lab report image in the `uploads/` directory
2. Update the test script to use your image path
3. Run the test script

## 🔧 Features

### Enhanced Arabic OCR
- **Multi-language Support**: Handles Arabic and English text in the same document
- **Layout Detection**: Understands lab report structure to locate patient information
- **Name Pattern Recognition**: Identifies Arabic name patterns and titles
- **Bilingual Name Extraction**: Extracts both Arabic and English names

### Improved Image Processing
- **Arabic Text Optimization**: Enhanced preprocessing for better Arabic character recognition
- **Higher Resolution**: Increased image resolution for better detail preservation
- **Enhanced Shadow Removal**: Better text visibility in challenging conditions
- **Moderate Contrast Enhancement**: Optimized for Arabic text clarity

### Smart Name Extraction
- **Multiple Strategies**: Uses various approaches to find patient names
- **Context Awareness**: Understands lab report layout and structure
- **Arabic Character Detection**: Specifically looks for Arabic Unicode characters
- **Bilingual Support**: Handles names in both Arabic and English

## 📊 Example Results

For the lab report image showing "الاستاذه / مريم شريف البرنس (Ms. Maryam Sharif Al-Prins)", the enhanced OCR will:

1. **Detect Arabic Text**: Recognize Arabic characters in the patient information section
2. **Extract Full Name**: Capture both Arabic and English versions of the name
3. **Parse Lab Results**: Extract calcium, iron, and other test results
4. **Provide Quality Score**: Assess the processing quality

## 🔍 Debugging

### Enable Detailed Logging
The server provides detailed console output showing:
- OCR processing steps
- Extracted text lines
- Name extraction attempts
- Quality scores

### Common Issues
1. **Low Quality Images**: Ensure images are high resolution (minimum 300x300 pixels)
2. **Poor Lighting**: The enhanced preprocessing helps with shadow and contrast issues
3. **Complex Layouts**: The system is optimized for typical lab report layouts

## 🚀 Development

### Adding New Test Images
1. Place images in the `uploads/` directory
2. Update test scripts to use your image paths
3. Run tests to verify Arabic name extraction

### Customizing Name Extraction
Edit the `extract_patient_name()` function in `ocr_service.py` to add:
- New Arabic name patterns
- Additional keywords for name identification
- Custom validation rules

### Improving Image Processing
Modify `imagepreprocessing.py` to:
- Adjust contrast enhancement levels
- Change noise reduction parameters
- Add new preprocessing steps

## 📝 Notes

- **High Resolution**: Use high-resolution images for optimal Arabic text recognition
- **Mixed Content**: The system handles Arabic-English mixed documents effectively
- **Lab Report Layout**: Optimized for typical medical lab report structures
- **Arabic Names**: Enhanced support for Arabic names with titles and honorifics

## 🤝 Contributing

1. Test with your own lab report images
2. Report any issues with Arabic name extraction
3. Suggest improvements for specific lab report formats
4. Share feedback on OCR accuracy and performance
