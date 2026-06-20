import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  HYDRATION_REMINDER_INTERVAL_MS,
  hydrationReminderService,
} from './hydrationReminderService';

export const HYDRATION_SOUND = 'hydration-reminder.mp3';
export const HYDRATION_CHANNEL_ID = 'hydration-reminders';

/** Schedule this many 2-hour reminders ahead (48 hours). */
const MAX_SCHEDULED_PERIODS = 24;

const notificationId = (patientId: number, period: number) => `hydration-${patientId}-${period}`;

let handlersRegistered = false;

export async function ensureHydrationNotificationSetup(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HYDRATION_CHANNEL_ID, {
      name: 'Hydration reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: HYDRATION_SOUND,
      vibrationPattern: [0, 250, 120, 250],
      enableVibrate: true,
    });
  }

  if (!handlersRegistered) {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isHydration =
          notification.request.content.data?.type === 'hydration_reminder';
        return {
          shouldShowAlert: true,
          shouldPlaySound: isHydration,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
    handlersRegistered = true;
  }
}

export async function requestHydrationNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureHydrationNotificationSetup();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

export async function cancelHydrationNotifications(patientId: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `hydration-${patientId}-`;
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function scheduleHydrationReminders(
  patientId: number,
  lastDrinkAtMs: number
): Promise<void> {
  if (Platform.OS === 'web') return;

  await ensureHydrationNotificationSetup();
  const granted = await requestHydrationNotificationPermission();
  if (!granted) return;

  await cancelHydrationNotifications(patientId);

  const now = Date.now();
  const tasks: Promise<string>[] = [];

  for (let period = 1; period <= MAX_SCHEDULED_PERIODS; period += 1) {
    const fireAt = lastDrinkAtMs + period * HYDRATION_REMINDER_INTERVAL_MS;
    if (fireAt <= now) continue;

    tasks.push(
      Notifications.scheduleNotificationAsync({
        identifier: notificationId(patientId, period),
        content: {
          title: 'Hydration reminder',
          body: 'Time to drink water! Stay hydrated for better glucose control.',
          sound: HYDRATION_SOUND,
          data: {
            type: 'hydration_reminder',
            patientId,
            period,
            lastDrinkAtMs,
          },
          ...(Platform.OS === 'android' ? { channelId: HYDRATION_CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
        },
      })
    );
  }

  await Promise.all(tasks);
}

export type HydrationNotificationFired = {
  patientId: number;
  period: number;
};

export function registerHydrationNotificationListeners(
  onReminderFired: (payload: HydrationNotificationFired) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  const handle = async (patientId: number, period: number) => {
    if (!Number.isFinite(patientId) || !Number.isFinite(period)) return;
    await hydrationReminderService.markReminderPlayed(patientId, period);
    onReminderFired({ patientId, period });
  };

  const received = Notifications.addNotificationReceivedListener((notification) => {
    const { data } = notification.request.content;
    if (data?.type !== 'hydration_reminder') return;
    void handle(Number(data.patientId), Number(data.period));
  });

  const response = Notifications.addNotificationResponseReceivedListener((response) => {
    const { data } = response.notification.request.content;
    if (data?.type !== 'hydration_reminder') return;
    void handle(Number(data.patientId), Number(data.period));
  });

  return () => {
    received.remove();
    response.remove();
  };
}

/** Re-schedule from persisted last-drink time (e.g. after app restart). */
export async function syncHydrationNotificationSchedule(patientId: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const lastDrinkAt = await hydrationReminderService.getLastDrinkAt(patientId);
  if (lastDrinkAt == null) {
    await cancelHydrationNotifications(patientId);
    return;
  }
  await scheduleHydrationReminders(patientId, lastDrinkAt);
}
