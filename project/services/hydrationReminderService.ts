import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelHydrationNotifications,
  scheduleHydrationReminders,
} from './hydrationNotificationService';

export const HYDRATION_REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000;

const drinkKey = (patientId: number) => `@patient_portal:hydration_last_drink:${patientId}`;
const playedPeriodKey = (patientId: number) =>
  `@patient_portal:hydration_last_played_period:${patientId}`;

export type HydrationReminderState = {
  lastDrinkAt: number | null;
  remainingMs: number;
  isDue: boolean;
  reminderPeriod: number;
  nextReminderAt: number | null;
};

function parseIso(iso: string): number | null {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function computeReminderState(
  lastDrinkAt: number | null,
  now: number,
  lastPlayedPeriod: number
): HydrationReminderState & { shouldPlay: boolean; nextPlayedPeriod: number } {
  if (lastDrinkAt == null) {
    return {
      lastDrinkAt: null,
      remainingMs: HYDRATION_REMINDER_INTERVAL_MS,
      isDue: false,
      reminderPeriod: 0,
      nextReminderAt: null,
      shouldPlay: false,
      nextPlayedPeriod: lastPlayedPeriod,
    };
  }

  const elapsed = Math.max(0, now - lastDrinkAt);
  const reminderPeriod = Math.floor(elapsed / HYDRATION_REMINDER_INTERVAL_MS);
  const isDue = reminderPeriod >= 1;
  const remainder = elapsed % HYDRATION_REMINDER_INTERVAL_MS;

  const nextReminderAt = isDue
    ? lastDrinkAt + (reminderPeriod + 1) * HYDRATION_REMINDER_INTERVAL_MS
    : lastDrinkAt + HYDRATION_REMINDER_INTERVAL_MS;

  const remainingMs = isDue
    ? Math.max(0, nextReminderAt - now)
    : HYDRATION_REMINDER_INTERVAL_MS - remainder;

  const shouldPlay = reminderPeriod >= 1 && reminderPeriod > lastPlayedPeriod;

  return {
    lastDrinkAt,
    remainingMs,
    isDue,
    reminderPeriod,
    nextReminderAt,
    shouldPlay,
    nextPlayedPeriod: shouldPlay ? reminderPeriod : lastPlayedPeriod,
  };
}

export function formatHydrationCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

class HydrationReminderService {
  async getLastDrinkAt(patientId: number): Promise<number | null> {
    try {
      const raw = await AsyncStorage.getItem(drinkKey(patientId));
      if (!raw) return null;
      const ms = Number(raw);
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }

  async getLastPlayedPeriod(patientId: number): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(playedPeriodKey(patientId));
      if (!raw) return 0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Persist last drink time, reset played period, and schedule OS notifications.
   * Uses current time when the user confirms — not a stale server timestamp.
   */
  async recordDrink(patientId: number, at?: string | number | Date): Promise<number> {
    let ms = Date.now();
    if (at != null) {
      if (typeof at === 'number') ms = at;
      else if (at instanceof Date) ms = at.getTime();
      else {
        const parsed = parseIso(at);
        if (parsed != null) ms = parsed;
      }
    }

    await AsyncStorage.multiSet([
      [drinkKey(patientId), String(ms)],
      [playedPeriodKey(patientId), '0'],
    ]);

    await scheduleHydrationReminders(patientId, ms);
    return ms;
  }

  /** User explicitly confirmed — always anchor to now for an accurate 2-hour window. */
  async confirmDrink(patientId: number): Promise<number> {
    return this.recordDrink(patientId, Date.now());
  }

  async syncFromServer(
    patientId: number,
    lastLoggedAt: string | null | undefined
  ): Promise<number | null> {
    if (!lastLoggedAt) return this.getLastDrinkAt(patientId);
    const serverMs = parseIso(lastLoggedAt);
    if (serverMs == null) return this.getLastDrinkAt(patientId);

    const localMs = await this.getLastDrinkAt(patientId);
    if (localMs == null || serverMs > localMs) {
      await AsyncStorage.multiSet([
        [drinkKey(patientId), String(serverMs)],
        [playedPeriodKey(patientId), '0'],
      ]);
      await scheduleHydrationReminders(patientId, serverMs);
      return serverMs;
    }
    return localMs;
  }

  async markReminderPlayed(patientId: number, period: number): Promise<void> {
    await AsyncStorage.setItem(playedPeriodKey(patientId), String(period));
  }

  async getState(patientId: number, now = Date.now()): Promise<HydrationReminderState> {
    const lastDrinkAt = await this.getLastDrinkAt(patientId);
    const lastPlayedPeriod = await this.getLastPlayedPeriod(patientId);
    const computed = computeReminderState(lastDrinkAt, now, lastPlayedPeriod);
    return {
      lastDrinkAt: computed.lastDrinkAt,
      remainingMs: computed.remainingMs,
      isDue: computed.isDue,
      reminderPeriod: computed.reminderPeriod,
      nextReminderAt: computed.nextReminderAt,
    };
  }

  async clear(patientId: number): Promise<void> {
    await AsyncStorage.multiRemove([drinkKey(patientId), playedPeriodKey(patientId)]);
    await cancelHydrationNotifications(patientId);
  }
}

export const hydrationReminderService = new HydrationReminderService();
