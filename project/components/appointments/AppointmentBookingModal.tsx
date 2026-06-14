import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MapPin, User, Video, X, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { D, DF } from '../../constants/DashboardColors';

type Provider = { name: string; specialty: string; location: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  step: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  providers: Provider[];
  selectedProvider: string;
  selectedSpecialty: string;
  visitMode: 'in_person' | 'telehealth';
  selectedDate: string;
  selectedTime: string;
  reason: string;
  availableTimes: string[];
  isConfirming: boolean;
  onProviderSelect: (name: string, specialty: string) => void;
  onVisitModeChange: (mode: 'in_person' | 'telehealth') => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => Promise<void>;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function AppointmentBookingModal({
  visible,
  onClose,
  step,
  onStepChange,
  providers,
  selectedProvider,
  selectedSpecialty,
  visitMode,
  selectedDate,
  selectedTime,
  reason,
  availableTimes,
  isConfirming,
  onProviderSelect,
  onVisitModeChange,
  onDateChange,
  onTimeChange,
  onReasonChange,
  onConfirm,
}: Props) {
  const validateFutureDate = () => {
    const selected = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      Alert.alert('Invalid Date', 'Please select a future date for your appointment.');
      return false;
    }
    return true;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Schedule Appointment</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={D.primary} />
            </TouchableOpacity>
          </View>

          {step === 1 && (
            <View style={s.modalBody}>
              <WizardProgress step={1} />
              <Text style={s.stepTitle}>Choose your Provider</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {providers.map((p) => (
                  <TouchableOpacity
                    key={p.name}
                    style={[s.providerItem, selectedProvider === p.name && s.providerItemActive]}
                    onPress={() => onProviderSelect(p.name, p.specialty)}
                  >
                    <View style={s.providerAvatar}>
                      <User size={20} color={selectedProvider === p.name ? D.onPrimary : D.primary} />
                    </View>
                    <View style={s.providerInfo}>
                      <Text style={[s.providerName, selectedProvider === p.name && s.providerTextActive]}>{p.name}</Text>
                      <Text style={[s.providerMeta, selectedProvider === p.name && s.providerTextActive]}>
                        {p.specialty} · {p.location}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={s.stepSubtitle}>Visit Preference</Text>
              <View style={s.filterRow}>
                <TouchableOpacity
                  onPress={() => onVisitModeChange('in_person')}
                  style={[s.filterChip, visitMode === 'in_person' && s.filterChipActive]}
                >
                  <MapPin size={14} color={visitMode === 'in_person' ? D.onPrimary : D.primary} />
                  <Text style={[s.filterChipText, visitMode === 'in_person' && s.filterChipTextActive]}>In-person</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onVisitModeChange('telehealth')}
                  style={[s.filterChip, visitMode === 'telehealth' && s.filterChipActive]}
                >
                  <Video size={14} color={visitMode === 'telehealth' ? D.onPrimary : D.primary} />
                  <Text style={[s.filterChipText, visitMode === 'telehealth' && s.filterChipTextActive]}>Telehealth</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                disabled={!selectedProvider}
                style={[s.primaryCta, !selectedProvider && { opacity: 0.5 }]}
                onPress={() => {
                  onStepChange(2);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={s.primaryCtaText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={s.modalBody}>
              <WizardProgress step={2} />
              <Text style={s.stepTitle}>Select Date & Time</Text>
              <TextInput
                value={selectedDate}
                onChangeText={(text) => {
                  onDateChange(text);
                  validateFutureDate();
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={D.onSurfaceVariant}
                style={[s.input, { textAlign: 'center', fontSize: 16 }]}
                keyboardType="numeric"
              />
              <Text style={s.stepSubtitle}>Available Slots</Text>
              <View style={s.timesRow}>
                {availableTimes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeChip, selectedTime === t && s.timeChipActive]}
                    onPress={() => {
                      onTimeChange(t);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[s.timeChipText, selectedTime === t && s.timeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.modalNavRow}>
                <TouchableOpacity style={s.secondaryCta} onPress={() => onStepChange(1)}>
                  <Text style={s.secondaryCtaText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.primaryCta}
                  onPress={() => {
                    if (!validateFutureDate()) return;
                    onStepChange(3);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Text style={s.primaryCtaText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={s.modalBody}>
              <WizardProgress step={3} />
              <Text style={s.stepTitle}>Reason for visit</Text>
              <TextInput
                value={reason}
                onChangeText={onReasonChange}
                placeholder="e.g., annual check-up, specific symptoms..."
                placeholderTextColor={D.onSurfaceVariant}
                style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
              />
              <View style={s.modalNavRow}>
                <TouchableOpacity style={s.secondaryCta} onPress={() => onStepChange(2)}>
                  <Text style={s.secondaryCtaText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.primaryCta}
                  onPress={() => {
                    if (!reason.trim()) {
                      Alert.alert('Required', 'Please provide a reason for the visit.');
                      return;
                    }
                    onStepChange(4);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                >
                  <Text style={s.primaryCtaText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={s.modalBody}>
              <WizardProgress step={4} />
              <Text style={s.stepTitle}>Confirm Details</Text>
              <View style={s.confirmBox}>
                <SummaryRow label="Doctor" value={selectedProvider} />
                <SummaryRow label="Specialty" value={selectedSpecialty} />
                <SummaryRow label="Mode" value={visitMode === 'telehealth' ? 'Telehealth (Video)' : 'In-person Office Visit'} />
                <SummaryRow label="DateTime" value={`${selectedDate} @ ${selectedTime}`} />
                <SummaryRow label="Reason" value={reason || '—'} />
              </View>
              <View style={s.modalNavRow}>
                <TouchableOpacity style={s.secondaryCta} onPress={() => onStepChange(3)}>
                  <Text style={s.secondaryCtaText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.primaryCta, isConfirming && { opacity: 0.5 }]}
                  disabled={isConfirming}
                  onPress={onConfirm}
                >
                  {isConfirming ? (
                    <ActivityIndicator color={D.onPrimary} />
                  ) : (
                    <Text style={s.primaryCtaText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function WizardProgress({ step }: { step: number }) {
  return (
    <View style={s.wizardProgress}>
      {[1, 2, 3, 4].map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && <View style={[s.progressLine, n <= step && s.progressLineActive]} />}
          <View
            style={[
              s.progressStep,
              n < step && s.progressStepDone,
              n === step && s.progressStepActive,
            ]}
          >
            {n < step ? (
              <CheckCircle size={14} color={D.onPrimary} />
            ) : (
              <Text style={s.progressText}>{n}</Text>
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(46,26,40,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,200,224,0.35)',
  },
  modalTitle: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
  modalBody: { padding: 20, gap: 12 },
  wizardProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: D.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: { backgroundColor: D.primary },
  progressStepDone: { backgroundColor: D.green },
  progressText: { fontFamily: DF.bold, fontSize: 12, color: D.onSurfaceVariant },
  progressLine: { width: 24, height: 2, backgroundColor: D.surfaceContainerHigh },
  progressLineActive: { backgroundColor: D.primary },
  stepTitle: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface },
  stepSubtitle: { fontFamily: DF.bold, fontSize: 12, color: D.onSurfaceVariant, marginTop: 4 },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: D.surfaceContainerLow,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  providerItemActive: { backgroundColor: D.primary, borderColor: D.primary },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: D.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: { flex: 1 },
  providerName: { fontFamily: DF.bold, fontSize: 14, color: D.onSurface },
  providerMeta: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant, marginTop: 2 },
  providerTextActive: { color: D.onPrimary },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
  },
  filterChipActive: { backgroundColor: D.primary },
  filterChipText: { fontFamily: DF.bold, fontSize: 12, color: D.onSurfaceVariant },
  filterChipTextActive: { color: D.onPrimary },
  input: {
    borderWidth: 1,
    borderColor: D.outlineVariant,
    borderRadius: 12,
    padding: 12,
    fontFamily: DF.medium,
    fontSize: 14,
    color: D.onSurface,
    backgroundColor: D.surfaceContainerLow,
  },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: D.surfaceContainer },
  timeChipActive: { backgroundColor: D.primary },
  timeChipText: { fontFamily: DF.bold, fontSize: 12, color: D.onSurfaceVariant },
  timeChipTextActive: { color: D.onPrimary },
  modalNavRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryCta: {
    flex: 1,
    backgroundColor: D.primary,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryCtaText: { fontFamily: DF.bold, fontSize: 14, color: D.onPrimary },
  secondaryCta: {
    flex: 1,
    backgroundColor: D.surfaceContainer,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryCtaText: { fontFamily: DF.bold, fontSize: 14, color: D.onSurfaceVariant },
  confirmBox: {
    backgroundColor: D.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(220,200,224,0.35)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  summaryValue: { flex: 1, fontFamily: DF.medium, fontSize: 13, color: D.onSurface, textAlign: 'right' },
});
