export type SchedulableMedication = {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string | null;
  is_active?: boolean;
};

export type MedicationDoseSlot = {
  medicationId: number;
  name: string;
  dosage: string;
  hour: number;
  minute: number;
  label: string;
  slotKey: string;
};

function formatTimeLabel(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function slotKey(medicationId: number, hour: number, minute: number): string {
  return `${medicationId}-${hour}-${minute}`;
}

function pushSlot(
  slots: MedicationDoseSlot[],
  med: SchedulableMedication,
  hour: number,
  minute: number,
  label: string
): void {
  slots.push({
    medicationId: med.id,
    name: med.name,
    dosage: med.dosage,
    hour,
    minute,
    label: `${formatTimeLabel(hour, minute)} · ${label}`,
    slotKey: slotKey(med.id, hour, minute),
  });
}

/** Derive daily dose times from frequency text and optional notes. */
export function deriveMedicationDoseSlots(medications: SchedulableMedication[]): MedicationDoseSlot[] {
  const active = medications.filter((m) => m.is_active !== false);
  const slots: MedicationDoseSlot[] = [];

  for (const med of active) {
    const frequency = (med.frequency || '').toLowerCase();
    const notes = (med.notes || '').toLowerCase();
    const combined = `${frequency} ${notes}`;

    const explicitTimes = parseExplicitTimes(combined);
    if (explicitTimes.length > 0) {
      explicitTimes.forEach((t, i) => {
        pushSlot(slots, med, t.hour, t.minute, t.label || `Dose ${i + 1}`);
      });
      continue;
    }

    if (frequency.includes('three') || frequency.includes('3x') || frequency.includes('thrice')) {
      pushSlot(slots, med, 8, 0, 'Morning dose');
      pushSlot(slots, med, 14, 0, 'Afternoon dose');
      pushSlot(slots, med, 20, 0, 'Evening dose');
      continue;
    }

    if (
      frequency.includes('twice') ||
      frequency.includes('2x') ||
      frequency.includes('bid') ||
      (combined.includes('breakfast') && combined.includes('dinner'))
    ) {
      pushSlot(slots, med, 7, 30, 'Before breakfast');
      pushSlot(slots, med, 18, 0, 'After dinner');
      continue;
    }

    if (combined.includes('meal')) {
      pushSlot(slots, med, 7, 30, 'Before breakfast');
      pushSlot(slots, med, 18, 0, 'After dinner');
      continue;
    }

    if (
      combined.includes('morning') ||
      combined.includes('breakfast') ||
      combined.includes('before breakfast')
    ) {
      pushSlot(slots, med, 7, 30, 'Before breakfast');
      continue;
    }
    if (combined.includes('after breakfast')) {
      pushSlot(slots, med, 8, 30, 'After breakfast');
      continue;
    }
    if (combined.includes('lunch') || combined.includes('midday') || combined.includes('after lunch')) {
      pushSlot(slots, med, 12, 30, 'After lunch');
      continue;
    }
    if (
      combined.includes('evening') ||
      combined.includes('dinner') ||
      combined.includes('after dinner')
    ) {
      pushSlot(slots, med, 18, 0, 'After dinner');
      continue;
    }
    if (combined.includes('night') || combined.includes('bedtime') || combined.includes('before bed')) {
      pushSlot(slots, med, 21, 0, 'Before bed');
      continue;
    }

    pushSlot(slots, med, 8, 0, 'Daily dose');
  }

  return slots.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDoseId(slotKeyValue: string, date = new Date()): string {
  return `${localDateKey(date)}-${slotKeyValue}`;
}

function parseExplicitTimes(text: string): Array<{ hour: number; minute: number; label: string }> {
  const matches = [...text.matchAll(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi)];
  return matches.map((match) => {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const meridiem = (match[3] || '').toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return { hour, minute, label: match[0] };
  });
}

export type MedicationDashboardRow = {
  slotKey: string;
  name: string;
  time: string;
  note: string;
  status: 'taken' | 'missed' | 'upcoming' | 'later';
};

export function buildMedicationDashboardRows(
  medications: SchedulableMedication[],
  takenDoseIds: Set<string>,
  now = new Date()
): MedicationDashboardRow[] {
  const slots = deriveMedicationDoseSlots(medications);
  const rows: MedicationDashboardRow[] = [];

  for (const slot of slots) {
    const doseId = todayDoseId(slot.slotKey, now);
    const scheduled = new Date(now);
    scheduled.setHours(slot.hour, slot.minute, 0, 0);
    const diffMs = now.getTime() - scheduled.getTime();

    let status: MedicationDashboardRow['status'] = 'later';
    if (takenDoseIds.has(doseId)) {
      status = 'taken';
    } else if (diffMs > 45 * 60_000) {
      status = 'missed';
    } else if (diffMs >= -60_000 && diffMs <= 45 * 60_000) {
      status = 'upcoming';
    } else if (scheduled.getTime() > now.getTime()) {
      status = 'later';
    }

    const [timePart, ...noteParts] = slot.label.split(' · ');
    rows.push({
      slotKey: slot.slotKey,
      name: slot.name,
      time: timePart,
      note: noteParts.join(' · ') || slot.dosage,
      status,
    });
  }

  return rows.sort((a, b) => {
    const order = { upcoming: 0, missed: 1, later: 2, taken: 3 };
    const statusCmp = order[a.status] - order[b.status];
    if (statusCmp !== 0) return statusCmp;
    return a.time.localeCompare(b.time);
  });
}

/** True when the dose window is open (1 min before → 45 min after scheduled time). */
export function isMedicationDoseDue(
  slot: MedicationDoseSlot,
  now = new Date(),
  windowBeforeMs = 60_000,
  windowAfterMs = 45 * 60_000
): boolean {
  const scheduled = new Date(now);
  scheduled.setHours(slot.hour, slot.minute, 0, 0);
  const diff = now.getTime() - scheduled.getTime();
  return diff >= -windowBeforeMs && diff <= windowAfterMs;
}
