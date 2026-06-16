import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  User,
  Activity,
  Ruler,
  HeartPulse,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  ScanLine,
} from 'lucide-react-native';
import { CandyCard } from '../dashboard/CandyCard';
import { DF } from '../../constants/DashboardColors';
import type { DashboardPalette } from '../../constants/DashboardColors';

type Props = {
  D: DashboardPalette;
  pct: number;
  labPending: boolean;
  onUploadLab?: () => void;
};

const SECTIONS = [
  { key: 'demographics', label: 'Demographics', icon: User, colorKey: 'primary' as const },
  { key: 'lifestyle', label: 'Lifestyle', icon: Activity, colorKey: 'secondary' as const },
  { key: 'body', label: 'Body metrics', icon: Ruler, colorKey: 'tertiary' as const },
  { key: 'history', label: 'Medical history', icon: HeartPulse, colorKey: 'orange' as const },
  { key: 'lab', label: 'Lab results', icon: FlaskConical, colorKey: 'primary' as const },
];

const ICON_BG: Record<string, string> = {
  primary: 'rgba(224,64,160,0.12)',
  secondary: 'rgba(124,82,170,0.12)',
  tertiary: 'rgba(0,150,204,0.12)',
  orange: 'rgba(234,88,12,0.12)',
};

function StatusRow({
  D,
  s,
  label,
  icon: Icon,
  iconColor,
  iconBg,
  done,
}: {
  D: DashboardPalette;
  s: ReturnType<typeof createStyles>;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
  done: boolean;
}) {
  return (
    <View style={[s.row, !done && s.rowPending]}>
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
          <Icon size={15} color={iconColor} />
        </View>
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <View style={[s.statusBadge, done ? s.statusDone : s.statusMissing]}>
        {done ? (
          <CheckCircle2 size={14} color={D.green} />
        ) : (
          <AlertCircle size={14} color={D.orange} />
        )}
        <Text style={[s.statusText, done ? s.statusTextDone : s.statusTextMissing]}>
          {done ? 'Complete' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

export function ProfileCompletenessCard({ D, pct, labPending, onUploadLab }: Props) {
  const s = useMemo(() => createStyles(D), [D]);

  const colorFor = (key: string) => {
    const section = SECTIONS.find((x) => x.key === key);
    if (!section) return D.primary;
    if (section.colorKey === 'secondary') return D.secondary;
    if (section.colorKey === 'tertiary') return D.tertiary;
    if (section.colorKey === 'orange') return D.orange;
    return D.primary;
  };

  return (
    <View>
      <Text style={s.sectionLabel}>Health summary</Text>
      <CandyCard style={s.card} accent="secondary">
        <Text style={s.title}>Profile completeness</Text>

        <View style={s.barRow}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
          </View>
          <Text style={s.pct}>{pct}%</Text>
        </View>

        <View style={s.list}>
          {SECTIONS.map((section, index) => {
            const done = section.key === 'lab' ? !labPending : true;
            return (
              <React.Fragment key={section.key}>
                {index > 0 ? <View style={s.divider} /> : null}
                <StatusRow
                  D={D}
                  s={s}
                  label={section.label}
                  icon={section.icon}
                  iconColor={colorFor(section.key)}
                  iconBg={ICON_BG[section.colorKey]}
                  done={done}
                />
              </React.Fragment>
            );
          })}
        </View>

        {labPending && onUploadLab ? (
          <Pressable
            style={({ pressed }) => [s.uploadBtn, pressed && s.uploadBtnPressed]}
            onPress={onUploadLab}
          >
            <ScanLine size={16} color={D.onPrimary} />
            <Text style={s.uploadBtnText}>Upload your lab results</Text>
          </Pressable>
        ) : null}
      </CandyCard>
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    sectionLabel: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 10,
    },
    card: { padding: 16 },
    title: {
      fontFamily: DF.bold,
      fontSize: 15,
      color: D.onSurface,
      marginBottom: 12,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    progressTrack: {
      flex: 1,
      height: 10,
      backgroundColor: D.surfaceContainer,
      borderRadius: 999,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: D.primary,
    },
    pct: {
      fontFamily: DF.bold,
      fontSize: 14,
      color: D.primary,
      minWidth: 44,
      textAlign: 'right',
    },
    list: {
      borderRadius: 14,
      backgroundColor: D.surfaceContainerLow,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 11,
      gap: 10,
    },
    rowPending: {
      backgroundColor: 'rgba(245,158,11,0.06)',
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      fontFamily: DF.bold,
      fontSize: 13,
      color: D.onSurface,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusDone: {
      backgroundColor: '#dcfce7',
      borderWidth: 1,
      borderColor: '#bbf7d0',
    },
    statusMissing: {
      backgroundColor: '#ffedd5',
      borderWidth: 1,
      borderColor: '#fed7aa',
    },
    statusText: {
      fontFamily: DF.bold,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statusTextDone: { color: D.green },
    statusTextMissing: { color: D.orange },
    divider: {
      height: 1,
      backgroundColor: D.borderSubtle,
      marginHorizontal: 12,
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: D.primary,
    },
    uploadBtnPressed: { opacity: 0.88 },
    uploadBtnText: {
      fontFamily: DF.bold,
      fontSize: 13,
      color: D.onPrimary,
    },
  });
}
