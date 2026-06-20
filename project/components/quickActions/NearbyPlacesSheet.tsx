import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  Platform,
} from 'react-native';
import {
  X,
  MapPin,
  Phone,
  Navigation,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import type { NearbyPlace, NearbyPlaceCategory } from '../../types/nearbyPlaces';
import { NEARBY_SEARCH_RADIUS_M } from '../../types/nearbyPlaces';
import {
  categorySubtitle,
  categoryTitle,
  fetchNearbyPlaces,
  requestUserLocation,
} from '../../services/nearbyPlacesService';
import { dialPhone } from '../../utils/callContact';
import { openMapDirections } from '../../utils/placeActions';

type Props = {
  visible: boolean;
  category: NearbyPlaceCategory | null;
  onClose: () => void;
};

type LoadState = 'idle' | 'locating' | 'loading' | 'ready' | 'error';

export function NearbyPlacesSheet({ visible, category, onClose }: Props) {
  const D = useD();
  const { height } = useWindowDimensions();
  const s = useMemo(() => createStyles(D), [D]);

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(
    async (opts?: { skipCache?: boolean }) => {
      if (!category) return;

      setErrorMessage(null);
      setPermissionDenied(false);
      setLoadState('locating');

      const loc = await requestUserLocation();
      if (!loc.ok) {
        setPermissionDenied(loc.reason === 'denied');
        setLoadState('error');
        setErrorMessage(
          loc.reason === 'denied'
            ? 'Location permission is required to find nearby services.'
            : 'Could not determine your location. Enable GPS and try again.'
        );
        return;
      }

      setLoadState('loading');

      try {
        const before = Date.now();
        const results = await fetchNearbyPlaces(category, loc.coords, {
          skipCache: opts?.skipCache,
        });
        setFromCache(Date.now() - before < 80);
        setPlaces(results);
        setLoadState('ready');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load nearby places.';
        setLoadState('error');
        setErrorMessage(msg);
      }
    },
    [category]
  );

  useEffect(() => {
    if (visible && category) {
      void load();
    } else {
      setLoadState('idle');
      setPlaces([]);
      setErrorMessage(null);
      setPermissionDenied(false);
    }
  }, [visible, category, load]);

  const handleRefresh = () => void load({ skipCache: true });

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      void Linking.openURL('app-settings:');
    } else {
      void Linking.openSettings();
    }
  };

  if (!category) return null;

  const radiusKm = NEARBY_SEARCH_RADIUS_M / 1000;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { maxHeight: height * 0.92 }]}>
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title}>{categoryTitle(category)}</Text>
              <Text style={s.subtitle}>{categorySubtitle(category)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={s.iconBtn}>
              <X size={22} color={D.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={s.badgeRow}>
            <View style={s.osmBadge}>
              <Text style={s.osmBadgeText}>Powered by OpenStreetMap</Text>
            </View>
            <Text style={s.radiusText}>Within {radiusKm} km of you</Text>
          </View>

          {(loadState === 'locating' || loadState === 'loading') && (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={D.primary} />
              <Text style={s.loadingText}>
                {loadState === 'locating' ? 'Getting your location…' : 'Searching nearby…'}
              </Text>
            </View>
          )}

          {loadState === 'error' && (
            <View style={s.centered}>
              <AlertCircle size={36} color={D.orange} />
              <Text style={s.errorTitle}>Unable to load results</Text>
              <Text style={s.errorBody}>{errorMessage}</Text>
              {permissionDenied ? (
                <Pressable style={s.primaryBtn} onPress={openSettings}>
                  <Text style={s.primaryBtnText}>Open settings</Text>
                </Pressable>
              ) : (
                <Pressable style={s.primaryBtn} onPress={handleRefresh}>
                  <Text style={s.primaryBtnText}>Try again</Text>
                </Pressable>
              )}
            </View>
          )}

          {loadState === 'ready' && places.length === 0 && (
            <View style={s.centered}>
              <MapPin size={36} color={D.onSurfaceVariant} />
              <Text style={s.errorTitle}>No results found</Text>
              <Text style={s.errorBody}>
                No {category === 'pharmacy' ? 'pharmacies' : 'laboratories'} found within{' '}
                {radiusKm} km. Try again later or move to a different area.
              </Text>
              <Pressable style={s.primaryBtn} onPress={handleRefresh}>
                <Text style={s.primaryBtnText}>Refresh</Text>
              </Pressable>
            </View>
          )}

          {loadState === 'ready' && places.length > 0 && (
            <>
              <View style={s.metaRow}>
                <Text style={s.metaText}>
                  {places.length} result{places.length === 1 ? '' : 's'}
                  {fromCache ? ' · cached' : ''}
                </Text>
                <Pressable style={s.refreshBtn} onPress={handleRefresh}>
                  <RefreshCw size={14} color={D.primary} />
                  <Text style={s.refreshText}>Refresh</Text>
                </Pressable>
              </View>
              <ScrollView
                style={s.list}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
              >
                {places.map((place) => (
                  <PlaceCard key={place.id} place={place} D={D} />
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function PlaceCard({ place, D }: { place: NearbyPlace; D: DashboardPalette }) {
  const s = useMemo(() => createCardStyles(D), [D]);

  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.name}>{place.name}</Text>
        <View style={s.distanceBadge}>
          <Text style={s.distanceText}>{place.distance_label}</Text>
        </View>
      </View>

      {place.address ? (
        <View style={s.row}>
          <MapPin size={13} color={D.onSurfaceVariant} />
          <Text style={s.rowText}>{place.address}</Text>
        </View>
      ) : null}

      {place.opening_hours ? (
        <View style={s.row}>
          <Clock size={13} color={D.onSurfaceVariant} />
          <Text style={s.rowText}>{place.opening_hours}</Text>
        </View>
      ) : null}

      {place.phone ? (
        <View style={s.row}>
          <Phone size={13} color={D.onSurfaceVariant} />
          <Text style={s.rowText}>{place.phone}</Text>
        </View>
      ) : null}

      <View style={s.actions}>
        {place.phone ? (
          <Pressable style={s.actionBtn} onPress={() => void dialPhone(place.phone!)}>
            <Phone size={14} color={D.secondary} />
            <Text style={s.actionText}>Call</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={s.actionBtn}
          onPress={() => void openMapDirections(place.latitude, place.longitude, place.name)}
        >
          <Navigation size={14} color={D.tertiary} />
          <Text style={s.actionText}>Open in Maps</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: D.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: D.outlineVariant,
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
    },
    headerText: { flex: 1, paddingRight: 12 },
    title: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
    subtitle: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 4 },
    iconBtn: { padding: 4 },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    osmBadge: {
      backgroundColor: D.surfaceContainerLow,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    osmBadgeText: { fontFamily: DF.bold, fontSize: 9, color: D.onSurfaceVariant },
    radiusText: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant },
    centered: { alignItems: 'center', padding: 32, gap: 10 },
    loadingText: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant },
    errorTitle: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface, marginTop: 8 },
    errorBody: {
      fontFamily: DF.medium,
      fontSize: 13,
      color: D.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    primaryBtn: {
      marginTop: 8,
      backgroundColor: D.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
    },
    primaryBtnText: { fontFamily: DF.bold, fontSize: 13, color: D.onPrimary },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    metaText: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    refreshText: { fontFamily: DF.bold, fontSize: 11, color: D.primary },
    list: { flexGrow: 0 },
    listContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  });
}

function createCardStyles(D: DashboardPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: D.outlineVariant,
      backgroundColor: D.surfaceContainerLow,
      padding: 14,
      gap: 8,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    name: { flex: 1, fontFamily: DF.bold, fontSize: 14, color: D.onSurface },
    distanceBadge: {
      backgroundColor: 'rgba(224,64,160,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    distanceText: { fontFamily: DF.bold, fontSize: 10, color: D.primary },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    rowText: {
      flex: 1,
      fontFamily: DF.medium,
      fontSize: 12,
      color: D.onSurfaceVariant,
      lineHeight: 17,
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: D.outlineVariant,
      backgroundColor: D.surface,
    },
    actionText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurface },
  });
}
