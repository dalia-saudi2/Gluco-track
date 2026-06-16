import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../config/api';
import type { OnboardingProgress } from './labOnboarding';
import {
  getOnboardingStepInfo,
  getPreviousOnboardingRoute,
  type OnboardingStepSlug,
} from './onboardingSteps';

export function useOnboardingNav(currentSlug: OnboardingStepSlug) {
  const router = useRouter();
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getOnboardingProgress()
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch(() => {
        if (!cancelled) setProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.onboarding_completed]);

  const stepInfo = useMemo(
    () => getOnboardingStepInfo(user, progress, currentSlug),
    [user, progress, currentSlug]
  );

  const previousRoute = useMemo(
    () => getPreviousOnboardingRoute(user, progress, currentSlug),
    [user, progress, currentSlug]
  );

  const canGoBack = previousRoute != null;

  const goBack = useCallback(() => {
    if (previousRoute) {
      router.replace(previousRoute);
    }
  }, [previousRoute, router]);

  return { goBack, canGoBack, stepInfo, progress };
}
