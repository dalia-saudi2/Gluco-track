import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityWeekSummary, DailyActivityLog } from '../types/activityLog';

const storageKey = (patientId: number) => `@patient_portal:activity_log:${patientId}`;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function minutesToIntensity(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 20;
  if (minutes < 40) return 40;
  if (minutes < 60) return 60;
  if (minutes < 90) return 80;
  return 100;
}

export function estimateCaloriesFromMinutes(minutes: number): number {
  return Math.round(minutes * 5.5);
}

async function readAll(patientId: number): Promise<Record<string, DailyActivityLog>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(patientId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DailyActivityLog>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAll(patientId: number, data: Record<string, DailyActivityLog>): Promise<void> {
  await AsyncStorage.setItem(storageKey(patientId), JSON.stringify(data));
}

function lastSevenDays(): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
}

export const activityLogService = {
  async getWeekSummary(patientId: number): Promise<ActivityWeekSummary> {
    const logs = await readAll(patientId);
    const days = lastSevenDays().map((date) => {
      const key = toDateKey(date);
      const entry = logs[key];
      const minutes = entry?.minutes ?? 0;
      return {
        date: key,
        dayLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        minutes,
        intensity: minutesToIntensity(minutes),
      };
    });

    const activeDays = days.filter((d) => d.minutes > 0).length;
    const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
    const totalCalories = days.reduce((sum, d) => {
      const entry = logs[d.date];
      return sum + (entry?.calories ?? estimateCaloriesFromMinutes(d.minutes));
    }, 0);

    return { days, activeDays, totalMinutes, totalCalories };
  },

  async getDay(patientId: number, dateKey: string): Promise<DailyActivityLog | null> {
    const logs = await readAll(patientId);
    return logs[dateKey] ?? null;
  },

  async saveDay(
    patientId: number,
    payload: { date: string; minutes: number; calories?: number; note?: string }
  ): Promise<ActivityWeekSummary> {
    const logs = await readAll(patientId);
    const minutes = Math.max(0, Math.min(600, Math.round(payload.minutes)));
    const calories =
      payload.calories !== undefined && payload.calories !== null
        ? Math.max(0, Math.round(payload.calories))
        : estimateCaloriesFromMinutes(minutes);

    logs[payload.date] = {
      date: payload.date,
      minutes,
      calories,
      note: payload.note?.trim() || undefined,
    };

    await writeAll(patientId, logs);
    return this.getWeekSummary(patientId);
  },

  todayKey(): string {
    return toDateKey(new Date());
  },
};
