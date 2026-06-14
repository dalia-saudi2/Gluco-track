import React from 'react';
import { Text } from 'react-native';
import { useDashboardStyles } from '../../hooks/useDashboardTheme';
import type { DashboardPalette } from '../../constants/DashboardColors';
import { DF } from '../../constants/DashboardColors';

export const BRAND_NAME = 'Diabetes Care Hub';

type Props = {
  /** Smaller single-line variant for mobile top bar */
  compact?: boolean;
};

export function DiabetesCareHubBrand({ compact = false }: Props) {
  const styles = useDashboardStyles(createStyles);

  return (
    <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={compact ? 1 : 2}>
      {BRAND_NAME}
    </Text>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    name: {
      fontFamily: DF.bold,
      fontSize: 20,
      color: D.primary,
      lineHeight: 24,
      paddingHorizontal: 8,
    },
    nameCompact: {
      fontSize: 15,
      lineHeight: 20,
      paddingHorizontal: 0,
    },
  };
}
