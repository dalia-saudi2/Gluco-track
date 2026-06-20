import { Linking, Platform } from 'react-native';

/** Open https/http links in a new tab on web and via the system handler on native. */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) {
    throw new Error('No URL to open');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(url);
    }
    return;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('Cannot open this link on your device');
  }
  await Linking.openURL(url);
}
