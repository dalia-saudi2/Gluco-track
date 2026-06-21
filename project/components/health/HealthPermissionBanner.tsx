import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Info, ArrowRight } from 'lucide-react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';

type Props = {
  isSimulated: boolean;
  isServerBacked?: boolean;
  lastSyncedAt?: string | null;
  onRequestPermissions: () => void;
};

function formatSyncedAt(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export function HealthPermissionBanner({
  isSimulated,
  isServerBacked = false,
  lastSyncedAt,
  onRequestPermissions,
}: Props) {
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  if (!isSimulated) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Info size={16} color={D.primary} style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={styles.title}>
            {isServerBacked ? 'Synced account data' : 'Running in Simulation Mode'}
          </Text>
          <Text style={styles.description}>
            {isServerBacked
              ? `Showing your saved steps, sleep, and calories from the server.${
                  formatSyncedAt(lastSyncedAt) ? ` Last sync: ${formatSyncedAt(lastSyncedAt)}.` : ''
                }`
              : Platform.OS === 'android'
                ? 'Install the native app and connect Health Connect for live device data.'
                : 'This browser cannot read HealthKit or Health Connect. Sign in on mobile to sync live data.'}
          </Text>
        </View>
      </View>
      {!isServerBacked ? (
        <Pressable style={styles.btn} onPress={onRequestPermissions}>
          <Text style={styles.btnText}>
            {Platform.OS === 'android' ? 'Connect Health Connect' : 'Connect Health Kit'}
          </Text>
          <ArrowRight size={12} color={D.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    banner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      backgroundColor: 'rgba(224, 64, 160, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(224, 64, 160, 0.18)',
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 20,
      flexWrap: 'wrap' as const,
      gap: 12,
    },
    left: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
      minWidth: 240,
    },
    icon: {
      marginRight: 10,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontFamily: DF.bold,
      fontSize: 12,
      color: D.primary,
    },
    description: {
      fontFamily: DF.medium,
      fontSize: 10,
      color: D.onSurfaceVariant,
      marginTop: 2,
    },
    btn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: D.surface,
      borderWidth: 1,
      borderColor: D.borderMedium,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    btnText: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.primary,
    },
  };
}
