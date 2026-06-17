import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Moon, Footprints, Flame, Check } from 'lucide-react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { HealthHistoryData } from '../../types/health.types';
import { CandyCard } from '../dashboard/CandyCard';

type Props = {
  history7d: HealthHistoryData;
  history30d: HealthHistoryData;
};

export function DailyHealthSummary({ history7d, history30d }: Props) {
  const D = useD();
  const styles = useDashboardStyles(createStyles);
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');

  const history = timeframe === '7d' ? history7d : history30d;

  // Goals
  const STEPS_GOAL = 10000;
  const SLEEP_GOAL = 8.0;
  const CALORIES_GOAL = 500;

  // Construct rows by aligning dates
  const rows = React.useMemo(() => {
    const dates = history.steps.map((d) => d.date);
    return dates.map((dateStr) => {
      const stepsVal = history.steps.find((d) => d.date === dateStr)?.value ?? 0;
      const sleepVal = history.sleep.find((d) => d.date === dateStr)?.value ?? 0;
      const caloriesVal = history.calories.find((d) => d.date === dateStr)?.value ?? 0;

      const dateObj = new Date(dateStr);
      const formattedDate = isNaN(dateObj.getTime())
        ? dateStr
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        date: formattedDate,
        rawDate: dateStr,
        steps: stepsVal,
        sleep: sleepVal,
        calories: caloriesVal,
        stepsGoalMet: stepsVal >= STEPS_GOAL,
        sleepGoalMet: sleepVal >= SLEEP_GOAL,
        caloriesGoalMet: caloriesVal >= CALORIES_GOAL,
      };
    });
  }, [history]);

  return (
    <CandyCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Logs</Text>
        <View style={styles.timeframeTabs}>
          {(['7d', '30d'] as const).map((t) => (
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

      {/* Table Headers */}
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.dateHeader]}>Date</Text>
        <View style={[styles.cell, styles.colHeader]}>
          <Footprints size={12} color={D.secondary} style={styles.headerIcon} />
          <Text style={styles.headerText}>Steps</Text>
        </View>
        <View style={[styles.cell, styles.colHeader]}>
          <Moon size={12} color={D.primary} style={styles.headerIcon} />
          <Text style={styles.headerText}>Sleep</Text>
        </View>
        <View style={[styles.cell, styles.colHeader]}>
          <Flame size={12} color={D.orange} style={styles.headerIcon} />
          <Text style={styles.headerText}>Calories</Text>
        </View>
      </View>

      {/* Table Rows */}
      <View style={styles.rowsContainer}>
        {rows.map((row, index) => (
          <View
            key={row.rawDate}
            style={[styles.row, index % 2 === 1 && { backgroundColor: D.surfaceContainerLow }]}
          >
            {/* Date */}
            <Text style={[styles.cell, styles.dateText]}>{row.date}</Text>

            {/* Steps */}
            <View style={styles.cell}>
              <Text style={[styles.valueText, row.stepsGoalMet && { color: D.green, fontFamily: DF.bold }]}>
                {row.steps.toLocaleString()}
              </Text>
              {row.stepsGoalMet && <Check size={10} color={D.green} style={styles.checkIcon} />}
            </View>

            {/* Sleep */}
            <View style={styles.cell}>
              <Text style={[styles.valueText, row.sleepGoalMet && { color: D.green, fontFamily: DF.bold }]}>
                {row.sleep}h
              </Text>
              {row.sleepGoalMet && <Check size={10} color={D.green} style={styles.checkIcon} />}
            </View>

            {/* Calories */}
            <View style={styles.cell}>
              <Text style={[styles.valueText, row.caloriesGoalMet && { color: D.green, fontFamily: DF.bold }]}>
                {row.calories}
              </Text>
              {row.caloriesGoalMet && <Check size={10} color={D.green} style={styles.checkIcon} />}
            </View>
          </View>
        ))}
      </View>
    </CandyCard>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    card: {
      padding: 18,
      width: '100%' as any,
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
    tableHeader: {
      flexDirection: 'row' as const,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
      paddingBottom: 8,
      marginBottom: 6,
    },
    colHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headerIcon: {
      marginRight: 4,
    },
    headerText: {
      fontFamily: DF.bold,
      fontSize: 9,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase' as const,
    },
    dateHeader: {
      fontFamily: DF.bold,
      fontSize: 9,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase' as const,
      justifyContent: 'flex-start' as const,
      paddingLeft: 6,
    },
    rowsContainer: {
      gap: 2,
    },
    row: {
      flexDirection: 'row' as const,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center' as const,
    },
    cell: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dateText: {
      fontFamily: DF.bold,
      fontSize: 11,
      color: D.onSurface,
      justifyContent: 'flex-start' as const,
      paddingLeft: 6,
    },
    valueText: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
    },
    checkIcon: {
      marginLeft: 3,
    },
  };
}
