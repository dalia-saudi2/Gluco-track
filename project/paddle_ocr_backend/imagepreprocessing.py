from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np
from io import BytesIO

def validate_image(img: Image.Image):
    """Validate image resolution and aspect ratio."""
    width, height = img.size
    if width < 300 or height < 300:
        return False, "Low resolution"
    ratio = width / height
    if ratio < 0.5 or ratio > 2.0:
        return False, "Bad aspect ratio"
    return True, None

def normalize_image(img: Image.Image):
    """Normalize image by ensuring RGB format."""
    return img.convert("RGB").copy()

def desaturate_image(img: Image.Image):
    """Convert to grayscale and back to RGB for OCR compatibility."""
    return ImageOps.grayscale(img).convert("RGB")

def enhance_contrast(img: Image.Image):
    """Increase contrast to improve text readability, optimized for Arabic text."""
    enhancer = ImageEnhance.Contrast(img)
    # Use a more moderate contrast enhancement for better Arabic text recognition
    return enhancer.enhance(1.3)

def reduce_noise(img: Image.Image):
    """Apply Gaussian blur to reduce noise while preserving text clarity."""
    return img.filter(ImageFilter.GaussianBlur(radius=0.3))

def sharpen_image(img: Image.Image):
    """Sharpen image by resizing up and down, optimized for text preservation."""
    width, height = img.size
    resize_up_width = int(width * 1.1)  # Reduced scaling for better text preservation
    img_up = img.resize((resize_up_width, int(height * 1.1)), Image.LANCZOS)
    img_down = img_up.resize((width, height), Image.LANCZOS)
    return img_down

def resize_image(img: Image.Image, max_width=1200):  # Increased max width for better detail
    """Resize image to a maximum width while preserving aspect ratio."""
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)
    return img

def remove_shadows(img: Image.Image):
    """Enhanced shadow removal for better text visibility."""
    # Convert to LAB color space for better shadow detection
    img_lab = img.convert('LAB')
    l, a, b = img_lab.split()
    
    # Enhance lightness channel
    enhancer = ImageEnhance.Brightness(l)
    l_enhanced = enhancer.enhance(1.1)
    
    # Reconstruct image
    img_enhanced = Image.merge('LAB', (l_enhanced, a, b))
    return img_enhanced.convert('RGB')

def preprocess_image_from_bytes(image_bytes: bytes):
    """Preprocess an image from bytes for OCR, optimized for Arabic lab reports."""
    processing_steps = []
    quality_score = 0

    try:
        # Load image from bytes
        processing_steps.append("Loading and RGB conversion")
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        quality_score += 10

        # Validation
        processing_steps.append("Image validation")
        valid, error = validate_image(img)
        if not valid:
            raise ValueError(f"Invalid image: {error}")
        quality_score += 10

        # Resize with higher resolution for better Arabic text recognition
        processing_steps.append("Resizing with enhanced resolution")
        img = resize_image(img, max_width=1200)
        quality_score += 15

        # Normalization
        processing_steps.append("Normalization")
        img = normalize_image(img)
        quality_score += 10

        # Enhanced shadow removal for better text visibility
        processing_steps.append("Enhanced shadow removal")
        img = remove_shadows(img)
        quality_score += 15

        # Grayscale with better preservation
        processing_steps.append("Grayscale simulation (desaturate)")
        img = desaturate_image(img)
        quality_score += 10

        # Moderate contrast enhancement for Arabic text
        processing_steps.append("Contrast enhancement (optimized for Arabic)")
        img = enhance_contrast(img)
        quality_score += 15

        # Light noise reduction to preserve text clarity
        processing_steps.append("Light noise reduction")
        img = reduce_noise(img)
        quality_score += 10

        # Gentle sharpening for text preservation
        processing_steps.append("Gentle image sharpening")
        img = sharpen_image(img)
        quality_score += 10

        # Deskew (rely on PaddleOCR)
        processing_steps.append("Deskew (placeholder, use PaddleOCR textline_orientation)")
        quality_score += 10

        quality_score = min(quality_score, 100)

        return {
            "processed_image": img,
            "processing_steps": processing_steps,
            "quality_score": quality_score,
        }
    except Exception as e:
        return {
            "processed_image": None,
            "processing_steps": [f"Preprocessing failed: {str(e)}"],
            "quality_score": 0,
        }