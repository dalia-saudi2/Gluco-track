import type { Router } from 'expo-router';
import { apiClient } from '../config/api';
import { setLabUploadReturnTo } from './labUploadReturn';
import { authService } from '../services/authService';
/** Opens the lab OCR flow (upload → review). Pass returnTo when opened from tabs/profile. */
export async function navigateToLabUpload(
  router: Router,
  refreshUser?: () => Promise<void>,
  returnTo?: string
): Promise<void> {
  if (returnTo) {
    setLabUploadReturnTo(returnTo);

    // Repair stale onboarding_completed=false (old clients) — only when features are done.
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.onboarding_completed !== true) {
        const progress = await apiClient.getOnboardingProgress();
        if (progress?.health_features_done) {
          await apiClient.completeOnboarding();
          if (refreshUser) await refreshUser();
        }
      }
    } catch {
      // Non-blocking — tabs bypass still handles back navigation.
    }
  }

  // During onboarding only — must not run when user opened upload from dashboard/profile.
  if (!returnTo) {
    try {
      await apiClient.updateOnboardingLabChoice(true);
      if (refreshUser) await refreshUser();
    } catch {
      // lab_upload_pending may already allow upload
    }
  }

  router.push('/onboarding/lab-upload' as never);
}
export function isLabOcrOnboardingRoute(segment: string | undefined): boolean {
  return segment === 'lab-upload' || segment === 'lab-review';
}
