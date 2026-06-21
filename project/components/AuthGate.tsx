import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingRoute, needsOnboarding } from '../utils/authRouting';
import { isOnboardingStepAllowed, routeSegmentToSlug } from '../utils/onboardingSteps';
import { replaceOnboardingStep, routesMatch } from '../utils/onboardingNavigation';
import { isLabOcrOnboardingRoute } from '../utils/navigateToLabUpload';
import {
  peekLabUploadReturnTo,
  peekTabsReturnAfterFlowExit,
  clearTabsReturnAfterFlowExit,
  clearLabUploadReturnTo,
} from '../utils/labUploadReturn';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoading,
    user,
    onboardingProgress,
    onboardingProgressLoading,
    getOnboardingProgressForRouting,
  } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const lastRedirectRef = useRef<string | null>(null);
  const prevNeedsOnboardingRef = useRef<boolean | null>(null);
  const progress = getOnboardingProgressForRouting();
  const progressLoading = onboardingProgressLoading;

  useEffect(() => {
    const needs = needsOnboarding(user, progress);
    if (prevNeedsOnboardingRef.current === true && needs === false) {
      clearLabUploadReturnTo();
    }
    prevNeedsOnboardingRef.current = needs;
    if (!needs) {
      clearTabsReturnAfterFlowExit();
    }
  }, [user?.onboarding_completed, progress?.health_features_done]);

  useEffect(() => {
    if (isLoading || progressLoading) return;

    const root = segments[0];
    const onLogin = root === 'login';
    const onRegister = root === 'register';
    const onOnboarding = root === 'onboarding';
    const onIndex = !root || (root as string) === 'index';
    const onRecordsUpload = root === 'records-upload';
    const onClinicalProfile = root === 'complete-health-profile';

    if (!isAuthenticated) {
      if (!onLogin && !onRegister && root !== 'fresh-start') {
        router.replace('/login');
      }
      return;
    }

    if (onClinicalProfile || onRecordsUpload || root === 'doctor-chat') {
      lastRedirectRef.current = null;
      return;
    }

    if (onOnboarding && isLabOcrOnboardingRoute(segments[1]) && peekLabUploadReturnTo()) {
      lastRedirectRef.current = null;
      return;
    }

    if (needsOnboarding(user, progress)) {
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
      if (onOnboarding && isLabOcrOnboardingRoute(segments[1]) && peekLabUploadReturnTo()) {
        return;
      }
      router.replace('/(tabs)');
    }
  }, [isLoading, progressLoading, isAuthenticated, user, onboardingProgress, progress, segments, pathname, router]);

  const showLoading = isLoading || (isAuthenticated && needsOnboarding(user, progress) && progressLoading);

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
