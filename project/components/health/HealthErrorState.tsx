import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ShieldAlert, AlertTriangle, Settings, RefreshCw, Heart } from 'lucide-react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { HealthPermissionStatus } from '../../types/health.types';

type Props = {
  status: HealthPermissionStatus;
  error: string | null;
  onRetry: () => void;
  onRequestAccess: () => void;
  onOpenSettings: () => void;
  onEnableSimulation?: () => void;
};

export function HealthErrorState({
  status,
  error,
  onRetry,
  onRequestAccess,
  onOpenSettings,
  onEnableSimulation
}: Props) {
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  const renderContent = () => {
    switch (status) {
      case 'unavailable':
        return (
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.warnIcon]}>
              <AlertTriangle size={32} color={D.orange} />
            </View>
            <Text style={styles.title}>Health Services Unavailable</Text>
            <Text style={styles.message}>
              Apple Health (iOS) or Health Connect (Android) is not supported or not enabled on this device.
            </Text>
            {onEnableSimulation && (
              <Pressable style={styles.primaryBtn} onPress={onEnableSimulation}>
                <Heart size={16} color={D.onPrimary} style={styles.btnIcon} />
                <Text style={styles.primaryBtnText}>Enable Demo/Simulation Mode</Text>
              </Pressable>
            )}
          </View>
        );

      case 'denied':
        return (
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.errorIcon]}>
              <ShieldAlert size={32} color={D.primary} />
            </View>
            <Text style={styles.title}>Permission Required</Text>
            <Text style={styles.message}>
              To show your sleep hours, steps, and active calories, we need read permissions for your device's native health database.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={onRequestAccess}>
              <Heart size={16} color={D.onPrimary} style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Grant Access</Text>
            </Pressable>
          </View>
        );

      case 'permanently_denied':
        return (
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.errorIcon]}>
              <ShieldAlert size={32} color={D.primary} />
            </View>
            <Text style={styles.title}>Permissions Disabled</Text>
            <Text style={styles.message}>
              Health permissions have been permanently denied. Please enable them in your device settings to view your data.
            </Text>
            <View style={styles.btnRow}>
              <Pressable style={styles.primaryBtn} onPress={onOpenSettings}>
                <Settings size={16} color={D.onPrimary} style={styles.btnIcon} />
                <Text style={styles.primaryBtnText}>Open Settings</Text>
              </Pressable>
              {onEnableSimulation && (
                <Pressable style={styles.secondaryBtn} onPress={onEnableSimulation}>
                  <Text style={styles.secondaryBtnText}>Use Simulation</Text>
                </Pressable>
              )}
            </View>
          </View>
        );

      default:
        // Other unexpected errors
        return (
          <View style={styles.content}>
            <View style={[styles.iconContainer, styles.warnIcon]}>
              <AlertTriangle size={32} color={D.orange} />
            </View>
            <Text style={styles.title}>Data Sync Error</Text>
            <Text style={styles.message}>
              {error || 'An unexpected error occurred while reading health data from your device.'}
            </Text>
            <View style={styles.btnRow}>
              <Pressable style={styles.primaryBtn} onPress={onRetry}>
                <RefreshCw size={16} color={D.onPrimary} style={styles.btnIcon} />
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </Pressable>
              {onEnableSimulation && (
                <Pressable style={styles.secondaryBtn} onPress={onEnableSimulation}>
                  <Text style={styles.secondaryBtnText}>Use Simulation</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

function createStyles(D: DashboardPalette) {
  return {
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 24,
      minHeight: 400,
    },
    content: {
      maxWidth: 420,
      width: '100%' as any,
      backgroundColor: D.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      padding: 24,
      alignItems: 'center' as const,
      shadowColor: D.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 20,
    },
    errorIcon: {
      backgroundColor: 'rgba(224, 64, 160, 0.1)',
    },
    warnIcon: {
      backgroundColor: 'rgba(234, 88, 12, 0.1)',
    },
    title: {
      fontFamily: DF.bold,
      fontSize: 18,
      color: D.onSurface,
      marginBottom: 10,
      textAlign: 'center' as const,
    },
    message: {
      fontFamily: DF.medium,
      fontSize: 13,
      color: D.onSurfaceVariant,
      lineHeight: 18,
      textAlign: 'center' as const,
      marginBottom: 24,
    },
    btnRow: {
      flexDirection: 'row' as const,
      gap: 12,
      width: '100%' as any,
    },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: D.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
    },
    primaryBtnText: {
      fontFamily: DF.bold,
      fontSize: 13,
      color: D.onPrimary,
    },
    secondaryBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: D.surfaceContainer,
      borderWidth: 1,
      borderColor: D.borderMedium,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
    },
    secondaryBtnText: {
      fontFamily: DF.bold,
      fontSize: 13,
      color: D.onSurfaceVariant,
    },
    btnIcon: {
      marginRight: 6,
    },
  };
}
