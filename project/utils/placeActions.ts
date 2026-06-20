import { Linking, Platform } from 'react-native';
import { normalizePhone } from './callContact';

/** Open turn-by-turn directions in the device's maps app. */
export async function openMapDirections(
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> {
  const name = encodeURIComponent(label || 'Destination');
  const geo = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${name})`;
  const apple = `maps://?daddr=${latitude},${longitude}&q=${name}`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const osm = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

  const candidates =
    Platform.OS === 'ios'
      ? [apple, geo, google, osm]
      : Platform.OS === 'android'
        ? [geo, google, osm]
        : [osm, google];

  for (const url of candidates) {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next
    }
  }
  await Linking.openURL(osm);
}

export async function openOsmListing(mapsUrl: string | null): Promise<void> {
  if (!mapsUrl) return;
  await Linking.openURL(mapsUrl);
}

/** @deprecated use openMapDirections */
export const openGoogleMapsDirections = openMapDirections;

export async function openWhatsAppChat(phone: string, message?: string): Promise<void> {
  const digits = normalizePhone(phone).replace(/^\+/, '');
  if (!digits) return;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  await Linking.openURL(`https://wa.me/${digits}${query}`);
}
