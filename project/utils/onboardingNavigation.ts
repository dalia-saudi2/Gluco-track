import { InteractionManager } from 'react-native';
import type { Router } from 'expo-router';
import type { OnboardingRoute } from './authRouting';

/** Navigate to an onboarding route after nested layouts have mounted. */
export function replaceOnboardingStep(router: Router, route: OnboardingRoute) {
  InteractionManager.runAfterInteractions(() => {
    router.replace(route);
  });
}

export function normalizeRoutePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed || '/';
}

export function isOnboardingRoute(path: string): boolean {
  return normalizeRoutePath(path).startsWith('/onboarding');
}

export function routesMatch(current: string, target: string): boolean {
  return normalizeRoutePath(current) === normalizeRoutePath(target);
}
