import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity } from 'lucide-react-native';
import { CandyCard } from './CandyCard';
import { DF } from '../../constants/DashboardColors';
import type { DashboardPalette } from '../../constants/DashboardColors';
import type { RiskSummary } from '../../types/riskSummary';

type Props = {
  D: DashboardPalette;
  summary: RiskSummary | null;
  onRunPrediction?: () => void;
  running?: boolean;
};

function formatStageLabel(label: string): string {
  const base = label.replace('(estimated)', '').trim();
  const lower = base.toLowerCase();
  if (lower === 'pre-diabetic') return 'Pre-Diabetic';
  if (lower === 'low risk') return 'Low Risk';
  if (lower === 'high risk') return 'High Risk';
  return base;
}

function formatPredictedAgo(iso?: string | null): string {
  if (!iso) return 'Not yet predicted';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'Last predicted today';
  if (days === 1) return 'Last predicted 1 day ago';
  return `Last predicted ${days} days ago`;
}

function progressRiskLabel(score: number, stage: number): string {
  if (stage >= 2 || score >= 70) return 'HIGH RISK';
  if (stage >= 1 || score >= 45) return 'ELEVATED RISK';
  return 'LOW RISK';
}

export function DiabetesStagePredictionCard({ D, summary, onRunPrediction, running }: Props) {
  const s = useMemo(() => createStyles(D), [D]);

  if (!summary) {
    return (
      <CandyCard style={s.card} accent="primary">
        <View style={s.header}>
          <Text style={s.title}>Diabetes Stage Prediction</Text>
          <View style={s.iconWrap}>
            <Activity size={16} color={D.primary} />
          </View>
        </View>
        <View style={s.placeholderBox}>
          <Text style={s.placeholderTitle}>No prediction available yet</Text>
          <Text style={s.placeholderText}>
            Complete your clinical information to receive AI predictions.
          </Text>
        </View>
      </CandyCard>
    );
  }

  const score = Math.round(summary.risk_score);
  const progressPct = Math.min(100, Math.max(8, score));
  const stageLabel = formatStageLabel(summary.diabetes_stage_label);
  const riskLabel = progressRiskLabel(summary.risk_score, summary.diabetes_stage);

  return (
    <CandyCard style={s.card} accent="primary">
      <View style={s.header}>
        <Text style={s.title}>Diabetes Stage Prediction</Text>
        <View style={s.iconWrap}>
          <Activity size={16} color={D.primary} />
        </View>
      </View>

      <View style={s.metricsRow}>
        <View style={s.metricCol}>
          <Text style={s.metricLabel}>Predicted Stage</Text>
          <View style={s.stagePill}>
            <Text style={s.stagePillText}>{stageLabel}</Text>
          </View>
        </View>
        <View style={s.metricCol}>
          <Text style={s.metricLabel}>Risk Score</Text>
          <Text style={s.scoreRow}>
            <Text style={s.scoreValue}>{summary.is_estimated ? '~' : ''}{score}</Text>
            <Text style={s.scoreDenom}> / 100</Text>
          </Text>
        </View>
      </View>

      <View style={s.progressHead}>
        <Text style={s.progressLabel}>Progress toward Type 2</Text>
        <Text style={[s.riskTag, riskLabel === 'LOW RISK' && s.riskTagLow]}>{riskLabel}</Text>
      </View>
      <View style={s.progressTrack}>
        <LinearGradient
          colors={['#60a5fa', '#818cf8', D.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.progressFill, { width: `${progressPct}%` }]}
        />
      </View>

      <View style={s.footer}>
        <Text style={s.footerNote}>{formatPredictedAgo(summary.predicted_at)}</Text>
        <Pressable
          style={[s.runBtn, running && s.runBtnDisabled]}
          onPress={onRunPrediction}
          disabled={running || !onRunPrediction}
        >
          {running ? (
            <ActivityIndicator size="small" color={D.onPrimary} />
          ) : (
            <Text style={s.runBtnText}>Run New Prediction</Text>
          )}
        </Pressable>
      </View>
    </CandyCard>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    card: { padding: 16, flex: 1, minWidth: 280 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    title: {
      fontFamily: DF.bold,
      fontSize: 9,
      color: D.primary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      flex: 1,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(224,64,160,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricsRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
    metricCol: { flex: 1 },
    metricLabel: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginBottom: 6 },
    stagePill: {
      alignSelf: 'flex-start',
      backgroundColor: '#dbeafe',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    stagePillText: { fontFamily: DF.bold, fontSize: 13, color: '#1d4ed8' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
    scoreValue: { fontFamily: DF.bold, fontSize: 28, color: D.onSurface, lineHeight: 32 },
    scoreDenom: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    progressLabel: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant },
    riskTag: { fontFamily: DF.bold, fontSize: 9, color: D.primary, letterSpacing: 0.5 },
    riskTagLow: { color: D.green },
    progressTrack: {
      height: 8,
      backgroundColor: D.surfaceContainer,
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: 14,
    },
    progressFill: { height: '100%', borderRadius: 999 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    footerNote: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, fontStyle: 'italic', flex: 1 },
    runBtn: {
      backgroundColor: D.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      minWidth: 140,
      alignItems: 'center',
    },
    runBtnDisabled: { opacity: 0.7 },
    runBtnText: { fontFamily: DF.bold, fontSize: 11, color: D.onPrimary },
    placeholderBox: {
      backgroundColor: D.surfaceContainerLow,
      borderRadius: 12,
      padding: 16,
      gap: 8,
      minHeight: 120,
      justifyContent: 'center',
    },
    placeholderTitle: { fontFamily: DF.bold, fontSize: 14, color: D.onSurface },
    placeholderText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, lineHeight: 18 },
  });
}
