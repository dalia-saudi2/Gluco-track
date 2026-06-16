/** Lab OCR field metadata for review & health features prefill */

export type LabFieldKey =
  | 'cholesterol_total'
  | 'ldl_cholesterol'
  | 'hdl_cholesterol'
  | 'triglycerides'
  | 'systolic_bp'
  | 'diastolic_bp'
  | 'heart_rate';

export type LabFieldMeta = {
  key: LabFieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  placeholder: string;
};

export const LAB_OCR_FIELDS: LabFieldMeta[] = [
  { key: 'cholesterol_total', label: 'Total Cholesterol', unit: 'mg/dL', min: 100, max: 350, placeholder: 'e.g. 180' },
  { key: 'ldl_cholesterol', label: 'LDL Cholesterol', unit: 'mg/dL', min: 50, max: 250, placeholder: 'e.g. 110' },
  { key: 'hdl_cholesterol', label: 'HDL Cholesterol', unit: 'mg/dL', min: 20, max: 100, placeholder: 'e.g. 55' },
  { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', min: 50, max: 500, placeholder: 'e.g. 140' },
  { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', min: 80, max: 200, placeholder: 'e.g. 120' },
  { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', min: 50, max: 130, placeholder: 'e.g. 80' },
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', min: 45, max: 120, placeholder: 'e.g. 72' },
];

export type ExtractedLabField = {
  value: number | null;
  confidence: number;
  status: 'ok' | 'low' | 'missing';
};

export type OnboardingProgress = {
  demographics_done: boolean;
  diabetic_path_done: boolean;
  clinical_profile_done: boolean;
  lab_opt_in: boolean | null;
  lab_upload_id: number | null;
  lab_review_done: boolean;
  health_features_done: boolean;
  onboarding_completed: boolean;
};

export const SMOKING_OPTIONS = ['never', 'former', 'current'] as const;
export const ALCOHOL_OPTIONS = ['none', 'light', 'moderate', 'heavy'] as const;
