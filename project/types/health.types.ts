export type HealthPermissionStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'permanently_denied'
  | 'unavailable';

export interface HealthTodayData {
  sleepHours: number;
  steps: number;
  caloriesBurned: number;
}

export interface HealthGoalData {
  sleepHours: number;
  steps: number;
  caloriesBurned: number;
}

export interface DailyMetricValue {
  date: string; // ISO format string: YYYY-MM-DD
  value: number;
}

export interface HealthHistoryData {
  sleep: DailyMetricValue[];
  steps: DailyMetricValue[];
  calories: DailyMetricValue[];
}

export interface HealthPeriodSummary {
  period: 'day' | 'week' | 'month';
  start_date: string;
  end_date: string;
  days_with_data: number;
  total_steps: number;
  avg_steps: number;
  avg_sleep_hours: number;
  total_calories: number;
  avg_calories: number;
}

export interface HealthSyncState {
  lastSyncedAt: string | null;
  syncing: boolean;
  syncError: string | null;
}

export interface HealthState {
  loading: boolean;
  error: string | null;
  permissionStatus: HealthPermissionStatus;
  today: HealthTodayData;
  history7d: HealthHistoryData;
  history30d: HealthHistoryData;
  isMockData: boolean;
}
