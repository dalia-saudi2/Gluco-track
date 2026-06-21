import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiClient } from '../config/api';
import {
  HealthHistoryData,
  HealthPeriodSummary,
  HealthTodayData,
} from '../types/health.types';

const PENDING_SYNC_KEY = '@patient_portal:health_sync_pending';
const LAST_SYNC_KEY = '@patient_portal:health_sync_last';

export type HealthSyncRecord = {
  activity_date: string;
  steps: number;
  sleep_hours: number;
  calories_burned: number;
};

function deviceSource(): string {
  if (Platform.OS === 'android') return 'health_connect';
  if (Platform.OS === 'ios') return 'healthkit';
  return 'simulation';
}

function recordsFromHistory(history: HealthHistoryData): HealthSyncRecord[] {
  const byDate = new Map<string, HealthSyncRecord>();

  for (const point of history.steps) {
    byDate.set(point.date, {
      activity_date: point.date,
      steps: point.value,
      sleep_hours: 0,
      calories_burned: 0,
    });
  }

  for (const point of history.sleep) {
    const existing = byDate.get(point.date) ?? {
      activity_date: point.date,
      steps: 0,
      sleep_hours: 0,
      calories_burned: 0,
    };
    existing.sleep_hours = point.value;
    byDate.set(point.date, existing);
  }

  for (const point of history.calories) {
    const existing = byDate.get(point.date) ?? {
      activity_date: point.date,
      steps: 0,
      sleep_hours: 0,
      calories_burned: 0,
    };
    existing.calories_burned = point.value;
    byDate.set(point.date, existing);
  }

  return Array.from(byDate.values());
}

function todayRecord(today: HealthTodayData): HealthSyncRecord {
  const activity_date = new Date().toISOString().split('T')[0];
  return {
    activity_date,
    steps: today.steps,
    sleep_hours: today.sleepHours,
    calories_burned: today.caloriesBurned,
  };
}

function mergeRecords(...lists: HealthSyncRecord[][]): HealthSyncRecord[] {
  const map = new Map<string, HealthSyncRecord>();
  for (const list of lists) {
    for (const row of list) {
      map.set(row.activity_date, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.activity_date.localeCompare(b.activity_date));
}

export function historyToSyncPayload(
  today: HealthTodayData,
  history7d: HealthHistoryData,
  history30d: HealthHistoryData
): HealthSyncRecord[] {
  return mergeRecords(
    recordsFromHistory(history30d),
    recordsFromHistory(history7d),
    [todayRecord(today)]
  ).map((row) => ({
    ...row,
    steps: Math.round(row.steps ?? 0),
    calories_burned: Math.round(row.calories_burned ?? 0),
    sleep_hours: Number(row.sleep_hours ?? 0),
  }));
}

function serverHistoryToClient(data: {
  steps: { date: string; value: number }[];
  sleep: { date: string; value: number }[];
  calories: { date: string; value: number }[];
}): HealthHistoryData {
  return {
    steps: data.steps.map((p) => ({ date: p.date, value: p.value })),
    sleep: data.sleep.map((p) => ({ date: p.date, value: p.value })),
    calories: data.calories.map((p) => ({ date: p.date, value: p.value })),
  };
}

function mergeHistory(device: HealthHistoryData, server: HealthHistoryData): HealthHistoryData {
  const mergeMetric = (
    devicePoints: { date: string; value: number }[],
    serverPoints: { date: string; value: number }[]
  ) => {
    const map = new Map<string, number>();
    for (const p of serverPoints) map.set(p.date, p.value);
    for (const p of devicePoints) {
      if (p.value > 0 || !map.has(p.date)) {
        map.set(p.date, p.value);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  };

  return {
    steps: mergeMetric(device.steps, server.steps),
    sleep: mergeMetric(device.sleep, server.sleep),
    calories: mergeMetric(device.calories, server.calories),
  };
}

class HealthSyncService {
  async getLastSyncedAt(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNC_KEY);
  }

  async queuePending(records: HealthSyncRecord[]): Promise<void> {
    const existing = await this.getPending();
    const merged = mergeRecords(existing, records);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(merged));
  }

  async getPending(): Promise<HealthSyncRecord[]> {
    const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as HealthSyncRecord[];
    } catch {
      return [];
    }
  }

  async clearPending(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  }

  async syncToServer(
    patientId: number,
    today: HealthTodayData,
    history7d: HealthHistoryData,
    history30d: HealthHistoryData
  ): Promise<{ synced_count: number; last_synced_at?: string } | null> {
    const pending = await this.getPending();
    const records = mergeRecords(
      pending,
      historyToSyncPayload(today, history7d, history30d)
    );

    if (!records.length) return null;

    try {
      const result = await apiClient.syncHealthActivity(patientId, {
        records,
        source: deviceSource(),
      });
      await this.clearPending();
      if (result?.last_synced_at) {
        await AsyncStorage.setItem(LAST_SYNC_KEY, result.last_synced_at);
      }
      return result;
    } catch (error) {
      console.warn('Health sync failed, queueing for retry:', error);
      await this.queuePending(records);
      throw error;
    }
  }

  async flushPending(patientId: number): Promise<void> {
    const pending = await this.getPending();
    if (!pending.length) return;
    const result = await apiClient.syncHealthActivity(patientId, {
      records: pending,
      source: deviceSource(),
    });
    await this.clearPending();
    if (result?.last_synced_at) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, result.last_synced_at);
    }
  }

  async fetchHistory(patientId: number, days: 7 | 30): Promise<HealthHistoryData> {
    const data = await apiClient.getHealthActivityHistory(patientId, days);
    return serverHistoryToClient(data);
  }

  async fetchSummaries(patientId: number): Promise<{
    day: HealthPeriodSummary;
    week: HealthPeriodSummary;
    month: HealthPeriodSummary;
  }> {
    const [day, week, month] = await Promise.all([
      apiClient.getHealthActivitySummary(patientId, 'day'),
      apiClient.getHealthActivitySummary(patientId, 'week'),
      apiClient.getHealthActivitySummary(patientId, 'month'),
    ]);
    return { day, week, month };
  }

  mergeDeviceWithServer(device: HealthHistoryData, server: HealthHistoryData): HealthHistoryData {
    return mergeHistory(device, server);
  }
}

export const healthSyncService = new HealthSyncService();
