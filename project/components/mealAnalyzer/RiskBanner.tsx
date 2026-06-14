import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

export default function RiskBanner({
  risk,
  risk_description,
}: {
  risk: string;
  risk_description: string;
}) {
  const r = String(risk || '').toLowerCase();
  const palette =
    r === 'low'
      ? { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0', icon: '#166534' }
      : r === 'medium'
        ? { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', icon: '#92400E' }
        : r === 'high'
          ? { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA', icon: '#991B1B' }
          : { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: '#475569' };

  const label =
    r === 'low'
      ? 'Low risk'
      : r === 'medium'
        ? 'Medium risk'
        : r === 'high'
          ? 'High risk'
          : `Risk: ${risk}`;

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <AlertCircle size={28} color={palette.icon} strokeWidth={2} />
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.desc, { color: palette.text }]}>{risk_description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textCol: { flex: 1, minWidth: 0 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  desc: { fontSize: 15, marginTop: 6, lineHeight: 22 },
});
