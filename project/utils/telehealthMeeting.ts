export type TelehealthPlatform = 'zoom';

export function telehealthPlatformLabel(_platform?: TelehealthPlatform | string | null): string {
  return 'Zoom';
}

export function isZoomMeetingUrl(url?: string | null): boolean {
  if (!url) return false;
  return /zoom\.us|zoom\.com/i.test(url);
}

export function joinButtonLabel(_platform?: TelehealthPlatform | string | null): string {
  return 'Join on Zoom';
}
