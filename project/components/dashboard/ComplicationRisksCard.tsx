import React, { useMemo } from 'react';

import { View, Text, StyleSheet, Pressable, Image } from 'react-native';

import { useRouter } from 'expo-router';

import { Eye, Brain } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { CandyCard } from './CandyCard';

import { DF } from '../../constants/DashboardColors';

import type { DashboardPalette } from '../../constants/DashboardColors';

import type { RiskSummary } from '../../types/riskSummary';

const NEPHROPATHY_ICON = require('../../assets/images/nephropathy-kidney.png');

type ComplicationItem = {
  key: 'retinopathy' | 'nephropathy' | 'neuropathy';
  label: string;
  icon?: LucideIcon;
};

type Props = {
  D: DashboardPalette;
  summary: RiskSummary | null;
};



type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';



function toPercent(value?: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
}

function formatRiskPercent(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${toPercent(value)}%`;
}

function normalizeLevel(raw?: string | null, fallbackPct?: number): RiskLevel {
  const band = (raw || '').toUpperCase();
  if (band === 'HIGH' || band === 'CRITICAL') return 'HIGH';
  if (band === 'MODERATE') return 'MODERATE';
  if (band === 'LOW') return 'LOW';
  const pct = fallbackPct ?? 0;
  if (pct >= 50) return 'HIGH';
  if (pct >= 20) return 'MODERATE';
  return 'LOW';
}



function levelStyle(level: RiskLevel, D: DashboardPalette) {
  if (level === 'HIGH') return { color: D.error };
  if (level === 'MODERATE') return { color: D.secondary };
  return { color: D.onSurfaceVariant };
}

function complicationIconStyle(key: ComplicationItem['key'], D: DashboardPalette) {
  switch (key) {
    case 'retinopathy':
      return { iconBg: 'rgba(224,64,160,0.12)', icon: D.primary };
    case 'nephropathy':
      return { iconBg: 'rgba(0,0,0,0.04)', icon: D.onSurfaceVariant };
    case 'neuropathy':
      return { iconBg: 'rgba(124,82,170,0.12)', icon: D.secondary };
  }
}

function ComplicationIconCell({
  item,
  iconBg,
  iconColor,
  styles,
}: {
  item: ComplicationItem;
  iconBg: string;
  iconColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const isKidney = item.key === 'nephropathy';
  const Icon = item.icon;

  return (
    <View
      style={[
        styles.iconWrap,
        isKidney ? styles.iconWrapNephropathy : null,
        { backgroundColor: isKidney ? '#FFFFFF' : iconBg },
      ]}
    >
      {isKidney ? (
        <Image source={NEPHROPATHY_ICON} style={styles.kidneyIcon} resizeMode="cover" />
      ) : Icon ? (
        <Icon size={18} color={iconColor} strokeWidth={2} />
      ) : null}
    </View>
  );
}

export function ComplicationRisksCard({ D, summary }: Props) {
  const router = useRouter();
  const s = useMemo(() => createStyles(D), [D]);

  const items: ComplicationItem[] = [
    { key: 'retinopathy', label: 'Retinopathy', icon: Eye },
    { key: 'nephropathy', label: 'Nephropathy' },
    { key: 'neuropathy', label: 'Neuropathy', icon: Brain },
  ];

  if (!summary) {
    return (
      <CandyCard style={s.card}>
        <Text style={s.title}>Complication Risks</Text>
        {items.map((item) => {
          const iconStyle = complicationIconStyle(item.key, D);
          return (
            <View key={item.key} style={s.row}>
              <ComplicationIconCell item={item} iconBg={iconStyle.iconBg} iconColor={iconStyle.icon} styles={s} />
              <Text style={s.rowLabel}>{item.label}</Text>
              <Text style={[s.rowValue, { color: D.onSurfaceVariant }]}>Pending</Text>
            </View>
          );
        })}
        <View style={s.noteBox}>
          <Text style={s.noteText}>
            Complete your clinical information to receive AI predictions for retinopathy, nephropathy, and neuropathy.
          </Text>
        </View>
        <Pressable style={s.actionBtn} onPress={() => router.push('/complete-health-profile')}>
          <Text style={s.actionBtnText}>Complete health profile</Text>
        </Pressable>
      </CandyCard>
    );
  }

  const detailItems = [
    { key: 'retinopathy' as const, label: 'Retinopathy', icon: Eye, value: summary.retinopathy_risk, level: summary.retinopathy_risk_level },
    { key: 'nephropathy' as const, label: 'Nephropathy', value: summary.nephropathy_risk, level: summary.nephropathy_risk_level },
    { key: 'neuropathy' as const, label: 'Neuropathy', icon: Brain, value: summary.neuropathy_risk, level: summary.neuropathy_risk_level },
  ];

  const confidenceLabel = summary.complication_confidence
    ? summary.complication_confidence.replace('_', ' ')
    : summary.complication_model || summary.model_name || 'model';

  return (
    <CandyCard style={s.card}>
      <Text style={s.title}>Complication Risks</Text>

      {detailItems.map((item) => {

        const pct = toPercent(item.value);
        const level = normalizeLevel(item.level, pct);
        const palette = levelStyle(level, D);
        const iconStyle = complicationIconStyle(item.key, D);
        const pctLabel = formatRiskPercent(item.value);

        return (
          <View key={item.key} style={s.row}>
            <ComplicationIconCell
              item={{ key: item.key, label: item.label, icon: item.icon }}
              iconBg={iconStyle.iconBg}
              iconColor={iconStyle.icon}
              styles={s}
            />
            <Text style={s.rowLabel}>{item.label}</Text>
            <View style={s.rowRight}>
              <Text style={[s.rowPct, { color: palette.color }]}>{pctLabel}</Text>
              <Text style={[s.rowLevel, { color: palette.color }]}>{level}</Text>
            </View>
          </View>
        );
      })}

      <View style={s.noteBox}>
        <Text style={s.noteText}>
          Percentages are model probability estimates ({confidenceLabel}). Bands: LOW / MODERATE / HIGH.
        </Text>

      </View>

      <Pressable style={s.actionBtn} onPress={() => router.push('/log-lab-visit')}>
        <Text style={s.actionBtnText}>Log new lab visit</Text>
      </Pressable>

    </CandyCard>

  );

}



function createStyles(D: DashboardPalette) {

  return StyleSheet.create({

    card: { padding: 16, flex: 1, minWidth: 240 },

    title: {

      fontFamily: DF.bold,

      fontSize: 9,

      color: D.secondary,

      textTransform: 'uppercase',

      letterSpacing: 1.5,

      marginBottom: 14,

    },

    row: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: 10,

      paddingVertical: 10,

      borderBottomWidth: 1,

      borderBottomColor: D.borderSubtle,

    },

    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    iconWrapNephropathy: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
    },

    kidneyIcon: {
      width: 46,
      height: 46,
    },

    rowLabel: { flex: 1, fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
    rowRight: { alignItems: 'flex-end', gap: 2 },
    rowPct: { fontFamily: DF.bold, fontSize: 16, lineHeight: 20 },
    rowLevel: { fontFamily: DF.bold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
    rowValue: { fontFamily: DF.bold, fontSize: 11, textTransform: 'uppercase' },

    noteBox: {

      marginTop: 12,

      backgroundColor: 'rgba(124,82,170,0.08)',

      borderRadius: 12,

      padding: 10,

    },

    noteText: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, lineHeight: 14 },

    actionBtn: {
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: D.primary,
      alignItems: 'center',
    },
    actionBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onPrimary },

  });

}

