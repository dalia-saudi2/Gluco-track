import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { navigateToLabUpload } from '../utils/navigateToLabUpload';

export function useNavigateToLabUpload() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  return useCallback(async () => {
    await navigateToLabUpload(router, refreshUser);
  }, [router, refreshUser]);
}
