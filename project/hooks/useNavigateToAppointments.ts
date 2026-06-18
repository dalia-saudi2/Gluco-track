import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  navigateForActionLabel,
  navigateToAppointments,
  navigateToBookAppointment,
} from '../utils/navigateToAppointments';

export function useNavigateToAppointments() {
  const router = useRouter();
  return useCallback(() => {
    navigateToAppointments(router);
  }, [router]);
}

export function useNavigateToBookAppointment() {
  const router = useRouter();
  return useCallback(() => {
    navigateToBookAppointment(router);
  }, [router]);
}

export function useBookActionNavigation() {
  const router = useRouter();
  return useCallback(
    (label: string) => {
      navigateForActionLabel(router, label);
    },
    [router],
  );
}
