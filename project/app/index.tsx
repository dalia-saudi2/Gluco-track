import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingRoute } from '../utils/authRouting';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href={getOnboardingRoute(user)} />;
}
