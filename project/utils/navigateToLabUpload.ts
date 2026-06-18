import type { Router } from 'expo-router';
import { apiClient } from '../config/api';

/** Opens the 3-step lab OCR flow (upload → scanning → review). */
export async function navigateToLabUpload(
  router: Router,
  refreshUser?: () => Promise<void>
): Promise<void> {
  try {
    await apiClient.updateOnboardingLabChoice(true);
    if (refreshUser) await refreshUser();
  } catch {
    // Still navigate — lab_upload_pending may already allow upload
  }
  router.push('/onboarding/lab-upload' as never);
}

export function isLabOcrOnboardingRoute(segment: string | undefined): boolean {
  return segment === 'lab-upload' || segment === 'lab-review';
}
