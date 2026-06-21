import '../polyfills'; // Must be first — patches Hermes globals before any SDK loads
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ThemedStatusBar } from '../components/ThemedStatusBar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';
import { HydrationReminderProvider } from '../contexts/HydrationReminderContext';
import { MedicationReminderProvider } from '../contexts/MedicationReminderContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../components/ToastProvider';
import { ZoomOAuthHandler } from '../components/ZoomOAuthHandler';
import { AuthGate } from '../components/AuthGate';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <HydrationReminderProvider>
          <MedicationReminderProvider>
            <ToastProvider>
              <ZoomOAuthHandler />
              <AuthGate>
                <Stack screenOptions={{ headerShown: false }} />
              </AuthGate>
              <ThemedStatusBar />
            </ToastProvider>
          </MedicationReminderProvider>
        </HydrationReminderProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
