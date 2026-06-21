import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Pill, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { MedicationDoseSlot } from '../utils/medicationSchedule';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

type Props = {
  visible: boolean;
  dose: MedicationDoseSlot | null;
  onTaken: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
};

export function MedicationReminderModal({ visible, dose, onTaken, onSnooze, onDismiss }: Props) {
  if (!dose) return null;

  const handleTaken = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onTaken();
  };

  const handleSnooze = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSnooze();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={onDismiss} hitSlop={10}>
            <X size={20} color="#64748b" />
          </Pressable>

          <View style={styles.iconWrap}>
            <Pill size={28} color="#e040a0" />
          </View>

          <Text style={styles.kicker}>Medication reminder</Text>
          <Text style={styles.title}>Time to take your medicine</Text>

          <View style={styles.medBox}>
            <Text style={styles.medName}>{dose.name}</Text>
            <Text style={styles.medDosage}>{dose.dosage}</Text>
            <Text style={styles.medTime}>{dose.label}</Text>
          </View>

          <Pressable style={styles.primaryBtn} onPress={handleTaken}>
            <Text style={styles.primaryBtnText}>Mark as taken</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleSnooze}>
            <Text style={styles.secondaryBtnText}>Remind me in 10 minutes</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(224, 64, 160, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kicker: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: '#e040a0',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 20,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  medBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    alignItems: 'center',
    gap: 4,
  },
  medName: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: '#0f172a',
    textAlign: 'center',
  },
  medDosage: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: '#475569',
  },
  medTime: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: '#e040a0',
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#e040a0',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: '#fff',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONT.medium,
    fontSize: 14,
    color: '#64748b',
  },
});
