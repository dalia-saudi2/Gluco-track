import type { GlucoseClassification, GlucoseReadingType } from '../types/glucoseReading';

export function classifyGlucoseReading(
  value: number | null,
  readingType: GlucoseReadingType
): GlucoseClassification | null {
  if (value == null || Number.isNaN(value)) return null;

  if (readingType === 'fasting') {
    if (value < 70) return { status: 'low', label: 'Low — below 70 mg/dL', color: 'red' };
    if (value <= 100) return { status: 'normal', label: 'Normal fasting range', color: 'green' };
    if (value <= 125) return { status: 'elevated', label: 'Elevated — pre-diabetic range', color: 'amber' };
    return { status: 'high', label: 'High — diabetic range', color: 'red' };
  }

  if (readingType === 'post_meal') {
    if (value < 70) return { status: 'low', label: 'Low — below 70 mg/dL', color: 'red' };
    if (value <= 140) return { status: 'normal', label: 'Normal post-meal range', color: 'green' };
    if (value <= 199) return { status: 'elevated', label: 'Elevated — monitor closely', color: 'amber' };
    return { status: 'high', label: 'High — above 200 mg/dL', color: 'red' };
  }

  if (value < 70) return { status: 'low', label: 'Low — hypoglycemia risk', color: 'red' };
  if (value <= 140) return { status: 'normal', label: 'In range', color: 'green' };
  if (value <= 180) return { status: 'elevated', label: 'Elevated — above target', color: 'amber' };
  return { status: 'high', label: 'High — above 180 mg/dL', color: 'red' };
}

export function classificationColor(color: GlucoseClassification['color']): string {
  if (color === 'green') return '#16a34a';
  if (color === 'amber') return '#d97706';
  return '#dc2626';
}

export function formatReadingType(type: GlucoseReadingType): string {
  const map: Record<GlucoseReadingType, string> = {
    fasting: 'Fasting',
    post_meal: 'Post-meal',
    random: 'Random',
    bedtime: 'Bedtime',
  };
  return map[type];
}

export function formatMeasuredAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
