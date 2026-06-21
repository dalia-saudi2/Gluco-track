import type { User } from '../services/authService';
import type { OnboardingProgress } from './labOnboarding';

export type OnboardingRoute =
  | '/(tabs)'
  | '/complete-health-profile'
  | '/onboarding/demographics'
  | '/onboarding/diabetic-path'
  | '/onboarding/clinical-profile'
  | '/onboarding/lab-choice'
  | '/onboarding/lab-upload'
  | '/onboarding/lab-review'
  | '/onboarding/health-features';

function demographicsDone(user: User | null, progress?: OnboardingProgress | null): boolean {
  if (progress?.demographics_done) return true;
  if (!user) return false;
  return (user.date_of_birth != null && user.date_of_birth !== '') || (user.age != null && user.age > 0);
}

export function isClinicalProfileComplete(progress?: OnboardingProgress | null): boolean {
  return Boolean(progress?.health_features_done);
}

/** Legacy alias — onboarding no longer blocks app access after signup. */
export function isOnboardingFullyComplete(
  user: User | null,
  progress?: OnboardingProgress | null
): boolean {
  return isClinicalProfileComplete(progress);
}

export function getOnboardingRoute(user: User | null, progress?: OnboardingProgress | null): OnboardingRoute {
  if (!user || user.onboarding_completed === true || progress?.onboarding_completed) {
    return '/(tabs)';
  }

  if (!demographicsDone(user, progress)) {
    return '/onboarding/demographics';
  }

  const pathDone = user.is_diabetic_path != null || progress?.diabetic_path_done === true;
  if (!pathDone) {
    return '/onboarding/diabetic-path';
  }

  const clinicalDone =
    user.is_diabetic_path === false || progress?.clinical_profile_done === true;
  if (user.is_diabetic_path === true && !clinicalDone) {
    return '/onboarding/clinical-profile';
  }

  const labOptIn = progress?.lab_opt_in ?? user.onboarding_lab_opt_in ?? null;
  if (labOptIn == null) {
    return '/onboarding/lab-choice';
  }

  if (labOptIn === true) {
    if (!progress?.lab_upload_id) {
      return '/onboarding/lab-upload';
    }
    if (!progress?.lab_review_done) {
      return '/onboarding/lab-review';
    }
  }

  if (!progress?.health_features_done) {
    return '/onboarding/health-features';
  }

  return '/(tabs)';
}

export function needsOnboarding(
  _user: User | null,
  _progress?: OnboardingProgress | null
): boolean {
  return false;
}

export function getPostAuthRoute(user: User | null, progress?: OnboardingProgress | null): OnboardingRoute {
  return getOnboardingRoute(user, progress);
}
