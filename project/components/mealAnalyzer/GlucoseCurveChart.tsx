import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';
import type { ColorScheme } from '../../constants/Colors';

const LABELS = ['Now', '15m', '30m', '45m', '1h', '1h15m', '1h30m', '1h45m', '2h'];
const MINUTES = [0, 15, 30, 45, 60, 75, 90, 105, 120];

function glucoseAtMinute(t: number, current: number, delta: number): number {
  const d = Number(delta) || 0;
  const c = Number(current) || 0;
  if (t <= 60) {
    const phase = (1 - Math.cos((Math.PI * t) / 60)) / 2;
    return c + d * phase;
  }
  const phase = (1 + Math.cos((Math.PI * (t - 60)) / 60)) / 2;
  return c + d * phase;
}

export default function GlucoseCurveChart({
  currentGlucose,
  glucoseDelta,
}: {
  currentGlucose: number;
  glucoseDelta: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createChartStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();

  const { chartWidth, series, lowLine, highLine } = useMemo(() => {
    const seriesInner = MINUTES.map((m) =>
      Math.round(glucoseAtMinute(m, currentGlucose, glucoseDelta))
    );
    const low = MINUTES.map(() => 70);
    const high = MINUTES.map(() => 180);
    const chartWidthInner = Math.max(280, Math.min(windowWidth - 56, 640));
    return {
      chartWidth: chartWidthInner,
      series: seriesInner,
      lowLine: low,
      highLine: high,
    };
  }, [currentGlucose, glucoseDelta, windowWidth]);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
      labelColor: (_opacity = 1) => colors.textSecondary,
      propsForDots: { r: '3', strokeWidth: '1', stroke: '#0F766E' },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: colors.border,
        strokeWidth: 1,
      },
    }),
    [colors.card, colors.border, colors.textSecondary]
  );

  return (
    <View>
      <Text style={styles.sectionTitle}>Predicted glucose curve</Text>
      <View style={styles.chartBox}>
        <LineChart
          data={{
            labels: LABELS,
            datasets: [
              {
                data: series,
                color: () => '#0F766E',
                strokeWidth: 2,
              },
              {
                data: lowLine,
                color: () => colors.textTertiary,
                strokeWidth: 1,
              },
              {
                data: highLine,
                color: () => colors.textTertiary,
                strokeWidth: 1,
              },
            ],
            legend: ['Glucose', 'Low (70)', 'High (180)'],
          }}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines
          fromZero={false}
        />
      </View>
    </View>
  );
}

function createChartStyles(colors: ColorScheme) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    chartBox: {
      height: 260,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: 8,
      overflow: 'hidden',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    chart: {
      marginVertical: 4,
      borderRadius: 12,
    },
  });
}
