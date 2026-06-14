import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import FoodList from './FoodList';
import NutritionGrid from './NutritionGrid';
import RiskBanner from './RiskBanner';
import GlucoseCurveChart from './GlucoseCurveChart';
import type { MealAnalysisParsed } from '../../services/mealAnalyzerService';
import { useTheme } from '../../contexts/ThemeContext';
import type { ColorScheme } from '../../constants/Colors';

export default function MealAnalyzerResultsPanel({
  analyzingStarted,
  isLoading,
  loadingMessage,
  error,
  results,
  currentGlucose,
}: {
  analyzingStarted: boolean;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  results: { parsed: MealAnalysisParsed; narrative: string } | null;
  currentGlucose: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createResultsStyles(colors), [colors]);

  if (!analyzingStarted) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Run an analysis to see detected foods, nutrition estimates, glucose risk, and personalized tips
          here.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBanner} accessibilityRole="alert">
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!results?.parsed) return null;

  const { parsed, narrative } = results;
  const tips = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

  return (
    <View style={styles.stack}>
      <FoodList foods={parsed.foods} />
      <NutritionGrid nutrition={parsed.nutrition} />
      <RiskBanner risk={parsed.risk} risk_description={parsed.risk_description} />
      <GlucoseCurveChart currentGlucose={currentGlucose} glucoseDelta={parsed.glucose_delta} />
      <View>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <View style={styles.card}>
          {tips.map((tip, i) => (
            <View key={i} style={[styles.bulletRow, i > 0 && styles.bulletBorder]}>
              <View style={styles.dot} />
              <Text style={styles.bulletText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
      <View>
        <Text style={styles.sectionTitle}>AI narrative</Text>
        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeText}>{narrative || 'No narrative provided.'}</Text>
        </View>
      </View>
    </View>
  );
}

function createResultsStyles(colors: ColorScheme) {
  return StyleSheet.create({
    placeholder: {
      minHeight: 280,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 320,
    },
    loadingBox: {
      minHeight: 280,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      padding: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    errorBanner: {
      backgroundColor: colors.errorLight,
      borderWidth: 1,
      borderColor: colors.errorBorder,
      borderRadius: 12,
      padding: 16,
    },
    errorTitle: { fontWeight: '700', color: colors.error, fontSize: 15 },
    errorBody: { marginTop: 8, color: colors.error, fontSize: 14, lineHeight: 20 },
    stack: { gap: 20 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingHorizontal: 16,
      paddingVertical: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    bulletRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12 },
    bulletBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#0F766E',
      marginTop: 6,
    },
    bulletText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
    narrativeBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: 16,
    },
    narrativeText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  });
}
