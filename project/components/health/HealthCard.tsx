import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LucideIcon } from 'lucide-react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { CandyCard } from '../dashboard/CandyCard';

type Props = {
  title: string;
  value: string | number;
  goal: string | number;
  percent: number;
  unit: string;
  color: string;
  accent: 'primary' | 'secondary' | 'orange' | 'tertiary';
  Icon: LucideIcon;
};

export function HealthCard({
  title,
  value,
  goal,
  percent,
  unit,
  color,
  accent,
  Icon,
}: Props) {
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  const cappedPercent = Math.min(100, Math.max(0, percent));
  const size = 60;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (cappedPercent / 100) * circumference;

  return (
    <CandyCard style={styles.card} accent={accent}>
      <View style={styles.cardLeft}>
        <View style={styles.header}>
          <Icon size={14} color={color} style={styles.icon} />
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.valueWrap}>
          <Text style={[styles.value, { color: D.onSurface }]}>
            {value} <Text style={styles.unit}>{unit}</Text>
          </Text>
          <Text style={styles.goalText}>Goal: {goal} {unit}</Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={styles.progressContainer}>
          <Svg width={size} height={size}>
            {/* Background Track Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={D.surfaceContainerHigh}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Circle */}
            <G transform={`rotate(-90, ${size / 2}, ${size / 2})`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </G>
          </Svg>
          <View style={styles.percentTextContainer}>
            <Text style={[styles.percentText, { color }]}>{Math.round(percent)}%</Text>
          </View>
        </View>
      </View>
    </CandyCard>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    card: {
      flex: 1,
      minWidth: 260,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      padding: 16,
    },
    cardLeft: {
      flex: 1,
    },
    cardRight: {
      marginLeft: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    icon: {
      marginRight: 6,
    },
    title: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
    },
    valueWrap: {
      justifyContent: 'center' as const,
    },
    value: {
      fontFamily: DF.bold,
      fontSize: 22,
      lineHeight: 28,
    },
    unit: {
      fontFamily: DF.medium,
      fontSize: 12,
      color: D.onSurfaceVariant,
    },
    goalText: {
      fontFamily: DF.medium,
      fontSize: 10,
      color: D.onSurfaceVariant,
      marginTop: 2,
    },
    progressContainer: {
      position: 'relative' as const,
      width: 60,
      height: 60,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    percentTextContainer: {
      position: 'absolute' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    percentText: {
      fontFamily: DF.bold,
      fontSize: 11,
    },
  };
}
