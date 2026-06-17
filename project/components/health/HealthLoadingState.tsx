import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';

export function HealthLoadingState() {
  const D = useD();
  const styles = useDashboardStyles(createStyles);
  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Pulse animation for the skeleton panels
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ActivityIndicator size="small" color={D.primary} style={styles.spinner} />
        <Text style={styles.title}>Retrieving Health Data...</Text>
      </View>
      <Text style={styles.subtitle}>Reading latest values directly from device health provider</Text>

      {/* Metric Cards Skeleton Grid */}
      <View style={styles.grid}>
        {[1, 2, 3].map((key) => (
          <Animated.View key={key} style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.cardHeader} />
            <View style={styles.cardBody} />
            <View style={styles.cardFooter} />
          </Animated.View>
        ))}
      </View>

      {/* Chart Skeleton */}
      <Animated.View style={[styles.chartCard, { opacity: fadeAnim }]}>
        <View style={styles.chartHeader} />
        <View style={styles.chartGraph} />
      </Animated.View>
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    container: {
      flex: 1,
      padding: 2,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 6,
    },
    spinner: {
      marginRight: 10,
    },
    title: {
      fontFamily: DF.bold,
      fontSize: 18,
      color: D.onSurface,
    },
    subtitle: {
      fontFamily: DF.medium,
      fontSize: 12,
      color: D.onSurfaceVariant,
      marginBottom: 24,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 16,
      marginBottom: 20,
    },
    card: {
      flex: 1,
      minWidth: 260,
      backgroundColor: D.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      padding: 18,
      height: 140,
      justifyContent: 'space-between' as const,
    },
    cardHeader: {
      width: '40%' as any,
      height: 12,
      backgroundColor: D.surfaceContainer,
      borderRadius: 6,
    },
    cardBody: {
      width: '60%' as any,
      height: 28,
      backgroundColor: D.surfaceContainer,
      borderRadius: 8,
    },
    cardFooter: {
      width: '80%' as any,
      height: 10,
      backgroundColor: D.surfaceContainer,
      borderRadius: 5,
    },
    chartCard: {
      backgroundColor: D.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      padding: 20,
      height: 280,
      justifyContent: 'space-between' as const,
    },
    chartHeader: {
      width: '30%' as any,
      height: 16,
      backgroundColor: D.surfaceContainer,
      borderRadius: 8,
    },
    chartGraph: {
      flex: 1,
      marginTop: 20,
      backgroundColor: D.surfaceContainer,
      borderRadius: 12,
    },
  };
}
