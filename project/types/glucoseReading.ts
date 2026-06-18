export type GlucoseReadingType = 'fasting' | 'post_meal' | 'random' | 'bedtime';

export type GlucoseStatus = 'low' | 'normal' | 'elevated' | 'high';

export type GlucoseReadingSource = 'manual' | 'device_sync' | 'ocr';

export type GlucoseClassification = {
  status: GlucoseStatus;
  label: string;
  color: 'red' | 'green' | 'amber';
};

export type GlucoseReading = {
  id: number;
  patient_id: number;
  value_mgdl: number;
  reading_type: GlucoseReadingType;
  measured_at: string;
  status: GlucoseStatus;
  notes?: string | null;
  source: GlucoseReadingSource;
  device_id?: string | null;
  created_at: string;
};

export type GlucoseReadingListResponse = {
  items: GlucoseReading[];
  page: number;
  limit: number;
  total: number;
};

export type GlucoseDashboardDayPoint = {
  day: string;
  value: number | null;
  date: string;
};

export type GlucoseWeeklySummary = {
  week_start: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  readings_count: number;
  days_in_range: number;
  days_elevated: number;
  days_high: number;
};

export type GlucoseDashboardData = {
  days: GlucoseDashboardDayPoint[];
  weekly_summary: GlucoseWeeklySummary | null;
  today_value: number | null;
  today_day: string;
  today_status: GlucoseStatus | null;
};

export type GlucoseReadingCreatePayload = {
  value_mgdl: number;
  reading_type: GlucoseReadingType;
  measured_at: string;
  notes?: string;
  source: 'manual';
};

export const READING_TYPE_OPTIONS: { value: GlucoseReadingType; label: string }[] = [
  { value: 'fasting', label: 'Fasting' },
  { value: 'post_meal', label: 'Post-meal' },
  { value: 'random', label: 'Random' },
  { value: 'bedtime', label: 'Bedtime' },
];

export const STATUS_LABELS: Record<GlucoseStatus, string> = {
  low: 'Low',
  normal: 'In range',
  elevated: 'Elevated',
  high: 'High',
};
