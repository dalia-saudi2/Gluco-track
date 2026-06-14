import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useDashboardStyles } from '../../hooks/useDashboardTheme';
import type { DashboardPalette } from '../../constants/DashboardColors';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: 'secondary' | 'orange' | 'primary' | 'tertiary' | 'none';
};

export function CandyCard({ children, style, accent = 'none' }: Props) {
  const styles = useDashboardStyles(createStyles);

  return (
    <View
      style={[
        styles.card,
        accent !== 'none' && {
          borderBottomWidth: 4,
          borderBottomColor: styles.accentBorders[accent],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    card: {
      backgroundColor: D.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: D.cardBorder,
      shadowColor: D.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 3,
      overflow: 'hidden' as const,
    },
    accentBorders: D.accentBorder,
  };
}
