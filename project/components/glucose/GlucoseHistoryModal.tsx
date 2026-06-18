import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { glucoseReadingsService } from '../../services/glucoseReadingsService';
import { formatMeasuredAt, formatReadingType } from '../../utils/glucoseReadingClassify';
import type { GlucoseReading, GlucoseStatus } from '../../types/glucoseReading';
import { STATUS_LABELS } from '../../types/glucoseReading';
import { DUMMY_GLUCOSE_READINGS } from '../../utils/dummyGlucoseReadings';

type Props = {
  visible: boolean;
  patientId?: number;
  onClose: () => void;
};

function statusColors(status: GlucoseStatus, D: DashboardPalette) {
  if (status === 'normal') return { bg: '#f0fdf4', color: D.green, border: '#dcfce7' };
  if (status === 'elevated') return { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' };
  if (status === 'high') return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
  return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
}

export function GlucoseHistoryModal({ visible, patientId, onClose }: Props) {
  const D = useD();
  const s = useMemo(() => createStyles(D), [D]);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [total, setTotal] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) {
      setReadings(DUMMY_GLUCOSE_READINGS);
      setTotal(DUMMY_GLUCOSE_READINGS.length);
      setIsDemo(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await glucoseReadingsService.list(patientId, 1, 100, 'desc');
      if (data.items.length === 0) {
        setReadings(DUMMY_GLUCOSE_READINGS);
        setTotal(DUMMY_GLUCOSE_READINGS.length);
        setIsDemo(true);
      } else {
        setReadings(data.items);
        setTotal(data.total);
        setIsDemo(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load readings.');
      setReadings(DUMMY_GLUCOSE_READINGS);
      setTotal(DUMMY_GLUCOSE_READINGS.length);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (visible) {
      void load();
    }
  }, [visible, load]);

  const displayReadings = readings;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />
        <View style={[s.panel, isWide && s.panelWide]}>
          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title}>Glucose history</Text>
              <Text style={s.subtitle}>
                {isDemo
                  ? 'Sample readings for preview'
                  : total > 0
                    ? `${total} reading${total === 1 ? '' : 's'} on record`
                    : 'All your readings'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <X size={20} color={D.onSurfaceVariant} />
            </Pressable>
          </View>

          {loading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={D.primary} />
            </View>
          ) : error && displayReadings.length === 0 ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
              <Pressable onPress={() => void load()}>
                <Text style={s.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {isDemo ? (
                <View style={s.demoBanner}>
                  <Text style={s.demoBannerText}>
                    Demo data — add a real reading with + on the glucose card
                  </Text>
                </View>
              ) : null}
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={!isWide}>
              <ScrollView
                style={s.tableScroll}
                contentContainerStyle={s.tableScrollContent}
                nestedScrollEnabled
              >
                <View style={s.table}>
                  <View style={s.tableHead}>
                    <Text style={[s.th, s.colDate]}>Date & time</Text>
                    <Text style={[s.th, s.colValue]}>mg/dL</Text>
                    <Text style={[s.th, s.colType]}>Type</Text>
                    <Text style={[s.th, s.colStatus]}>Status</Text>
                    <Text style={[s.th, s.colNotes]}>Notes</Text>
                  </View>

                  {displayReadings.map((r, index) => {
                    const badge = statusColors(r.status, D);
                    return (
                      <View key={r.id} style={[s.tableRow, index % 2 === 1 && s.tableRowAlt]}>
                        <Text style={[s.td, s.colDate]} numberOfLines={2}>
                          {formatMeasuredAt(r.measured_at)}
                        </Text>
                        <Text style={[s.td, s.colValue, s.valueCell]}>{r.value_mgdl}</Text>
                        <Text style={[s.td, s.colType]}>{formatReadingType(r.reading_type)}</Text>
                        <View style={[s.colStatus, s.statusCell]}>
                          <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                            <Text style={[s.badgeText, { color: badge.color }]}>
                              {STATUS_LABELS[r.status]}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.td, s.colNotes, !r.notes && s.notesEmpty]} numberOfLines={2}>
                          {r.notes?.trim() || '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    backdropTap: { ...StyleSheet.absoluteFillObject },
    panel: {
      maxHeight: '88%',
      backgroundColor: D.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
      borderWidth: 1,
      borderColor: D.cardBorder,
      borderBottomWidth: 0,
    },
    panelWide: {
      maxWidth: 720,
      alignSelf: 'center',
      width: '100%',
      borderRadius: 24,
      marginBottom: 24,
      borderBottomWidth: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: D.cardBorder,
    },
    headerText: { flex: 1, paddingRight: 12 },
    title: { fontFamily: DF.bold, fontSize: 20, color: D.onSurface },
    subtitle: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 4 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: D.surfaceContainerLow,
    },
    centered: { paddingVertical: 48, alignItems: 'center' },
    demoBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: 'rgba(0,150,204,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(0,150,204,0.25)',
    },
    demoBannerText: {
      fontFamily: DF.medium,
      fontSize: 12,
      color: '#0369a1',
      textAlign: 'center',
    },
    tableScroll: { maxHeight: 480 },
    tableScrollContent: { paddingHorizontal: 16, paddingVertical: 12 },
    table: {
      minWidth: 560,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: D.cardBorder,
      overflow: 'hidden',
    },
    tableHead: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: D.surfaceContainerHigh,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 12,
      backgroundColor: D.surface,
      borderTopWidth: 1,
      borderTopColor: D.cardBorder,
    },
    tableRowAlt: { backgroundColor: D.surfaceContainerLow },
    th: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    td: {
      fontFamily: DF.medium,
      fontSize: 13,
      color: D.onSurface,
    },
    colDate: { width: 130 },
    colValue: { width: 56, textAlign: 'right' },
    colType: { width: 88 },
    colStatus: { width: 96 },
    colNotes: { flex: 1, minWidth: 120 },
    valueCell: { fontFamily: DF.bold, color: D.primary, fontSize: 15 },
    statusCell: { alignItems: 'flex-start' },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: { fontFamily: DF.bold, fontSize: 10 },
    notesEmpty: { color: D.onSurfaceVariant },
    errorBox: {
      margin: 20,
      padding: 14,
      borderRadius: 12,
      backgroundColor: 'rgba(229,62,62,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(229,62,62,0.2)',
    },
    errorText: { fontFamily: DF.medium, fontSize: 13, color: D.error },
    retryText: { fontFamily: DF.bold, fontSize: 13, color: D.primary, marginTop: 8 },
  });
}
