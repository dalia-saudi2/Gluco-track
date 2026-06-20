import { useCallback } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { navigateToLabUpload } from '../utils/navigateToLabUpload';
import { normalizeAppReturnRoute } from '../utils/labUploadReturn';

export function useNavigateToLabUpload() {
  const router = useRouter();
  const pathname = usePathname();
  const { refreshUser } = useAuth();

  return useCallback(async () => {
    const returnTo = pathname.startsWith('/onboarding')
      ? undefined
      : normalizeAppReturnRoute(pathname);
    await navigateToLabUpload(router, refreshUser, returnTo);
  }, [router, refreshUser, pathname]);
}
