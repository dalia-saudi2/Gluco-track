import React, { ReactNode, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, LogOut } from 'lucide-react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { VITALIS_NAV, VitalisNavId } from './vitalisNav';
import { DiabetesCareHubBrand } from '../brand/DiabetesCareHubBrand';
import { MobileMenuButton } from './MobileMenuButton';
import { createSidebarStyles } from './MobileNavDrawer';
import { ThemeToggleButton } from './ThemeToggleButton';
import { RemindersBellButton } from '../dashboard/RemindersBellButton';

const SIDEBAR_BREAKPOINT = 1024;

type Props = {
  activeNavId: VitalisNavId;
  userName?: string;
  headerExtra?: ReactNode;
  onLogout?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Use flex container instead of ScrollView (e.g. chat screens) */
  disableScroll?: boolean;
  children: ReactNode;
};

export function VitalisShell({
  activeNavId,
  userName = 'Patient',
  headerExtra,
  onLogout,
  refreshing,
  onRefresh,
  disableScroll,
  children,
}: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const D = useD();
  const styles = useDashboardStyles(createShellStyles);
  const sidebarStyles = useMemo(() => StyleSheet.create(createSidebarStyles(D)), [D]);
  const showSidebar = width >= SIDEBAR_BREAKPOINT;
  const firstName = userName.split(' ')[0] || userName;
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.shell}>
          {showSidebar && (
            <View style={sidebarStyles.sidebar}>
              <View style={sidebarStyles.brand}>
                <DiabetesCareHubBrand />
              </View>
              <View style={sidebarStyles.navList}>
                {VITALIS_NAV.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(item.route as never)}
                    style={[sidebarStyles.navItem, item.id === activeNavId && sidebarStyles.navItemActive]}
                  >
                    <item.icon size={16} color={item.id === activeNavId ? D.onPrimary : D.onSurfaceVariant} />
                    <Text style={[sidebarStyles.navLabel, item.id === activeNavId && sidebarStyles.navLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={sidebarStyles.sidebarFooter}>
                <View style={sidebarStyles.sidebarUser}>
                  <View style={styles.avatarSm}>
                    <Text style={styles.avatarLetter}>{initials || firstName[0]?.toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={sidebarStyles.sidebarName}>{userName}</Text>
                    <Text style={sidebarStyles.sidebarRole}>Diabetes Patient</Text>
                  </View>
                </View>
                {onLogout && (
                  <Pressable style={sidebarStyles.logoutRow} onPress={onLogout}>
                    <LogOut size={16} color={D.onSurfaceVariant} />
                    <Text style={sidebarStyles.logoutText}>Logout</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          <View style={styles.main}>
            <View style={[styles.topBar, showSidebar && styles.topBarEnd]}>
              {!showSidebar && (
                <View style={styles.topBarLeft}>
                  <MobileMenuButton activeNavId={activeNavId} userName={userName} onLogout={onLogout} />
                  <DiabetesCareHubBrand compact />
                </View>
              )}
              <View style={styles.topActions}>
                {headerExtra}
                <ThemeToggleButton />
                <RemindersBellButton iconBtnStyle={styles.iconBtn} />
                <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile' as never)}>
                  <Settings size={20} color={D.onSurfaceVariant} />
                </Pressable>
                <View style={styles.userChip}>
                  {showSidebar && (
                    <View style={styles.userChipText}>
                      <Text style={styles.userChipName}>{userName}</Text>
                      <Text style={styles.userChipRole}>Diabetes Patient</Text>
                    </View>
                  )}
                  <View style={styles.avatarSm}>
                    <Text style={styles.avatarLetter}>{initials || firstName[0]?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>

            {disableScroll ? (
              <View style={styles.contentFill}>{children}</View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  onRefresh ? (
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[D.primary]} />
                  ) : undefined
                }
              >
                {children}
              </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createShellStyles(D: DashboardPalette) {
  return {
    root: { flex: 1, backgroundColor: D.background },
    flex: { flex: 1 },
    shell: { flex: 1, flexDirection: 'row' as const },
    main: { flex: 1 },
    topBar: {
      height: 56,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      gap: 10,
      backgroundColor: D.topBarBg,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
    },
    topBarLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, flex: 1, minWidth: 0 },
    topBarEnd: { justifyContent: 'flex-end' as const },
    topActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    iconBtn: { padding: 8, borderRadius: 999, position: 'relative' as const },
    userChip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: D.surface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: D.borderSubtle,
    },
    userChipText: { alignItems: 'flex-end' as const },
    userChipName: { fontFamily: DF.bold, fontSize: 11, color: D.onSurface },
    userChipRole: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant, textTransform: 'uppercase' as const },
    avatarSm: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: D.secondaryContainer,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 2,
      borderColor: D.accentBorder.primary,
    },
    avatarLetter: { fontFamily: DF.bold, fontSize: 12, color: D.secondary },
    scroll: { flex: 1 },
    contentFill: { flex: 1, padding: 16, maxWidth: 1280, width: '100%', alignSelf: 'center' as const },
    scrollContent: {
      padding: 20,
      gap: 20,
      maxWidth: 1280,
      width: '100%',
      alignSelf: 'center' as const,
      paddingBottom: 40,
    },
  };
}
