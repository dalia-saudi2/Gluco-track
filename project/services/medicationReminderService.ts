import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deriveMedicationDoseSlots,
  isMedicationDoseDue,
  todayDoseId,
  type MedicationDoseSlot,
  type SchedulableMedication,
} from '../utils/medicationSchedule';
import {
  cancelMedicationNotifications,
  scheduleMedicationReminders,
} from './medicationNotificationService';

const takenKey = (patientId: number) => `@patient_portal:med_taken:${patientId}`;
const snoozeKey = (patientId: number) => `@patient_portal:med_snooze:${patientId}`;
const playedKey = (patientId: number) => `@patient_portal:med_played:${patientId}`;

export type MedicationReminderState = {
  dueDoses: MedicationDoseSlot[];
  nextDose: MedicationDoseSlot | null;
  nextDoseAt: number | null;
};

async function readJsonSet(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function writeJsonSet(key: string, set: Set<string>): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify([...set]));
}

async function readSnoozeMap(key: string): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function nextFutureDose(
  slots: MedicationDoseSlot[],
  taken: Set<string>,
  now: Date
): { slot: MedicationDoseSlot; at: number } | null {
  const candidates: { slot: MedicationDoseSlot; at: number }[] = [];

  for (let dayOffset = 0; dayOffset < 2; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);

    for (const slot of slots) {
      const doseId = todayDoseId(slot.slotKey, day);
      if (taken.has(doseId)) continue;

      const at = new Date(day);
      at.setHours(slot.hour, slot.minute, 0, 0);
      if (at.getTime() > now.getTime()) {
        candidates.push({ slot, at: at.getTime() });
      }
    }
  }

  candidates.sort((a, b) => a.at - b.at);
  return candidates[0] ?? null;
}

class MedicationReminderService {
  async getTakenDoseIds(patientId: number): Promise<Set<string>> {
    return readJsonSet(takenKey(patientId));
  }

  async getPlayedDoseIds(patientId: number): Promise<Set<string>> {
    return readJsonSet(playedKey(patientId));
  }

  async getSnoozeUntil(patientId: number): Promise<Record<string, number>> {
    return readSnoozeMap(snoozeKey(patientId));
  }

  computeState(
    medications: SchedulableMedication[],
    taken: Set<string>,
    played: Set<string>,
    snoozeUntil: Record<string, number>,
    now = Date.now()
  ): MedicationReminderState & { shouldAlert: MedicationDoseSlot | null } {
    const slots = deriveMedicationDoseSlots(medications);
    const nowDate = new Date(now);

    const dueDoses = slots.filter((slot) => {
      const doseId = todayDoseId(slot.slotKey, nowDate);
      if (taken.has(doseId)) return false;
      if ((snoozeUntil[doseId] ?? 0) > now) return false;
      return isMedicationDoseDue(slot, nowDate);
    });

    const shouldAlert =
      dueDoses.find((slot) => {
        const doseId = todayDoseId(slot.slotKey, nowDate);
        return !played.has(doseId);
      }) ?? null;

    const next = nextFutureDose(slots, taken, nowDate);

    return {
      dueDoses,
      nextDose: next?.slot ?? null,
      nextDoseAt: next?.at ?? null,
      shouldAlert,
    };
  }

  async syncMedications(patientId: number, medications: SchedulableMedication[]): Promise<void> {
    const slots = deriveMedicationDoseSlots(medications);
    await scheduleMedicationReminders(patientId, slots);
  }

  async markTaken(patientId: number, slot: MedicationDoseSlot, at = new Date()): Promise<void> {
    const doseId = todayDoseId(slot.slotKey, at);
    const taken = await this.getTakenDoseIds(patientId);
    taken.add(doseId);
    await writeJsonSet(takenKey(patientId), taken);

    const played = await this.getPlayedDoseIds(patientId);
    played.add(doseId);
    await writeJsonSet(playedKey(patientId), played);

    const snooze = await this.getSnoozeUntil(patientId);
    delete snooze[doseId];
    await AsyncStorage.setItem(snoozeKey(patientId), JSON.stringify(snooze));
  }

  async markReminderPlayed(patientId: number, slot: MedicationDoseSlot, at = new Date()): Promise<void> {
    const doseId = todayDoseId(slot.slotKey, at);
    const played = await this.getPlayedDoseIds(patientId);
    played.add(doseId);
    await writeJsonSet(playedKey(patientId), played);
  }

  async snooze(patientId: number, slot: MedicationDoseSlot, minutes = 10, at = new Date()): Promise<void> {
    const doseId = todayDoseId(slot.slotKey, at);
    const snooze = await this.getSnoozeUntil(patientId);
    snooze[doseId] = Date.now() + minutes * 60_000;
    await AsyncStorage.setItem(snoozeKey(patientId), JSON.stringify(snooze));

    const played = await this.getPlayedDoseIds(patientId);
    played.delete(doseId);
    await writeJsonSet(playedKey(patientId), played);
  }

  async clear(patientId: number): Promise<void> {
    await AsyncStorage.multiRemove([takenKey(patientId), snoozeKey(patientId), playedKey(patientId)]);
    await cancelMedicationNotifications(patientId);
  }
}

export const medicationReminderService = new MedicationReminderService();
