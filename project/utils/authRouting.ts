import type { User } from '../services/authService';

export type OnboardingRoute =
  | '/(tabs)'
  | '/onboarding/demographics'
  | '/onboarding/lab-choice'
  | '/onboarding/lab-upload';

export function getOnboardingRoute(user: User | null): OnboardingRoute {
  if (!user || user.onboarding_completed === true) {
    return '/(tabs)';
  }

  const demographicsDone = user.age != null && user.age > 0;

  if (!demographicsDone) {
    return '/onboarding/demographics';
  }

  if (user.onboarding_lab_opt_in == null) {
    return '/onboarding/lab-choice';
  }

  if (user.onboarding_lab_opt_in === true) {
    return '/onboarding/lab-upload';
  }

  return '/(tabs)';
}

export function needsOnboarding(user: User | null): boolean {
  if (!user) return false;
  return user.onboarding_completed !== true;
}

export function getPostAuthRoute(user: User | null): OnboardingRoute {
  return getOnboardingRoute(user);
}
