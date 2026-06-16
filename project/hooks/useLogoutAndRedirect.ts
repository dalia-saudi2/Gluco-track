import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

/** Clears session and navigates to the login screen. */
export function useLogoutAndRedirect() {
  const { logout } = useAuth();
  const router = useRouter();

  return useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    } else {
      router.replace('/login');
    }
  }, [logout, router]);
}
