import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { HealthPermissionStatus } from '../types/health.types';
import { healthService } from '../services/health.service';

export function useHealthPermissions() {
  const [status, setStatus] = useState<HealthPermissionStatus>('idle');
  const [isChecking, setIsChecking] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [needsHealthConnectInstall, setNeedsHealthConnectInstall] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const isAvailable = await healthService.isAvailable();
      setNeedsHealthConnectInstall(
        Platform.OS === 'android' && healthService.needsHealthConnectInstall()
      );

      if (!isAvailable) {
        setStatus(healthService.needsHealthConnectInstall() ? 'unavailable' : 'unavailable');
        return 'unavailable';
      }

      const currentStatus = await healthService.checkPermissions();
      setStatus(currentStatus);
      return currentStatus;
    } catch (error) {
      console.warn('Error checking health permissions:', error);
      setStatus('unavailable');
      return 'unavailable';
    } finally {
      setIsChecking(false);
    }
  }, []);

  const requestAccess = useCallback(async () => {
    setIsRequesting(true);
    try {
      const finalStatus = await healthService.requestPermissions();
      setStatus(finalStatus);
      return finalStatus;
    } catch (error) {
      console.warn('Error requesting health permissions:', error);
      setStatus('denied');
      return 'denied';
    } finally {
      setIsRequesting(false);
    }
  }, []);

  const goToSettings = useCallback(async () => {
    return await healthService.openSettings();
  }, []);

  const installHealthConnect = useCallback(async () => {
    return await healthService.openHealthConnectInstall();
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isChecking,
    isRequesting,
    checkStatus,
    requestAccess,
    goToSettings,
    installHealthConnect,
    needsHealthConnectInstall,
    isSimulated: healthService.isSimulated(),
    isNativeAndroid: healthService.isNativeAndroid(),
  };
}
