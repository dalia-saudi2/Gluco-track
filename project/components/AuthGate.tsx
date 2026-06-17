import { useEffect, useState } from 'react';

import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { Stack, useRouter, useSegments } from 'expo-router';

import { useAuth } from '../contexts/AuthContext';

import { getOnboardingRoute, needsOnboarding } from '../utils/authRouting';
import { isOnboardingStepAllowed, routeSegmentToSlug } from '../utils/onboardingSteps';

import { apiClient } from '../config/api';

import type { OnboardingProgress } from '../utils/labOnboarding';



export function AuthGate({ children }: { children: React.ReactNode }) {

  const { isAuthenticated, isLoading, user } = useAuth();

  const router = useRouter();

  const segments = useSegments();

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

    if (isLoading || progressLoading) return;



    const root = segments[0];

    const onLogin = root === 'login';

    const onRegister = root === 'register';

    const onOnboarding = root === 'onboarding';

    const onIndex = !root || (root as string) === 'index';



    if (!isAuthenticated) {

      if (!onLogin && !onRegister && root !== 'fresh-start') {

        router.replace('/login');

      }

      return;

    }



    if (needsOnboarding(user)) {
      const target = getOnboardingRoute(user, progress);

      if (onOnboarding) {
        const slug = routeSegmentToSlug(segments[1]);
        if (slug && isOnboardingStepAllowed(user, progress, slug)) {
          return;
        }
        router.replace(target);
        return;
      }

      if (onRegister || onIndex) {
        router.replace(target);
        return;
      }

      if (!onOnboarding) {
        router.replace(target);
      }
      return;
    }



    if (onLogin || onRegister || onOnboarding || onIndex) {

      router.replace('/(tabs)');

    }

  }, [isLoading, progressLoading, isAuthenticated, user, progress, segments, router]);



  if (isLoading || (isAuthenticated && needsOnboarding(user) && progressLoading)) {

    return (

      <View style={styles.loading}>

        <ActivityIndicator size="large" color="#6366F1" />

      </View>

    );

  }



  return <>{children}</>;

}



const styles = StyleSheet.create({

  loading: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: '#fff9fc',

  },

});



export function RootStack() {

  return (

    <Stack screenOptions={{ headerShown: false }} initialRouteName="login">

      <Stack.Screen name="index" />

      <Stack.Screen name="fresh-start" />

      <Stack.Screen name="login" />

      <Stack.Screen name="register" />

      <Stack.Screen name="onboarding" />

      <Stack.Screen name="(tabs)" />

      <Stack.Screen name="+not-found" />

    </Stack>

  );

}

