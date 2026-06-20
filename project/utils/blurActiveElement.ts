import { Platform } from 'react-native';

/** Prevent aria-hidden focus warnings when React Navigation hides inactive tab screens on web. */
export function blurActiveElement() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const el = document.activeElement;
    if (el instanceof HTMLElement) {
      el.blur();
    }
  }
}
