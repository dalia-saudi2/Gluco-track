import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  HealthTodayData,
  HealthHistoryData,
  HealthPermissionStatus
} from '../types/health.types';
import { healthService } from '../services/health.service';

const INITIAL_TODAY: HealthTodayData = {
  sleepHours: 0,
  steps: 0,
  caloriesBurned: 0
};

const INITIAL_HISTORY: HealthHistoryData = {
  sleep: [],
  steps: [],
  calories: []
};

export function useHealth(permissionStatus: HealthPermissionStatus) {
  const [today, setToday] = useState<HealthTodayData>(INITIAL_TODAY);
  const [history7d, setHistory7d] = useState<HealthHistoryData>(INITIAL_HISTORY);
  const [history30d, setHistory30d] = useState<HealthHistoryData>(INITIAL_HISTORY);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isPullToRefresh = false) => {
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
      // Parallel fetches for speed and efficiency
      const [todayData, hist7d, hist30d] = await Promise.all([
        healthService.getTodayData(),
        healthService.getHistoryData(7),
        healthService.getHistoryData(30)
      ]);

      setToday(todayData);
      setHistory7d(hist7d);
      setHistory30d(hist30d);
    } catch (e: any) {
      console.error('Error fetching health data in hook:', e);
      setError(e?.message || 'Failed to fetch fresh health data from your device.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [permissionStatus]);

  // Initial fetch on mount or permission grant
  useEffect(() => {
    if (permissionStatus === 'granted') {
      fetchData();
    }
  }, [permissionStatus, fetchData]);

  // Foreground sync strategy: refresh when the app returns to the foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && permissionStatus === 'granted') {
        console.log('App returned to foreground, refreshing health metrics...');
        fetchData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [permissionStatus, fetchData]);

  return {
    today,
    history7d,
    history30d,
    loading,
    refreshing,
    error,
    refreshData: () => fetchData(true),
    isSimulated: healthService.isSimulated()
  };
}
