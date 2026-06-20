import { Platform } from 'react-native';

/** Google OAuth (PKCE) needs WebCrypto — only available on https or localhost. */
export function isGoogleAuthSupported(): boolean {
  if (Platform.OS !== 'web') {
    return true;
  }
  return typeof window !== 'undefined' && window.isSecureContext;
}
