import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, LogOut } from 'lucide-react-native';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import { VITALIS_NAV, VitalisNavId } from './vitalisNav';
import { DiabetesCareHubBrand } from '../brand/DiabetesCareHubBrand';

type Props = {
  visible: boolean;
  onClose: () => void;
  activeNavId: VitalisNavId;
  userName?: string;
  onLogout?: () => void;
};

export function MobileNavDrawer({
  visible,
  onClose,
  activeNavId,
  userName = 'Patient',
  onLogout,
}: Props) {
  const router = useRouter();
  const D = useD();
  const styles = useDashboardStyles(createDrawerStyles);
  const firstName = userName.split(' ')[0] || userName;
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const goTo = (route: string) => {
    onClose();
    router.push(route as never);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={styles.drawer}>
          <View style={styles.drawerHead}>
            <DiabetesCareHubBrand compact />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={D.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
            {VITALIS_NAV.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => goTo(item.route)}
                style={[styles.navItem, item.id === activeNavId && styles.navItemActive]}
              >
                <item.icon size={16} color={item.id === activeNavId ? D.onPrimary : D.onSurfaceVariant} />
                <Text style={[styles.navLabel, item.id === activeNavId && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{initials || firstName[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.userText}>
                <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                <Text style={styles.userRole}>Diabetes Patient</Text>
              </View>
            </View>
            {onLogout && (
              <Pressable
                style={styles.logoutRow}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
              >
                <LogOut size={16} color={D.onSurfaceVariant} />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Shared compact desktop sidebar dimensions */
export const SIDEBAR_WIDTH = 200;

export function createSidebarStyles(D: DashboardPalette) {
  return {
    sidebar: {
      width: SIDEBAR_WIDTH,
      backgroundColor: D.surface,
      borderRightWidth: 1,
      borderRightColor: D.borderSubtle,
      padding: 16,
      ...Platform.select({ web: { height: '100%' } as object, default: {} }),
    },
    brand: { marginBottom: 20 },
    navList: { flex: 1, gap: 4 },
    navItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
    },
    navItemActive: {
      backgroundColor: D.primary,
      shadowColor: D.primary,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    navLabel: { fontFamily: DF.bold, fontSize: 13, color: D.onSurfaceVariant },
    navLabelActive: { fontFamily: DF.bold, color: D.onPrimary },
    sidebarFooter: { borderTopWidth: 1, borderTopColor: D.borderSubtle, paddingTop: 12 },
    sidebarUser: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 8, paddingHorizontal: 4 },
    sidebarName: { fontFamily: DF.bold, fontSize: 11, color: D.onSurface },
    sidebarRole: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant },
    logoutRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: 4 },
    logoutText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant },
  };
}

function createDrawerStyles(D: DashboardPalette) {
  return {
    backdrop: { flex: 1, flexDirection: 'row' as const },
    scrim: { flex: 1, backgroundColor: D.scrim },
    drawer: {
      width: 220,
      backgroundColor: D.surface,
      borderRightWidth: 1,
      borderRightColor: D.borderSubtle,
      paddingTop: Platform.OS === 'web' ? 16 : 48,
      paddingBottom: 16,
      paddingHorizontal: 14,
      ...Platform.select({ web: { height: '100%' } as object, default: {} }),
    },
    drawerHead: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 16,
      gap: 8,
    },
    closeBtn: { padding: 6, borderRadius: 999, backgroundColor: D.surfaceContainerLow },
    navScroll: { flex: 1 },
    navItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      marginBottom: 4,
    },
    navItemActive: { backgroundColor: D.primary },
    navLabel: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant },
    navLabelActive: { fontFamily: DF.bold, color: D.onPrimary },
    footer: { borderTopWidth: 1, borderTopColor: D.borderSubtle, paddingTop: 12, marginTop: 8 },
    userRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 10 },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: D.secondaryContainer,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 2,
      borderColor: D.accentBorder.primary,
    },
    avatarLetter: { fontFamily: DF.bold, fontSize: 11, color: D.secondary },
    userText: { flex: 1 },
    userName: { fontFamily: DF.bold, fontSize: 11, color: D.onSurface },
    userRole: { fontFamily: DF.medium, fontSize: 9, color: D.onSurfaceVariant },
    logoutRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: 4, paddingVertical: 6 },
    logoutText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant },
  };
}
