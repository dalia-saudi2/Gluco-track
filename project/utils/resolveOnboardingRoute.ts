import { apiClient } from '../config/api';
import type { User } from '../services/authService';
import { getPostAuthRoute, type OnboardingRoute } from './authRouting';

export async function resolveOnboardingRoute(user: User | null): Promise<OnboardingRoute> {
  try {
    const progress = await apiClient.getOnboardingProgress();
    return getPostAuthRoute(user, progress);
  } catch {
    return getPostAuthRoute(user);
  }
}
