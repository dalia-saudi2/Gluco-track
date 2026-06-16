/** Map UI labels to API / database enum values (Groups 1–5). */

export const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'العربية', value: 'ar' },
] as const;

export const MARITAL_OPTIONS = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
  { label: 'Other', value: 'other' },
] as const;

export const DIABETES_TYPE_OPTIONS = [
  { label: 'Type 1', value: 'type1' },
  { label: 'Type 2', value: 'type2' },
  { label: 'Not sure', value: 'unknown' },
] as const;

export const INSULIN_REGIMEN_OPTIONS = [
  { label: 'Basal only', value: 'basal' },
  { label: 'Basal-Bolus', value: 'basal_bolus' },
  { label: 'Pump', value: 'pump' },
] as const;

export const DIET_QUALITY_OPTIONS = [
  { label: 'Poor', value: 'poor' },
  { label: 'Fair', value: 'fair' },
  { label: 'Good', value: 'good' },
  { label: 'Excellent', value: 'excellent' },
] as const;

export const SMOKING_LABELS: Record<string, string> = {
  never: 'Never smoked',
  former: 'Former smoker',
  current: 'Current smoker',
};

export const ALCOHOL_LABELS: Record<string, string> = {
  none: "I don't drink",
  light: '1–7 drinks/week',
  moderate: '8–14 drinks/week',
  heavy: '15+ drinks/week',
};

export function toApiGender(display: string): string {
  return display.toLowerCase() === 'female' ? 'female' : 'male';
}

export function toApiEthnicity(display: string): string {
  return display.toLowerCase();
}

export function toApiEmployment(display: string): string {
  const v = display.toLowerCase();
  if (v.includes('student') || v.includes('part')) return 'employed_part';
  if (v.includes('unemploy')) return 'unemployed';
  if (v.includes('retir')) return 'retired';
  return 'employed_full';
}

export function educationLevelToOrdinal(degree: string): number {
  const map: Record<string, number> = {
    'No High School': 0,
    'High School Diploma': 1,
    "Associate's Degree": 2,
    "Bachelor's Degree": 3,
    "Master's Degree": 4,
    'Doctorate / Professional': 4,
  };
  return map[degree] ?? 2;
}

export function incomeToOrdinal(display: string): number {
  if (display.includes('Under')) return 0;
  if (display.includes('25')) return 1;
  if (display.includes('50') && !display.includes('100')) return 2;
  return 3;
}
