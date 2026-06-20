import { Stack } from 'expo-router';

/** Fonts are loaded in the root layout — keep this stack mounted so nested routes can handle navigation. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
