import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  HealthTodayData,
  HealthHistoryData,
  HealthPermissionStatus,
} from '../types/health.types';
import { healthService } from '../services/health.service';
import { healthSyncService } from '../services/healthSyncService';

const INITIAL_TODAY: HealthTodayData = {
  sleepHours: 0,
  steps: 0,
  caloriesBurned: 0,
};

const INITIAL_HISTORY: HealthHistoryData = {
  sleep: [],
  steps: [],
  calories: [],
};

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

type Options = {
  patientId?: number | null;
  isAuthenticated?: boolean;
};

export function useHealth(permissionStatus: HealthPermissionStatus, options: Options = {}) {
  const { patientId, isAuthenticated = false } = options;
  const [today, setToday] = useState<HealthTodayData>(INITIAL_TODAY);
  const [history7d, setHistory7d] = useState<HealthHistoryData>(INITIAL_HISTORY);
  const [history30d, setHistory30d] = useState<HealthHistoryData>(INITIAL_HISTORY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  const syncToBackend = useCallback(
    async (
      todayData: HealthTodayData,
      hist7d: HealthHistoryData,
      hist30d: HealthHistoryData
    ) => {
      if (!patientId || !isAuthenticated || syncInFlight.current) return;

      syncInFlight.current = true;
      setSyncing(true);
      try {
        await healthSyncService.flushPending(patientId);
        const result = await healthSyncService.syncToServer(
          patientId,
          todayData,
          hist7d,
          hist30d
        );
        if (result?.last_synced_at) {
          setLastSyncedAt(result.last_synced_at);
        }
      } catch (syncErr) {
        console.warn('Background health sync deferred:', syncErr);
      } finally {
        syncInFlight.current = false;
        setSyncing(false);
      }
    },
    [patientId, isAuthenticated]
  );

  const fetchData = useCallback(
    async (isPullToRefresh = false) => {
      if (permissionStatus !== 'granted') {
        return;
      }

      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const simulated = healthService.isSimulated();

        if (simulated && patientId && isAuthenticated) {
          const [todayData, server7d, server30d] = await Promise.all([
            healthSyncService.fetchToday(patientId),
            healthSyncService.fetchHistory(patientId, 7),
            healthSyncService.fetchHistory(patientId, 30),
          ]);

          setToday({
            steps: todayData.steps,
            sleepHours: todayData.sleepHours,
            caloriesBurned: todayData.caloriesBurned,
          });
          setHistory7d(server7d);
          setHistory30d(server30d);

          if (todayData.synced_at) {
            setLastSyncedAt(todayData.synced_at);
          } else {
            const stored = await healthSyncService.getLastSyncedAt();
            setLastSyncedAt(stored);
          }
        } else {
          const [todayData, device7d, device30d] = await Promise.all([
            healthService.getTodayData(),
            healthService.getHistoryData(7),
            healthService.getHistoryData(30),
          ]);

          let merged7d = device7d;
          let merged30d = device30d;

          if (patientId && isAuthenticated) {
            try {
              const [server7d, server30d] = await Promise.all([
                healthSyncService.fetchHistory(patientId, 7),
                healthSyncService.fetchHistory(patientId, 30),
              ]);
              merged7d = healthSyncService.mergeDeviceWithServer(device7d, server7d);
              merged30d = healthSyncService.mergeDeviceWithServer(device30d, server30d);
            } catch (serverErr) {
              console.warn('Could not load server health history:', serverErr);
            }
          }

          setToday(todayData);
          setHistory7d(merged7d);
          setHistory30d(merged30d);

          if (patientId && isAuthenticated && !simulated) {
            await syncToBackend(todayData, merged7d, merged30d);
          } else {
            const stored = await healthSyncService.getLastSyncedAt();
            setLastSyncedAt(stored);
          }
        }
      } catch (e: unknown) {
        console.warn('Error fetching health data in hook:', e);
        setError(e instanceof Error ? e.message : 'Failed to fetch health data from your device.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [permissionStatus, patientId, isAuthenticated, syncToBackend]
  );

  useEffect(() => {
    if (permissionStatus === 'granted') {
      fetchData();
    }
  }, [permissionStatus, fetchData]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && permissionStatus === 'granted') {
        fetchData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [permissionStatus, fetchData]);

  useEffect(() => {
    if (permissionStatus !== 'granted' || !patientId || !isAuthenticated) {
      return;
    }

    const interval = setInterval(() => {
      fetchData();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [permissionStatus, patientId, isAuthenticated, fetchData]);

  return {
    today,
    history7d,
    history30d,
    loading,
    refreshing,
    syncing,
    error,
    lastSyncedAt,
    refreshData: () => fetchData(true),
    isSimulated: healthService.isSimulated(),
    isServerBacked:
      healthService.isSimulated() && Boolean(patientId && isAuthenticated),
  };
}
