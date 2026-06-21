import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { apiClient } from '../config/api';
import type {
  NearbyPlace,
  NearbyPlaceCategory,
  NearbyPlacesResponse,
} from '../types/nearbyPlaces';
import { NEARBY_SEARCH_RADIUS_M } from '../types/nearbyPlaces';

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_PREFIX = '@patient_portal:nearby_osm:';

export type UserCoordinates = {
  latitude: number;
  longitude: number;
};

export type LocationResult =
  | { ok: true; coords: UserCoordinates }
  | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' };

type CacheEntry = {
  savedAt: number;
  payload: NearbyPlacesResponse;
};

function cacheKey(category: NearbyPlaceCategory, lat: number, lng: number): string {
  return `${CACHE_PREFIX}${category}:${lat.toFixed(3)}:${lng.toFixed(3)}:${NEARBY_SEARCH_RADIUS_M}`;
}

async function readCache(key: string): Promise<NearbyPlacesResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return entry.payload;
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: NearbyPlacesResponse): Promise<void> {
  const entry: CacheEntry = { savedAt: Date.now(), payload };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function requestUserLocation(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    return { ok: false, reason: 'denied' };
  }

  if (Platform.OS !== 'web') {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return { ok: false, reason: 'unavailable' };
    }
  }

  try {
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (lastKnown?.coords) {
      return {
        ok: true,
        coords: {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        },
      };
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'web' ? Location.Accuracy.Low : Location.Accuracy.Balanced,
      }),
      Platform.OS === 'web' ? 20000 : 15000
    );
    return {
      ok: true,
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    return { ok: false, reason: 'timeout' };
  }
}

export async function fetchNearbyPlaces(
  category: NearbyPlaceCategory,
  coords: UserCoordinates,
  options?: { skipCache?: boolean }
): Promise<NearbyPlace[]> {
  const key = cacheKey(category, coords.latitude, coords.longitude);

  if (!options?.skipCache) {
    const cached = await readCache(key);
    if (cached) return cached.results;
  }

  const response = (await apiClient.getNearbyPlaces({
    category,
    lat: coords.latitude,
    lng: coords.longitude,
    radiusM: NEARBY_SEARCH_RADIUS_M,
  })) as NearbyPlacesResponse;

  await writeCache(key, response);
  return response.results ?? [];
}

export function categoryTitle(category: NearbyPlaceCategory): string {
  return category === 'pharmacy' ? 'Nearby Pharmacies' : 'Nearby Laboratories';
}

export function categorySubtitle(category: NearbyPlaceCategory): string {
  return category === 'pharmacy'
    ? 'OpenStreetMap · within 2 km'
    : 'OpenStreetMap · within 2 km';
}
