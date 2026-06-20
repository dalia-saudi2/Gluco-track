import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingRoute, needsOnboarding } from '../utils/authRouting';
import { isOnboardingStepAllowed, routeSegmentToSlug } from '../utils/onboardingSteps';
import { replaceOnboardingStep, routesMatch } from '../utils/onboardingNavigation';
import { isLabOcrOnboardingRoute } from '../utils/navigateToLabUpload';
import { peekLabUploadReturnTo, peekTabsReturnAfterFlowExit, clearTabsReturnAfterFlowExit } from '../utils/labUploadReturn';
import { apiClient } from '../config/api';
import type { OnboardingProgress } from '../utils/labOnboarding';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);

  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !needsOnboarding(user)) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    setProgressLoading(true);
    apiClient
      .getOnboardingProgress()
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch(() => {
        if (!cancelled) setProgress(null);
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.onboarding_completed, user?.is_diabetic_path, user?.onboarding_lab_opt_in]);

  useEffect(() => {
    if (!needsOnboarding(user)) {
      clearTabsReturnAfterFlowExit();
    }
  }, [user?.onboarding_completed]);

  useEffect(() => {
    if (isLoading || progressLoading) return;

    const root = segments[0];
    const onLogin = root === 'login';
    const onRegister = root === 'register';
    const onOnboarding = root === 'onboarding';
    const onIndex = !root || (root as string) === 'index';
    const onRecordsUpload = root === 'records-upload';

    if (!isAuthenticated) {
      if (!onLogin && !onRegister && root !== 'fresh-start') {
        router.replace('/login');
      }
      return;
    }

    if (needsOnboarding(user)) {
      // Allow lab upload flow and doctor chat while onboarding is incomplete.
      if (onRecordsUpload || root === 'doctor-chat') {
        lastRedirectRef.current = null;
        return;
      }

      // Returning from tab-originated upload — stay on dashboard/records, not onboarding steps.
      if (root === '(tabs)' && peekTabsReturnAfterFlowExit()) {
        lastRedirectRef.current = null;
        return;
      }

      // Lab OCR opened from tabs/profile — do not redirect into onboarding steps.
      if (onOnboarding && isLabOcrOnboardingRoute(segments[1]) && peekLabUploadReturnTo()) {
        lastRedirectRef.current = null;
        return;
      }

      const target = getOnboardingRoute(user, progress);
      if (routesMatch(pathname, target)) {
        lastRedirectRef.current = null;
        return;
      }

      if (onOnboarding) {
        const slug = routeSegmentToSlug(segments[1]);
        if (slug && isOnboardingStepAllowed(user, progress, slug)) {
          lastRedirectRef.current = null;
          return;
        }
      }

      if (lastRedirectRef.current === target) return;
      lastRedirectRef.current = target;
      replaceOnboardingStep(router, target);
      return;
    }

    lastRedirectRef.current = null;

    const onLabOcr =
      onOnboarding && isLabOcrOnboardingRoute(segments[1]) && user?.onboarding_completed === true;
    if (onLabOcr) {
      return;
    }

    if ((onLogin || onRegister || onOnboarding || onIndex) && !onRecordsUpload) {
      router.replace('/(tabs)');
    }
  }, [isLoading, progressLoading, isAuthenticated, user, progress, segments, pathname, router]);

  const showLoading = isLoading || (isAuthenticated && needsOnboarding(user) && progressLoading);

  return (
    <>
      {children}
      {showLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9fc',
    zIndex: 999,
  },
});
