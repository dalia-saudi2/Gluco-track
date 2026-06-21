import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { apiClient } from '../config/api';
import {
  medicationReminderService,
  type MedicationReminderState,
} from '../services/medicationReminderService';
import {
  registerMedicationNotificationListeners,
  requestMedicationNotificationPermission,
  type MedicationNotificationPayload,
} from '../services/medicationNotificationService';
import { MedicationReminderModal } from '../components/MedicationReminderModal';
import { playReminderSound } from '../utils/reminderSound';
import type { MedicationDoseSlot, SchedulableMedication } from '../utils/medicationSchedule';
import { deriveMedicationDoseSlots, buildMedicationDashboardRows, type MedicationDashboardRow } from '../utils/medicationSchedule';

type MedicationReminderContextValue = MedicationReminderState & {
  activeAlert: MedicationDoseSlot | null;
  dashboardRows: MedicationDashboardRow[];
  takenDoseIds: Set<string>;
  syncMedications: (medications: SchedulableMedication[]) => Promise<void>;
  markTaken: (slot: MedicationDoseSlot) => Promise<void>;
  markTakenBySlotKey: (slotKey: string) => Promise<void>;
  snooze: (slot: MedicationDoseSlot, minutes?: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const MedicationReminderContext = createContext<MedicationReminderContextValue | null>(null);

export function useMedicationReminder(): MedicationReminderContextValue {
  const ctx = useContext(MedicationReminderContext);
  if (!ctx) {
    throw new Error('useMedicationReminder must be used within MedicationReminderProvider');
  }
  return ctx;
}

export function useMedicationReminderOptional(): MedicationReminderContextValue | null {
  return useContext(MedicationReminderContext);
}

type Props = { children: ReactNode };

export function MedicationReminderProvider({ children }: Props) {
  const { user, isAuthenticated } = useAuth();
  const patientId = user?.id;
  const [medications, setMedications] = useState<SchedulableMedication[]>([]);
  const [state, setState] = useState<MedicationReminderState>({
    dueDoses: [],
    nextDose: null,
    nextDoseAt: null,
  });
  const [activeAlert, setActiveAlert] = useState<MedicationDoseSlot | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dashboardRows, setDashboardRows] = useState<MedicationDashboardRow[]>([]);
  const [takenDoseIds, setTakenDoseIds] = useState<Set<string>>(new Set());

  const patientIdRef = useRef(patientId);
  const medicationsRef = useRef(medications);
  const playingRef = useRef(false);
  patientIdRef.current = patientId;
  medicationsRef.current = medications;

  const showAlert = useCallback(async (slot: MedicationDoseSlot, options?: { playSound?: boolean }) => {
    if (playingRef.current) return;
    playingRef.current = true;
    try {
      setActiveAlert(slot);
      setModalVisible(true);
      if (options?.playSound !== false) {
        await playReminderSound();
      }
      const pid = patientIdRef.current;
      if (pid) {
        await medicationReminderService.markReminderPlayed(pid, slot);
      }
    } finally {
      playingRef.current = false;
    }
  }, []);

  const recompute = useCallback(async () => {
    const pid = patientIdRef.current;
    if (!pid || medicationsRef.current.length === 0) {
      setState({ dueDoses: [], nextDose: null, nextDoseAt: null });
      setDashboardRows([]);
      setActiveAlert(null);
      setModalVisible(false);
      return;
    }

    const [taken, played, snoozeUntil] = await Promise.all([
      medicationReminderService.getTakenDoseIds(pid),
      medicationReminderService.getPlayedDoseIds(pid),
      medicationReminderService.getSnoozeUntil(pid),
    ]);

    const computed = medicationReminderService.computeState(
      medicationsRef.current,
      taken,
      played,
      snoozeUntil
    );

    setState({
      dueDoses: computed.dueDoses,
      nextDose: computed.nextDose,
      nextDoseAt: computed.nextDoseAt,
    });
    setDashboardRows(buildMedicationDashboardRows(medicationsRef.current, taken));
    setTakenDoseIds(new Set(taken));

    if (computed.shouldAlert) {
      await showAlert(computed.shouldAlert, { playSound: true });
    }
  }, [showAlert]);

  const loadMedications = useCallback(async () => {
    if (!patientId) {
      setMedications([]);
      return;
    }
    try {
      const data = (await apiClient.getMedications()) as SchedulableMedication[];
      const list = Array.isArray(data) ? data.filter((m) => m.is_active !== false) : [];
      setMedications(list);
      medicationsRef.current = list;
      await medicationReminderService.syncMedications(patientId, list);
    } catch {
      setMedications([]);
      medicationsRef.current = [];
    }
  }, [patientId]);

  const syncMedications = useCallback(
    async (list: SchedulableMedication[]) => {
      const active = list.filter((m) => m.is_active !== false);
      setMedications(active);
      medicationsRef.current = active;
      if (patientId) {
        await medicationReminderService.syncMedications(patientId, active);
      }
      await recompute();
    },
    [patientId, recompute]
  );

  const markTaken = useCallback(
    async (slot: MedicationDoseSlot) => {
      if (!patientId) return;
      await medicationReminderService.markTaken(patientId, slot);
      setModalVisible(false);
      setActiveAlert(null);
      await recompute();
    },
    [patientId, recompute]
  );

  const markTakenBySlotKey = useCallback(
    async (slotKey: string) => {
      const slot = deriveMedicationDoseSlots(medicationsRef.current).find((s) => s.slotKey === slotKey);
      if (slot) await markTaken(slot);
    },
    [markTaken]
  );

  const snooze = useCallback(
    async (slot: MedicationDoseSlot, minutes = 10) => {
      if (!patientId) return;
      await medicationReminderService.snooze(patientId, slot, minutes);
      setModalVisible(false);
      setActiveAlert(null);
      await recompute();
    },
    [patientId, recompute]
  );

  const dismissModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handlePushPayload = useCallback(
    (payload: MedicationNotificationPayload) => {
      if (payload.patientId !== patientIdRef.current) return;
      const slot =
        deriveMedicationDoseSlots(medicationsRef.current).find((s) => s.slotKey === payload.slotKey) ??
        ({
          medicationId: payload.medicationId,
          name: payload.name,
          dosage: payload.dosage,
          label: payload.label,
          slotKey: payload.slotKey,
          hour: 0,
          minute: 0,
        } as MedicationDoseSlot);
      void showAlert(slot, { playSound: true });
      void recompute();
    },
    [recompute, showAlert]
  );

  useEffect(() => {
    if (!isAuthenticated || !patientId) return;
    void loadMedications().then(() => recompute());
  }, [isAuthenticated, patientId, loadMedications, recompute]);

  useEffect(() => {
    if (!patientId) return undefined;
    const id = setInterval(() => {
      void recompute();
    }, 1000);
    return () => clearInterval(id);
  }, [patientId, recompute]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        void loadMedications().then(() => recompute());
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [loadMedications, recompute]);

  useEffect(() => {
    if (!patientId || Platform.OS === 'web') return;
    void requestMedicationNotificationPermission();
    return registerMedicationNotificationListeners(handlePushPayload);
  }, [patientId, handlePushPayload]);

  const refresh = useCallback(async () => {
    await loadMedications();
    await recompute();
  }, [loadMedications, recompute]);

  const value = useMemo<MedicationReminderContextValue>(
    () => ({
      ...state,
      activeAlert,
      dashboardRows,
      takenDoseIds,
      syncMedications,
      markTaken,
      markTakenBySlotKey,
      snooze,
      refresh,
    }),
    [state, activeAlert, dashboardRows, takenDoseIds, syncMedications, markTaken, markTakenBySlotKey, snooze, refresh]
  );

  return (
    <MedicationReminderContext.Provider value={value}>
      {children}
      <MedicationReminderModal
        visible={modalVisible && activeAlert != null}
        dose={activeAlert}
        onTaken={() => {
          if (activeAlert) void markTaken(activeAlert);
        }}
        onSnooze={() => {
          if (activeAlert) void snooze(activeAlert);
        }}
        onDismiss={dismissModal}
      />
    </MedicationReminderContext.Provider>
  );
}
