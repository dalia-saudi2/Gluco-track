export type NearbyPlaceCategory = 'pharmacy' | 'laboratory';

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  opening_hours: string | null;
  distance_meters: number;
  distance_label: string;
  latitude: number;
  longitude: number;
  maps_url: string | null;
};

export type NearbyPlacesResponse = {
  category: NearbyPlaceCategory;
  count: number;
  radius_m: number;
  results: NearbyPlace[];
};

/** Fixed 2 km search radius per product requirements. */
export const NEARBY_SEARCH_RADIUS_M = 2000;
