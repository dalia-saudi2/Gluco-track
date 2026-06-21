import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { MedicationDoseSlot } from '../utils/medicationSchedule';

export const MEDICATION_SOUND = 'reminder.mp3';
/** Bumped when custom sound changes — Android channels cannot update sound in place. */
export const MEDICATION_CHANNEL_ID = 'medication-reminders-v2';

const notificationId = (patientId: number, slotKey: string) =>
  `medication-${patientId}-${slotKey}`;

let handlersRegistered = false;

export async function ensureMedicationNotificationSetup(): Promise<void> {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: MEDICATION_SOUND,
      vibrationPattern: [0, 300, 120, 300],
      enableVibrate: true,
    });
  }

  if (!handlersRegistered) {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const type = notification.request.content.data?.type;
        const playSound = type === 'hydration_reminder' || type === 'medication_reminder';
        return {
          shouldShowAlert: true,
          shouldPlaySound: playSound,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
    handlersRegistered = true;
  }
}

export async function requestMedicationNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureMedicationNotificationSetup();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

export async function cancelMedicationNotifications(patientId: number): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `medication-${patientId}-`;
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function scheduleMedicationReminders(
  patientId: number,
  slots: MedicationDoseSlot[]
): Promise<void> {
  if (Platform.OS === 'web' || slots.length === 0) return;

  await ensureMedicationNotificationSetup();
  const granted = await requestMedicationNotificationPermission();
  if (!granted) return;

  await cancelMedicationNotifications(patientId);

  await Promise.all(
    slots.map((slot) =>
      Notifications.scheduleNotificationAsync({
        identifier: notificationId(patientId, slot.slotKey),
        content: {
          title: 'Medication reminder',
          body: `Time to take ${slot.name} (${slot.dosage})`,
          sound: MEDICATION_SOUND,
          data: {
            type: 'medication_reminder',
            patientId,
            medicationId: slot.medicationId,
            slotKey: slot.slotKey,
            name: slot.name,
            dosage: slot.dosage,
            label: slot.label,
          },
          ...(Platform.OS === 'android' ? { channelId: MEDICATION_CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
        },
      })
    )
  );
}

export type MedicationNotificationPayload = {
  patientId: number;
  medicationId: number;
  slotKey: string;
  name: string;
  dosage: string;
  label: string;
};

export function registerMedicationNotificationListeners(
  onReminderFired: (payload: MedicationNotificationPayload) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => undefined;
  }

  const handleData = (data: Record<string, unknown> | undefined) => {
    if (data?.type !== 'medication_reminder') return;
    onReminderFired({
      patientId: Number(data.patientId),
      medicationId: Number(data.medicationId),
      slotKey: String(data.slotKey ?? ''),
      name: String(data.name ?? 'Medication'),
      dosage: String(data.dosage ?? ''),
      label: String(data.label ?? ''),
    });
  };

  const received = Notifications.addNotificationReceivedListener((notification) => {
    handleData(notification.request.content.data as Record<string, unknown>);
  });

  const response = Notifications.addNotificationResponseReceivedListener((response) => {
    handleData(response.notification.request.content.data as Record<string, unknown>);
  });

  return () => {
    received.remove();
    response.remove();
  };
}
