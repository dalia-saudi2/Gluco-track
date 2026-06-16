import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlaskConical, X } from 'lucide-react-native';
import { DF } from '../../constants/DashboardColors';
import type { DashboardPalette } from '../../constants/DashboardColors';

type Props = {
  D: DashboardPalette;
  accountAgeDays?: number;
  onUpload: () => void;
  onDismissSession: () => void;
};

export function LabUploadBanner({ D, accountAgeDays = 0, onUpload, onDismissSession }: Props) {
  const urgent = accountAgeDays > 30;
  const bg = urgent ? 'rgba(229,62,62,0.12)' : 'rgba(245,158,11,0.14)';
  const border = urgent ? 'rgba(229,62,62,0.35)' : 'rgba(245,158,11,0.4)';
  const accent = urgent ? D.error : '#d97706';

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <FlaskConical size={20} color={accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: accent }]}>Complete your health profile</Text>
        <Text style={styles.sub}>
          Your risk score is estimated. Upload your lab results to get a full, accurate prediction.
        </Text>
        <View style={styles.actions}>
          <Pressable style={[styles.primaryBtn, { backgroundColor: accent }]} onPress={onUpload}>
            <Text style={styles.primaryText}>Upload lab results</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onDismissSession}>
            <Text style={styles.secondaryText}>Remind me later</Text>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={onDismissSession} hitSlop={8} style={styles.close}>
        <X size={16} color={D.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontFamily: DF.bold, fontSize: 14 },
  sub: { fontFamily: DF.medium, fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  primaryText: { fontFamily: DF.bold, fontSize: 11, color: '#fff' },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  secondaryText: { fontFamily: DF.bold, fontSize: 11, color: '#64748b' },
  close: { padding: 4 },
});
