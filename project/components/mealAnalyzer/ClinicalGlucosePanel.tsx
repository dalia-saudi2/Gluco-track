import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { CandyCard } from '../dashboard/CandyCard';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import type { MealGlucosePredictResponse } from '../../services/clinicalMealService';

export default function ClinicalGlucosePanel({
  started,
  isLoading,
  loadingMessage,
  error,
  prediction,
  usdaCarbsDerived,
  photoInsight,
}: {
  started: boolean;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  prediction: MealGlucosePredictResponse | null;
  usdaCarbsDerived: number | null;
  photoInsight?: {
    carbsEstimateG: number;
    narrativePreview?: string;
    foods?: Array<{ name: string; portion: string; gi: string }>;
    nutrition?: { carbs: number; calories: number; protein: number; fat: number };
    recommendations?: string[];
  } | null;
}) {
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  if (!started) {
    return (
      <CandyCard style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Upload a meal photo (AI estimates carbs) or build the meal with USDA, then run prediction — the model
          reports whether glucose is more likely to go up or down (not medical advice).
        </Text>
      </CandyCard>
    );
  }

  if (isLoading) {
    return (
      <CandyCard style={styles.loadingBox}>
        <ActivityIndicator size="large" color={D.primary} />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </CandyCard>
    );
  }

  if (error) {
    return (
      <CandyCard style={styles.errorBanner} accent="orange">
        <Text style={styles.errorTitle}>Request failed</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </CandyCard>
    );
  }

  if (!prediction) return null;

  const dirLabel =
    prediction.direction === 'likely_up'
      ? 'Likely increase'
      : prediction.direction === 'likely_down'
        ? 'Likely decrease'
        : 'Uncertain';

  const dirLabelAr =
    prediction.direction === 'likely_up'
      ? 'السكر مرجّح يزيد (↑)'
      : prediction.direction === 'likely_down'
        ? 'السكر مرجّح يقل (↓)'
        : 'غير مؤكد — راجع القيم أو أعد المحاولة';

  const dirColor =
    prediction.direction === 'likely_up'
      ? D.orange
      : prediction.direction === 'likely_down'
        ? D.green
        : D.onSurfaceVariant;

  return (
    <View style={styles.stack}>
      {photoInsight ? (
        <CandyCard style={styles.card} accent="tertiary">
          <Text style={styles.sectionTitle}>From meal photo (AI)</Text>
          <Text style={styles.row}>Estimated carbs: {photoInsight.carbsEstimateG.toFixed(1)} g</Text>

          {photoInsight.foods && photoInsight.foods.length > 0 ? (
            <View style={styles.foodsList}>
              {photoInsight.foods.map((food, i) => (
                <View key={i} style={styles.foodTag}>
                  <Text style={styles.foodTagText}>
                    {food.name} ({food.portion}) • GI: {food.gi}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {photoInsight.nutrition ? (
            <View style={styles.macrosRow}>
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{photoInsight.nutrition.calories}</Text>
                <Text style={styles.macroLbl}>kcal</Text>
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{photoInsight.nutrition.carbs}g</Text>
                <Text style={styles.macroLbl}>carbs</Text>
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{photoInsight.nutrition.protein}g</Text>
                <Text style={styles.macroLbl}>protein</Text>
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.macroVal}>{photoInsight.nutrition.fat}g</Text>
                <Text style={styles.macroLbl}>fat</Text>
              </View>
            </View>
          ) : null}

          {photoInsight.narrativePreview ? (
            <Text style={styles.rowMuted}>{photoInsight.narrativePreview}</Text>
          ) : null}

          {photoInsight.recommendations && photoInsight.recommendations.length > 0 ? (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>Personalized Tips:</Text>
              {photoInsight.recommendations.map((rec, i) => (
                <Text key={i} style={styles.tipRow}>
                  • {rec}
                </Text>
              ))}
            </View>
          ) : null}
        </CandyCard>
      ) : null}

      {prediction.prediction_rejected ? (
        <CandyCard style={styles.rejectCard} accent="orange">
          <Text style={styles.rejectTitle}>Prediction withheld</Text>
          <Text style={styles.rejectBody}>{prediction.rejection_reason || 'Validation failed.'}</Text>
        </CandyCard>
      ) : (
        <CandyCard style={[styles.directionCard, { borderLeftColor: dirColor }]} accent="primary">
          <Text style={styles.directionLabel}>Model direction</Text>
          <Text style={[styles.directionValue, { color: dirColor }]}>{dirLabel}</Text>
          <Text style={styles.directionAr}>{dirLabelAr}</Text>
          <Text style={styles.probText}>P(up) ≈ {(prediction.probability_up * 100).toFixed(1)}%</Text>
        </CandyCard>
      )}

      <CandyCard style={styles.card}>
        <Text style={styles.sectionTitle}>Validated inputs</Text>
        <Text style={styles.row}>Carbs used (g): {prediction.carbs_g_validated.toFixed(1)}</Text>
        {usdaCarbsDerived != null && (
          <Text style={styles.rowMuted}>USDA-derived meal carbs (g): {usdaCarbsDerived.toFixed(1)}</Text>
        )}
        {prediction.carbs_recalibrated ? (
          <Text style={styles.flag}>Carbs were recalibrated or capped — review portions.</Text>
        ) : null}
        {prediction.glucose_delta_estimate_mg_dl != null ? (
          <Text style={styles.row}>
            Heuristic Δ glucose (mg/dL): {prediction.glucose_delta_estimate_mg_dl.toFixed(1)}
          </Text>
        ) : null}
      </CandyCard>

      {prediction.validation_flags?.length ? (
        <CandyCard style={styles.card}>
          <Text style={styles.sectionTitle}>Validation flags</Text>
          {prediction.validation_flags.map((f, i) => (
            <Text key={i} style={styles.flag}>
              • {f}
            </Text>
          ))}
        </CandyCard>
      ) : null}

      <Text style={styles.disclaimer}>{prediction.disclaimer}</Text>
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    placeholder: {
      minHeight: 280,
      padding: 24,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    placeholderText: {
      fontFamily: DF.medium,
      fontSize: 14,
      color: D.onSurfaceVariant,
      lineHeight: 21,
      textAlign: 'center' as const,
    },
    loadingBox: {
      minHeight: 220,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 12,
      padding: 24,
    },
    loadingText: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant },
    errorBanner: { padding: 16 },
    errorTitle: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface, marginBottom: 6 },
    errorBody: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant },
    stack: { gap: 14 },
    directionCard: {
      padding: 16,
      borderLeftWidth: 4,
    },
    directionLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 1 },
    directionValue: { fontFamily: DF.bold, fontSize: 22, marginTop: 4 },
    directionAr: {
      fontFamily: DF.bold,
      fontSize: 15,
      color: D.onSurfaceVariant,
      marginTop: 6,
      writingDirection: 'rtl' as const,
      alignSelf: 'flex-start' as const,
    },
    probText: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant, marginTop: 6 },
    rejectCard: { padding: 16 },
    rejectTitle: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface },
    rejectBody: { fontFamily: DF.medium, fontSize: 14, color: D.onSurfaceVariant, marginTop: 8 },
    card: { padding: 14 },
    sectionTitle: { fontFamily: DF.bold, fontSize: 14, color: D.onSurface, marginBottom: 8 },
    row: { fontFamily: DF.medium, fontSize: 14, color: D.onSurface },
    rowMuted: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant, marginTop: 4 },
    flag: { fontFamily: DF.medium, fontSize: 13, color: D.orange, marginTop: 6 },
    disclaimer: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant, lineHeight: 16 },
    foodsList: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 10, marginBottom: 10 },
    foodTag: { backgroundColor: D.surfaceContainerHigh, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    foodTagText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurface },
    macrosRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, backgroundColor: D.surfaceContainerLow, borderRadius: 14, padding: 12, marginTop: 10, marginBottom: 10 },
    macroCol: { alignItems: 'center' as const, flex: 1 },
    macroVal: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface },
    macroLbl: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' as const, marginTop: 2 },
    tipsBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: D.borderSubtle, paddingTop: 10 },
    tipsTitle: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface, marginBottom: 4 },
    tipRow: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant, lineHeight: 18, marginTop: 4 },
  };
}
