import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MealFoodItem } from '../../services/mealAnalyzerService';
import { useTheme } from '../../contexts/ThemeContext';
import type { ColorScheme } from '../../constants/Colors';

function GiBadge({
  gi,
  neutral,
}: {
  gi: string;
  neutral: { bg: string; text: string; border: string };
}) {
  const g = String(gi || '').toLowerCase();
  const palette =
    g === 'low'
      ? { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' }
      : g === 'medium'
        ? { bg: '#FEF9C3', text: '#854D0E', border: '#FEF08A' }
        : g === 'high'
          ? { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' }
          : neutral;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[badgeStyles.badgeText, { color: palette.text }]}>GI: {g || '—'}</Text>
    </View>
  );
}

export default function FoodList({ foods }: { foods: MealFoodItem[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createFoodListStyles(colors), [colors]);
  const list = Array.isArray(foods) ? foods : [];

  const neutralGi = {
    bg: colors.surface,
    text: colors.textSecondary,
    border: colors.border,
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Food detected</Text>
      {list.length === 0 ? (
        <Text style={styles.empty}>No foods listed.</Text>
      ) : (
        list.map((item, i) => (
          <View key={`${item.name}-${i}`} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={styles.rowMain}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.portion}>{item.portion}</Text>
            </View>
            <GiBadge gi={item.gi} neutral={neutralGi} />
          </View>
        ))
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});

function createFoodListStyles(colors: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    empty: { color: colors.textSecondary, paddingVertical: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    rowMain: { flex: 1, minWidth: 0 },
    foodName: { fontSize: 15, fontWeight: '600', color: colors.text },
    portion: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  });
}
