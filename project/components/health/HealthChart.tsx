import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { DailyMetricValue, HealthHistoryData } from '../../types/health.types';
import { CandyCard } from '../dashboard/CandyCard';

type Props = {
  history7d: HealthHistoryData;
  history30d: HealthHistoryData;
};

type MetricType = 'steps' | 'sleep' | 'calories';
type TimeframeType = '7d' | '30d';

export function HealthChart({ history7d, history30d }: Props) {
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  const [metric, setMetric] = useState<MetricType>('steps');
  const [timeframe, setTimeframe] = useState<TimeframeType>('7d');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const currentData = useMemo(() => {
    const source = timeframe === '7d' ? history7d : history30d;
    return source[metric] || [];
  }, [timeframe, metric, history7d, history30d]);

  const maxVal = useMemo(() => {
    const vals = currentData.map((d) => d.value);
    return Math.max(...vals, 10); // Avoid dividing by zero, fallback to base 10
  }, [currentData]);

  const metricConfig = useMemo(() => {
    switch (metric) {
      case 'steps':
        return {
          color: D.secondary,
          unit: 'steps',
          label: 'Steps Walked',
          goal: 10000,
        };
      case 'sleep':
        return {
          color: D.primary,
          unit: 'hrs',
          label: 'Sleep Duration',
          goal: 8,
        };
      case 'calories':
        return {
          color: D.orange,
          unit: 'kcal',
          label: 'Active Calories',
          goal: 500,
        };
    }
  }, [metric, D]);

  const formatDate = (dateStr: string, format: TimeframeType) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      if (format === '7d') {
        // Mon, Tue, etc.
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        // Jun 12, etc.
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      return dateStr;
    }
  };

  // Find weekly average
  const averageValue = useMemo(() => {
    if (!currentData.length) return 0;
    const sum = currentData.reduce((acc, curr) => acc + curr.value, 0);
    return Math.round((sum / currentData.length) * 10) / 10;
  }, [currentData]);

  // Reset tooltip index if data length changes
  React.useEffect(() => {
    setSelectedIndex(null);
  }, [metric, timeframe]);

  return (
    <CandyCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{metricConfig.label} Trend</Text>
          <Text style={styles.subtitle}>
            Average: {averageValue} {metricConfig.unit}
          </Text>
        </View>

        {/* Timeframe selector */}
        <View style={styles.timeframeTabs}>
          {(['7d', '30d'] as TimeframeType[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.timeframeTab, timeframe === t && styles.timeframeTabActive]}
              onPress={() => setTimeframe(t)}
            >
              <Text style={[styles.timeframeTabText, timeframe === t && styles.timeframeTabTextActive]}>
                {t.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Metric Selector Tabs */}
      <View style={styles.metricSelector}>
        {[
          { id: 'steps', label: 'Steps' },
          { id: 'sleep', label: 'Sleep' },
          { id: 'calories', label: 'Calories' },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.metricTab,
              metric === item.id && {
                backgroundColor: `${metricConfig.color}18`,
                borderColor: `${metricConfig.color}44`,
              },
            ]}
            onPress={() => setMetric(item.id as MetricType)}
          >
            <Text
              style={[
                styles.metricTabText,
                metric === item.id && { color: metricConfig.color, fontFamily: DF.bold },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Main Chart Rendering Container */}
      <View style={styles.chartWrapper}>
        {/* Tooltip Overlay */}
        {selectedIndex !== null && currentData[selectedIndex] && (
          <View style={styles.tooltipContainer}>
            <View style={[styles.tooltip, { borderColor: metricConfig.color }]}>
              <Text style={styles.tooltipValue}>
                {currentData[selectedIndex].value} {metricConfig.unit}
              </Text>
              <Text style={styles.tooltipDate}>
                {new Date(currentData[selectedIndex].date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            timeframe === '7d' && { width: '100%', justifyContent: 'space-between' },
          ]}
        >
          {currentData.map((item, idx) => {
            // Calc height ratio
            const heightPercent = `${Math.min(100, Math.max(10, (item.value / maxVal) * 100))}%`;
            const isSelected = selectedIndex === idx;
            const isGoalMet = item.value >= metricConfig.goal;

            return (
              <Pressable
                key={idx}
                style={styles.barContainer}
                onPress={() => setSelectedIndex(isSelected ? null : idx)}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: heightPercent as any,
                        backgroundColor: isSelected ? metricConfig.color : `${metricConfig.color}a0`,
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: D.onSurface,
                      },
                    ]}
                  />
                  {/* Goal marker dot if they hit their target */}
                  {isGoalMet && (
                    <View style={[styles.goalDot, { backgroundColor: D.green }]} />
                  )}
                </View>
                <Text style={[styles.axisLabel, isSelected && { color: metricConfig.color, fontFamily: DF.bold }]}>
                  {formatDate(item.date, timeframe)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </CandyCard>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    card: {
      padding: 18,
      width: '100%' as any,
      minHeight: 320,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 16,
    },
    title: {
      fontFamily: DF.bold,
      fontSize: 14,
      color: D.onSurface,
    },
    subtitle: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
      marginTop: 2,
    },
    timeframeTabs: {
      flexDirection: 'row' as const,
      backgroundColor: D.surfaceContainer,
      borderRadius: 999,
      padding: 3,
    },
    timeframeTab: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    timeframeTabActive: {
      backgroundColor: D.surface,
    },
    timeframeTabText: {
      fontFamily: DF.bold,
      fontSize: 9,
      color: D.onSurfaceVariant,
    },
    timeframeTabTextActive: {
      color: D.primary,
    },
    metricSelector: {
      flexDirection: 'row' as const,
      gap: 8,
      marginBottom: 20,
    },
    metricTab: {
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      backgroundColor: D.surfaceContainerLow,
    },
    metricTabText: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
    },
    chartWrapper: {
      flex: 1,
      minHeight: 180,
      position: 'relative' as const,
      justifyContent: 'flex-end' as const,
    },
    tooltipContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center' as const,
      zIndex: 10,
    },
    tooltip: {
      backgroundColor: D.surface,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
      alignItems: 'center' as const,
      shadowColor: D.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    tooltipValue: {
      fontFamily: DF.bold,
      fontSize: 12,
      color: D.onSurface,
    },
    tooltipDate: {
      fontFamily: DF.medium,
      fontSize: 9,
      color: D.onSurfaceVariant,
      marginTop: 2,
    },
    scrollContent: {
      height: 150,
      alignItems: 'flex-end' as const,
      paddingBottom: 6,
      gap: 12,
    },
    barContainer: {
      height: '100%' as any,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      width: 32,
    },
    barTrack: {
      flex: 1,
      width: 8,
      backgroundColor: D.surfaceContainer,
      borderRadius: 999,
      justifyContent: 'flex-end' as const,
      position: 'relative' as const,
    },
    barFill: {
      width: '100%' as any,
      borderRadius: 999,
    },
    goalDot: {
      position: 'absolute' as const,
      top: 2,
      alignSelf: 'center' as const,
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    axisLabel: {
      fontFamily: DF.medium,
      fontSize: 9,
      color: D.onSurfaceVariant,
      marginTop: 6,
      textAlign: 'center' as const,
    },
  };
}
