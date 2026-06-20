import { environmentConfig } from '../config/environment';

export interface MedicalReportExtraction {
  id?: number;
  patient_id?: string | number;
  filename?: string;
  structured?: Record<string, unknown>;
  raw_text?: string[];
  confidence?: number;
  [key: string]: unknown;
}

export interface ScanResult {
    rawText: string[];
    structured: Record<string, string | number | { value: number; unit: string; reference_range: string }>;
    confidence: number;
    aiAnalysis?: {
        risk: string;
        level: string;
        action: string;
    };
    savedExtraction?: MedicalReportExtraction;
}

export interface ScanOptions {
    patientId?: string;
    filename?: string;
}

export async function checkOcrServiceAvailable(): Promise<boolean> {
    try {
        const res = await fetch(`${environmentConfig.getApiBaseUrl()}/health/ocr`, { method: 'GET' });
        if (!res.ok) return false;
        const data = await res.json();
        return data.ok === true;
    } catch {
        return false;
    }
}

export async function scanDocumentWithPaddle(
    imageUri: string,
    options?: ScanOptions
): Promise<ScanResult> {
    console.log(`[OCR] Scanning image: ${imageUri}`);

    const formData = new FormData();
    const filename = options?.filename || imageUri.split('/').pop() || 'report.jpg';
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    if (imageUri.startsWith('blob:')) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
    } else {
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type: type,
        } as any);
    }

    if (options?.patientId) {
        formData.append('patient_id', options.patientId);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 900_000);

    try {
        const response = await fetch(`${environmentConfig.getApiBaseUrl()}/ocr/scan`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.detail || errorData.message || `Server Error ${response.status}`;
            throw new Error(message);
        }

        const data = await response.json();
        const confRaw = data.confidence;
        let confidence = 0.9;
        if (typeof confRaw === 'number') {
            confidence = confRaw <= 1 ? confRaw : confRaw / 100;
        } else if (typeof confRaw === 'string') {
            const n = parseFloat(confRaw.replace('%', ''));
            confidence = Number.isFinite(n) ? (n <= 1 ? n : n / 100) : 0.9;
        }
        return {
            rawText: data.rawText || [],
            structured: data.structured || {},
            confidence,
            aiAnalysis: {
                risk: data.risk,
                level: data.level,
                action: data.action
            },
            savedExtraction: data.savedExtraction || undefined,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(
                'OCR timed out. Ensure Paddle OCR is running on port 8001 and wait for the first scan to finish.'
            );
        }
        console.error("OCR Service Error:", error);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
