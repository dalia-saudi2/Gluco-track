import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { GlassWater } from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { waterIntakeService } from '../../services/waterIntakeService';
import type { WaterIntakeToday } from '../../types/waterIntake';

const QUICK_ADD_OPTIONS = [250, 500, 750] as const;

type Props = {
  D: DashboardPalette;
  patientId?: number;
  onIntakeChange?: (data: WaterIntakeToday) => void;
};

function formatLiters(ml: number): string {
  const liters = ml / 1000;
  return Number.isInteger(liters) ? `${liters}` : liters.toFixed(1);
}

function formatLastLogged(iso: string | null | undefined): string {
  if (!iso) return 'Tap a glass or quick add to log water';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Tap a glass or quick add to log water';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Last logged just now';
  if (mins < 60) return `Last logged ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `Last logged ${hours}h ${mins % 60}m ago`;
}

export function WaterIntakeCard({ D, patientId, onIntakeChange }: Props) {
  const s = useMemo(() => createStyles(D), [D]);
  const [data, setData] = useState<WaterIntakeToday | null>(null);
  const [loading, setLoading] = useState(Boolean(patientId));
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const today = await waterIntakeService.getToday(patientId);
      setData(today);
      onIntakeChange?.(today);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [patientId, onIntakeChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const intakeMl = data?.total_ml ?? 0;
  const goalMl = data?.goal_ml ?? 2500;
  const filledGlasses = data?.glasses_filled ?? 0;
  const cupsEquivalent = data?.cups_equivalent ?? 0;

  const addWater = async (ml: number) => {
    if (!patientId || adding) return;
    try {
      setAdding(true);
      const updated = await waterIntakeService.add(patientId, ml);
      setData(updated);
      onIntakeChange?.(updated);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={D.tertiary} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <View style={s.headerMain}>
          <Text style={s.sectionLabel}>WATER INTAKE</Text>
          <Text style={s.mainValue}>
            {formatLiters(intakeMl)} <Text style={s.unit}>L</Text>
          </Text>
          {cupsEquivalent > 0 ? (
            <Text style={s.cupsSub}>{cupsEquivalent} cups logged today</Text>
          ) : (
            <Text style={s.cupsSub}>Resets every 24 hours</Text>
          )}
        </View>
        <View style={s.iconCircle}>
          <GlassWater size={20} color={D.tertiary} />
        </View>
      </View>

      <Text style={s.lastLogged}>{formatLastLogged(data?.last_logged_at)}</Text>

      <View style={s.glassGrid}>
        {[0, 1].map((row) => (
          <View key={row} style={s.glassRow}>
            {Array.from({ length: 5 }, (_, col) => {
              const i = row * 5 + col;
              const filled = i < filledGlasses;
              return (
                <Pressable
                  key={i}
                  style={s.glassCell}
                  onPress={() => void addWater(250)}
                  disabled={adding || !patientId}
                >
                  <GlassWater
                    size={22}
                    color={filled ? D.tertiary : D.outlineVariant}
                    strokeWidth={filled ? 2 : 1.5}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={s.footerHead}>
        <Text style={s.quickAddLabel}>QUICK ADD</Text>
        <Text style={s.goalLabel}>
          GOAL: {formatLiters(goalMl)}L{data?.goal_reached ? ' ✓' : ''}
        </Text>
      </View>

      <View style={s.quickRow}>
        {QUICK_ADD_OPTIONS.map((ml) => (
          <Pressable
            key={ml}
            style={({ pressed }) => [s.quickBtn, (pressed || adding) && s.quickBtnPressed]}
            onPress={() => void addWater(ml)}
            disabled={adding || !patientId}
          >
            <Text style={s.quickBtnText}>{ml}ml</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    centered: { paddingVertical: 32, alignItems: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerMain: { flex: 1 },
    sectionLabel: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    mainValue: {
      fontFamily: DF.bold,
      fontSize: 32,
      color: D.tertiary,
      marginTop: 4,
      lineHeight: 36,
    },
    unit: {
      fontFamily: DF.bold,
      fontSize: 18,
      color: D.tertiary,
    },
    cupsSub: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
      marginTop: 4,
    },
    lastLogged: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: D.surfaceContainerLow,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,150,204,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    glassGrid: { gap: 10, paddingVertical: 4 },
    glassRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    glassCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
    },
    footerHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    quickAddLabel: {
      fontFamily: DF.bold,
      fontSize: 9,
      color: D.onSurfaceVariant,
      letterSpacing: 1.2,
    },
    goalLabel: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.tertiary,
      letterSpacing: 0.3,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: D.surfaceContainerLow,
      borderWidth: 1,
      borderColor: D.outlineVariant,
      alignItems: 'center',
    },
    quickBtnPressed: { opacity: 0.85, backgroundColor: D.surfaceContainerHigh },
    quickBtnText: {
      fontFamily: DF.bold,
      fontSize: 12,
      color: D.onSurface,
    },
  });
}
