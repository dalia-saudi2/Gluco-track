import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingRoute, needsOnboarding } from '../utils/authRouting';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const root = segments[0];
    const onLogin = root === 'login';
    const onRegister = root === 'register';
    const onOnboarding = root === 'onboarding';
    const onTabs = root === '(tabs)';
    const onIndex = !root || root === 'index';

    if (!isAuthenticated) {
      if (!onLogin && !onRegister) {
        router.replace('/login');
      }
      return;
    }

    if (needsOnboarding(user)) {
      const target = getOnboardingRoute(user);
      const wanted = target.split('/').pop();
      const current = segments[1];
      if (!onOnboarding || current !== wanted) {
        router.replace(target);
      }
      return;
    }

    if (onLogin || onRegister || onOnboarding || onIndex) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, user, segments, router]);

  if (isLoading) {
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
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
