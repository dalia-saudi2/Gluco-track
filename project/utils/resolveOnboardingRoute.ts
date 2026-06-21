import { apiClient } from '../config/api';
import type { User } from '../services/authService';
import type { OnboardingProgress } from './labOnboarding';
import { getPostAuthRoute, type OnboardingRoute } from './authRouting';

export async function resolveOnboardingRoute(
  user: User | null,
  progress?: OnboardingProgress | null
): Promise<OnboardingRoute> {
  if (progress !== undefined) {
    return getPostAuthRoute(user, progress);
  }
  try {
    const fetched = await apiClient.getOnboardingProgress();
    return getPostAuthRoute(user, fetched);
  } catch {
    return getPostAuthRoute(user);
  }
}
