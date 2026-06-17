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

export interface HealthState {
  loading: boolean;
  error: string | null;
  permissionStatus: HealthPermissionStatus;
  today: HealthTodayData;
  history7d: HealthHistoryData;
  history30d: HealthHistoryData;
  isMockData: boolean;
}
