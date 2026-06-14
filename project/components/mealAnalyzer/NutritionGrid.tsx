import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MealNutrition } from '../../services/mealAnalyzerService';
import { useTheme } from '../../contexts/ThemeContext';
import type { ColorScheme } from '../../constants/Colors';

function MetricCard({
  label,
  value,
  unit,
  styles: s,
}: {
  label: string;
  value: string | number;
  unit: string;
  styles: ReturnType<typeof createNutritionStyles>;
}) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>
        {value}
        <Text style={s.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

export default function NutritionGrid({ nutrition }: { nutrition: Partial<MealNutrition> }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createNutritionStyles(colors), [colors]);
  const n = nutrition || {};

  return (
    <View>
      <Text style={styles.sectionTitle}>Nutritional summary</Text>
      <View style={styles.grid}>
        <MetricCard label="Carbohydrates" value={n.carbs ?? '—'} unit="g" styles={styles} />
        <MetricCard label="Calories" value={n.calories ?? '—'} unit="kcal" styles={styles} />
        <MetricCard label="Protein" value={n.protein ?? '—'} unit="g" styles={styles} />
        <MetricCard label="Fat" value={n.fat ?? '—'} unit="g" styles={styles} />
      </View>
    </View>
  );
}

function createNutritionStyles(colors: ColorScheme) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metric: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metricValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 8 },
    metricUnit: { fontSize: 14, fontWeight: '400', color: colors.textTertiary },
  });
}
