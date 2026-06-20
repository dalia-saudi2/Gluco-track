import { useZoomOAuthCallback } from '../hooks/useZoomOAuthCallback';

/** Listens for Zoom OAuth redirect query params on web. */
export function ZoomOAuthHandler() {
  useZoomOAuthCallback();
  return null;
}
