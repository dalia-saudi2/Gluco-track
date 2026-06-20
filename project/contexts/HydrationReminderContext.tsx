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
import {
  computeReminderState,
  formatHydrationCountdown,
  hydrationReminderService,
  HYDRATION_REMINDER_INTERVAL_MS,
  type HydrationReminderState,
} from '../services/hydrationReminderService';
import {
  registerHydrationNotificationListeners,
  requestHydrationNotificationPermission,
  syncHydrationNotificationSchedule,
} from '../services/hydrationNotificationService';
import { playHydrationReminderSound } from '../utils/hydrationReminderSound';
import { showToast } from '../components/ToastProvider';

type HydrationReminderContextValue = HydrationReminderState & {
  countdownLabel: string;
  hasStarted: boolean;
  /** User tapped "I drank water" — saves now and resets the 2-hour timer. */
  confirmDrink: () => Promise<void>;
  syncFromServer: (lastLoggedAt: string | null | undefined) => Promise<void>;
  refresh: () => Promise<void>;
};

const HydrationReminderContext = createContext<HydrationReminderContextValue | null>(null);

export function useHydrationReminder(): HydrationReminderContextValue {
  const ctx = useContext(HydrationReminderContext);
  if (!ctx) {
    throw new Error('useHydrationReminder must be used within HydrationReminderProvider');
  }
  return ctx;
}

export function useHydrationReminderOptional(): HydrationReminderContextValue | null {
  return useContext(HydrationReminderContext);
}

type Props = { children: ReactNode };

export function HydrationReminderProvider({ children }: Props) {
  const { user, isAuthenticated } = useAuth();
  const patientId = user?.id;
  const [state, setState] = useState<HydrationReminderState>({
    lastDrinkAt: null,
    remainingMs: 0,
    isDue: false,
    reminderPeriod: 0,
    nextReminderAt: null,
  });
  const lastPlayedPeriodRef = useRef(0);
  const lastDrinkAtRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;

  const loadFromStorage = useCallback(async () => {
    if (!patientId) {
      lastDrinkAtRef.current = null;
      lastPlayedPeriodRef.current = 0;
      return;
    }
    lastDrinkAtRef.current = await hydrationReminderService.getLastDrinkAt(patientId);
    lastPlayedPeriodRef.current = await hydrationReminderService.getLastPlayedPeriod(patientId);
    await syncHydrationNotificationSchedule(patientId);
  }, [patientId]);

  const deliverReminder = useCallback(
    async (period: number, options?: { playSound?: boolean }) => {
      const pid = patientIdRef.current;
      if (!pid || playingRef.current) return;
      if (period <= lastPlayedPeriodRef.current) return;

      playingRef.current = true;
      try {
        if (options?.playSound !== false) {
          await playHydrationReminderSound();
        }
        await hydrationReminderService.markReminderPlayed(pid, period);
        lastPlayedPeriodRef.current = period;
        showToast.info('Hydration reminder', 'Time to drink water!');
      } finally {
        playingRef.current = false;
      }
    },
    []
  );

  const applyComputed = useCallback(
    async (computed: ReturnType<typeof computeReminderState>) => {
      setState({
        lastDrinkAt: computed.lastDrinkAt,
        remainingMs: computed.remainingMs,
        isDue: computed.isDue,
        reminderPeriod: computed.reminderPeriod,
        nextReminderAt: computed.nextReminderAt,
      });

      if (computed.shouldPlay && patientIdRef.current) {
        await deliverReminder(computed.nextPlayedPeriod, { playSound: true });
      }
    },
    [deliverReminder]
  );

  const tick = useCallback(() => {
    if (!patientIdRef.current) {
      setState({
        lastDrinkAt: null,
        remainingMs: 0,
        isDue: false,
        reminderPeriod: 0,
        nextReminderAt: null,
      });
      return;
    }
    const computed = computeReminderState(
      lastDrinkAtRef.current,
      Date.now(),
      lastPlayedPeriodRef.current
    );
    void applyComputed(computed);
  }, [applyComputed]);

  const recompute = useCallback(async () => {
    await loadFromStorage();
    tick();
  }, [loadFromStorage, tick]);

  const confirmDrink = useCallback(async () => {
    if (!patientId) return;
    const ms = await hydrationReminderService.confirmDrink(patientId);
    lastDrinkAtRef.current = ms;
    lastPlayedPeriodRef.current = 0;
    setState({
      lastDrinkAt: ms,
      remainingMs: HYDRATION_REMINDER_INTERVAL_MS,
      isDue: false,
      reminderPeriod: 0,
      nextReminderAt: ms + HYDRATION_REMINDER_INTERVAL_MS,
    });
    if (Platform.OS !== 'web') {
      void requestHydrationNotificationPermission();
    }
  }, [patientId]);

  const syncFromServer = useCallback(
    async (lastLoggedAt: string | null | undefined) => {
      if (!patientId) return;
      const ms = await hydrationReminderService.syncFromServer(patientId, lastLoggedAt);
      lastDrinkAtRef.current = ms;
      lastPlayedPeriodRef.current = await hydrationReminderService.getLastPlayedPeriod(patientId);
      tick();
    },
    [patientId, tick]
  );

  useEffect(() => {
    void recompute();
  }, [recompute, isAuthenticated]);

  useEffect(() => {
    if (!patientId) return undefined;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [patientId, tick]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void recompute();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [recompute]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    return registerHydrationNotificationListeners(({ patientId: firedPatientId, period }) => {
      if (firedPatientId !== patientIdRef.current) return;
      void deliverReminder(period, { playSound: false });
      tick();
    });
  }, [deliverReminder, tick]);

  useEffect(() => {
    if (!patientId || Platform.OS === 'web') return;
    void requestHydrationNotificationPermission();
  }, [patientId]);

  const value = useMemo<HydrationReminderContextValue>(
    () => ({
      ...state,
      countdownLabel: formatHydrationCountdown(state.remainingMs),
      hasStarted: state.lastDrinkAt != null,
      confirmDrink,
      syncFromServer,
      refresh: recompute,
    }),
    [state, confirmDrink, syncFromServer, recompute]
  );

  return (
    <HydrationReminderContext.Provider value={value}>{children}</HydrationReminderContext.Provider>
  );
}
