import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../config/api';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { showToast } from '../ToastProvider';
import { playReminderSound } from '../../utils/reminderSound';

type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  channel: string;
};

type Props = {
  iconBtnStyle?: object;
};

export function RemindersBellButton({ iconBtnStyle }: Props) {
  const D = useD();
  const router = useRouter();
  const styles = createStyles(D);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [hasUnread, setHasUnread] = useState(true);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await apiClient.getAppNotifications()) as AppNotification[];
      setItems(Array.isArray(data) ? data : []);
      setHasUnread(data.length > 0);
    } catch {
      setItems([]);
      showToast.error('Reminders', 'Could not load reminders. Check that you are signed in.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePress = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await playReminderSound();
    setOpen(true);
    await loadReminders();
  };

  const close = () => setOpen(false);

  const handleItemPress = (item: AppNotification) => {
    close();
    if (item.type === 'clinical_profile_incomplete') {
      router.push('/complete-health-profile');
    }
  };

  return (
    <>
      <Pressable style={[styles.iconBtn, iconBtnStyle]} onPress={handlePress} accessibilityLabel="Reminders">
        <Bell size={20} color={D.onSurfaceVariant} />
        {hasUnread && <View style={styles.notifDot} />}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHead}>
              <View style={styles.panelTitleRow}>
                <Bell size={18} color={D.primary} />
                <Text style={styles.panelTitle}>Reminders</Text>
              </View>
              <Pressable onPress={close} hitSlop={8}>
                <X size={20} color={D.onSurfaceVariant} />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={D.primary} />
              </View>
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>No reminders right now. You're all caught up.</Text>
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleItemPress(item)}
                    style={[styles.row, item.pinned && styles.rowPinned]}
                  >
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowBody}>{item.body}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    iconBtn: { padding: 8, borderRadius: 999, position: 'relative' },
    notifDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: D.primary,
      borderWidth: 2,
      borderColor: D.surface,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 56,
      paddingRight: 16,
      paddingLeft: 16,
    },
    panel: {
      width: '100%',
      maxWidth: 360,
      maxHeight: 420,
      backgroundColor: D.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: D.outlineVariant,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    panelHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    panelTitle: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface },
    centered: { paddingVertical: 32, alignItems: 'center' },
    emptyText: {
      fontFamily: DF.medium,
      fontSize: 13,
      color: D.onSurfaceVariant,
      lineHeight: 20,
      paddingVertical: 16,
    },
    list: { maxHeight: 320 },
    row: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: D.surfaceContainerLow,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: D.outlineVariant,
    },
    rowPinned: {
      borderColor: D.primary,
      backgroundColor: 'rgba(224,64,160,0.06)',
    },
    rowTitle: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface, marginBottom: 4 },
    rowBody: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, lineHeight: 18 },
  });
}
