import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Footprints, Moon, Flame } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoutAndRedirect } from '../../hooks/useLogoutAndRedirect';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { VitalisShell } from '../vitalis/VitalisShell';
import { useHealthPermissions } from '../../hooks/useHealthPermissions';
import { useHealth } from '../../hooks/useHealth';
import { healthService } from '../../services/health.service';

// Custom Components
import { HealthLoadingState } from './HealthLoadingState';
import { HealthErrorState } from './HealthErrorState';
import { HealthPermissionBanner } from './HealthPermissionBanner';
import { HealthCard } from './HealthCard';
import { HealthChart } from './HealthChart';
import { DailyHealthSummary } from './DailyHealthSummary';

export function HealthDashboard() {
  const { user } = useAuth();
  const handleLogout = useLogoutAndRedirect();
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  const {
    status,
    isChecking,
    requestAccess,
    goToSettings,
    checkStatus,
    installHealthConnect,
    needsHealthConnectInstall,
  } = useHealthPermissions();

  const {
    today,
    history7d,
    history30d,
    loading,
    refreshing,
    error,
    refreshData,
    isSimulated,
    isServerBacked,
    lastSyncedAt,
  } = useHealth(status, { patientId: user?.id, isAuthenticated: Boolean(user) });

  // Active Goals
  const STEPS_GOAL = 10000;
  const SLEEP_GOAL = 8.0;
  const CALORIES_GOAL = 500;

  // Manual toggle to force simulation mode if device health is unavailable or denied
  const handleEnableSimulation = async () => {
    healthService.setSimulationMode(true);
    await checkStatus();
  };

  // Determine what view state to display inside the main shell
  const renderContent = () => {
    if (isChecking || (loading && status === 'granted' && !refreshing)) {
      return <HealthLoadingState />;
    }

    if (status !== 'granted') {
      return (
        <HealthErrorState
          status={status}
          error={error}
          onRetry={checkStatus}
          onRequestAccess={requestAccess}
          onOpenSettings={goToSettings}
          onEnableSimulation={handleEnableSimulation}
          onInstallHealthConnect={installHealthConnect}
          needsHealthConnectInstall={needsHealthConnectInstall}
        />
      );
    }

    // Granted permission layout
    return (
      <View style={styles.dashboard}>
        {/* Banner notification for simulation mode */}
        <HealthPermissionBanner
          isSimulated={isSimulated}
          isServerBacked={isServerBacked}
          lastSyncedAt={lastSyncedAt}
          onRequestPermissions={() => {
            healthService.setSimulationMode(false);
            checkStatus();
          }}
        />

        {/* Today's Goals Metrics Cards Grid */}
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.grid}>
          <HealthCard
            title="Steps Today"
            value={today.steps.toLocaleString()}
            goal={STEPS_GOAL.toLocaleString()}
            percent={(today.steps / STEPS_GOAL) * 100}
            unit="steps"
            color={D.secondary}
            accent="secondary"
            Icon={Footprints}
          />
          <HealthCard
            title="Sleep hours"
            value={today.sleepHours}
            goal={SLEEP_GOAL}
            percent={(today.sleepHours / SLEEP_GOAL) * 100}
            unit="hrs"
            color={D.primary}
            accent="primary"
            Icon={Moon}
          />
          <HealthCard
            title="Calories Burned"
            value={today.caloriesBurned}
            goal={CALORIES_GOAL}
            percent={(today.caloriesBurned / CALORIES_GOAL) * 100}
            unit="kcal"
            color={D.orange}
            accent="orange"
            Icon={Flame}
          />
        </View>

        {/* Interactive Chart Section */}
        <View style={styles.chartSection}>
          <HealthChart history7d={history7d} history30d={history30d} />
        </View>

        {/* Detailed Table Daily Summary */}
        <View style={styles.summarySection}>
          <DailyHealthSummary history7d={history7d} history30d={history30d} />
        </View>
      </View>
    );
  };

  return (
    <VitalisShell
      activeNavId="health"
      userName={user?.full_name || 'Patient'}
      onLogout={handleLogout}
      refreshing={refreshing}
      onRefresh={status === 'granted' ? refreshData : undefined}
    >
      {renderContent()}
    </VitalisShell>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    dashboard: {
      flex: 1,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
      marginBottom: 14,
      paddingLeft: 2,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 16,
      marginBottom: 20,
    },
    chartSection: {
      marginBottom: 20,
    },
    summarySection: {
      marginBottom: 20,
    },
  };
}
