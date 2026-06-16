import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AlertTriangle } from 'lucide-react-native';
import { CandyCard } from './CandyCard';
import { DF } from '../../constants/DashboardColors';
import type { DashboardPalette } from '../../constants/DashboardColors';
import type { RiskSummary } from '../../types/riskSummary';

type Props = {
  D: DashboardPalette;
  summary: RiskSummary;
  onUploadLab: () => void;
};

function RiskGauge({
  score,
  featuresUsed,
  featuresTotal,
  color,
  incomplete,
}: {
  score: number;
  featuresUsed: number;
  featuresTotal: number;
  color: string;
  incomplete: boolean;
}) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filledPct = featuresUsed / Math.max(featuresTotal, 1);
  const scorePct = Math.min(score, 100) / 100;
  const filledLen = circumference * filledPct * scorePct;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      <G rotation="-90" origin={`${cx}, ${cy}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${filledLen} ${circumference - filledLen}`}
          strokeLinecap="round"
        />
        {incomplete ? (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray="4 6"
            strokeDashoffset={filledLen}
            strokeLinecap="round"
            opacity={0.4}
          />
        ) : null}
      </G>
    </Svg>
  );
}

const PILL_LABELS: { key: keyof RiskSummary['feature_pills']; label: string }[] = [
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'body', label: 'Body' },
  { key: 'history', label: 'History' },
  { key: 'lab_results', label: 'Lab results' },
];

export function IncompleteRiskCard({ D, summary, onUploadLab }: Props) {
  const s = useMemo(() => createStyles(D), [D]);
  const scorePrefix = summary.is_estimated ? '~' : '';
  const stageLabel = summary.diabetes_stage_label;

  return (
    <CandyCard style={s.card} accent="primary">
      <View style={s.incompleteBadge}>
        <AlertTriangle size={14} color="#d97706" />
        <Text style={s.incompleteText}>Incomplete Profile</Text>
      </View>

      <View style={s.mainRow}>
        <View style={s.gaugeWrap}>
          <RiskGauge
            score={summary.risk_score}
            featuresUsed={summary.features_used}
            featuresTotal={summary.features_total}
            color={D.primary}
            incomplete={!summary.lab_data_complete}
          />
          <View style={s.gaugeCenter}>
            <Text style={s.scoreValue}>
              {scorePrefix}
              {Math.round(summary.risk_score)}
            </Text>
            <Text style={s.scoreOf}>/ 100</Text>
          </View>
        </View>

        <View style={s.meta}>
          <Text style={s.riskLabel}>Risk Score {summary.is_estimated ? '(estimated)' : ''}</Text>
          <View style={s.stageBadge}>
            <Text style={s.stageText}>Stage: {stageLabel}</Text>
          </View>
          <View style={s.track}>
            <View style={[s.trackFill, { width: `${summary.risk_score}%` }]} />
          </View>
          <Text style={s.featureLine}>
            Based on {summary.features_used} of {summary.features_total} features
          </Text>
          {summary.is_estimated ? (
            <Text style={s.hint}>Lab results needed for full accuracy</Text>
          ) : null}
        </View>
      </View>

      <View style={s.pillRow}>
        {PILL_LABELS.map(({ key, label }) => {
          const done = summary.feature_pills[key];
          const isLab = key === 'lab_results';
          return (
            <Pressable
              key={key}
              onPress={isLab && !done ? onUploadLab : undefined}
              style={[s.pill, !done && s.pillMissing]}
            >
              <Text style={s.pillText}>
                {done ? '✅' : '❌'} {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </CandyCard>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    card: { padding: 18 },
    incompleteBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(245,158,11,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    incompleteText: { fontFamily: DF.bold, fontSize: 11, color: '#b45309' },
    mainRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    gaugeWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    gaugeCenter: { position: 'absolute', alignItems: 'center' },
    scoreValue: { fontFamily: DF.bold, fontSize: 26, color: D.primary },
    scoreOf: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant },
    meta: { flex: 1 },
    riskLabel: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
    stageBadge: {
      marginTop: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(224,64,160,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    stageText: { fontFamily: DF.bold, fontSize: 10, color: D.primary },
    track: {
      height: 6,
      backgroundColor: D.surfaceContainer,
      borderRadius: 999,
      marginTop: 10,
      overflow: 'hidden',
    },
    trackFill: { height: '100%', backgroundColor: D.primary, borderRadius: 999 },
    featureLine: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant, marginTop: 8 },
    hint: { fontFamily: DF.medium, fontSize: 10, color: '#d97706', marginTop: 4 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: D.surfaceContainer,
      borderWidth: 1,
      borderColor: D.borderSubtle,
    },
    pillMissing: { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.08)' },
    pillText: { fontFamily: DF.bold, fontSize: 10, color: D.onSurface },
  });
}
