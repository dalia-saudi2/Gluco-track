import { useEffect } from 'react';
import { Platform } from 'react-native';
import { showToast } from '../components/ToastProvider';

/** Handle ?zoom=connected|error after Zoom OAuth redirect (web). */
export function useZoomOAuthCallback(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const zoom = params.get('zoom');
    if (!zoom) return;

    if (zoom === 'connected') {
      showToast.success('Zoom connected', 'Video visits can now use your Zoom account.');
    } else if (zoom === 'error') {
      showToast.error('Zoom connection failed', params.get('message') || 'Please try again.');
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('zoom');
    url.searchParams.delete('message');
    const next = url.pathname + (url.search || '');
    window.history.replaceState({}, '', next);
  }, []);
}
