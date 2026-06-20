import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MapPin, User, Video, X, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { D, DF } from '../../constants/DashboardColors';
import { TelehealthPlatform, telehealthPlatformLabel } from '../../utils/telehealthMeeting';

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
  telehealthPlatform: TelehealthPlatform;
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
  labUploadPending?: boolean;
  onUploadLabBeforeAppointment?: () => void;
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
  telehealthPlatform,
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
  labUploadPending,
  onUploadLabBeforeAppointment,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const footerPaddingBottom = Math.max(insets.bottom, 10) + 8;
  const modalMaxHeight = windowHeight - insets.top - 16;

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
        <View style={[s.modalCard, { maxHeight: modalMaxHeight, paddingBottom: footerPaddingBottom }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Schedule Appointment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color={D.primary} />
            </TouchableOpacity>
          </View>

          <View style={s.modalContent}>
            {step === 1 && (
              <>
                <WizardProgress step={1} />
                <Text style={s.stepTitle}>Choose your Provider</Text>
                <View style={s.providerList}>
                  {providers.map((p) => (
                    <TouchableOpacity
                      key={p.name}
                      style={[s.providerItem, selectedProvider === p.name && s.providerItemActive]}
                      onPress={() => onProviderSelect(p.name, p.specialty)}
                    >
                      <View style={s.providerAvatar}>
                        <User size={16} color={selectedProvider === p.name ? D.onPrimary : D.primary} />
                      </View>
                      <View style={s.providerInfo}>
                        <Text
                          style={[s.providerName, selectedProvider === p.name && s.providerTextActive]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                        <Text
                          style={[s.providerMeta, selectedProvider === p.name && s.providerTextActive]}
                          numberOfLines={1}
                        >
                          {p.specialty} · {p.location}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.visitSection}>
                  <Text style={s.stepSubtitle}>Visit Preference</Text>
                  <View style={s.filterRow}>
                    <TouchableOpacity
                      onPress={() => onVisitModeChange('in_person')}
                      style={[s.filterChip, visitMode === 'in_person' && s.filterChipActive]}
                    >
                      <MapPin size={13} color={visitMode === 'in_person' ? D.onPrimary : D.primary} />
                      <Text style={[s.filterChipText, visitMode === 'in_person' && s.filterChipTextActive]}>
                        In-person
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onVisitModeChange('telehealth')}
                      style={[s.filterChip, visitMode === 'telehealth' && s.filterChipActive]}
                    >
                      <Video size={13} color={visitMode === 'telehealth' ? D.onPrimary : D.primary} />
                      <Text style={[s.filterChipText, visitMode === 'telehealth' && s.filterChipTextActive]}>
                        Telehealth
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {visitMode === 'telehealth' && (
                    <Text style={s.zoomHint}>Video visits use Zoom</Text>
                  )}
                </View>
              </>
            )}

            {step === 2 && (
              <>
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
                  style={[s.input, s.dateInput]}
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
              </>
            )}

            {step === 3 && (
              <>
                <WizardProgress step={3} />
                <Text style={s.stepTitle}>Reason for visit</Text>
                <TextInput
                  value={reason}
                  onChangeText={onReasonChange}
                  placeholder="e.g., annual check-up, specific symptoms..."
                  placeholderTextColor={D.onSurfaceVariant}
                  style={[s.input, s.reasonInput]}
                  multiline
                />
              </>
            )}

            {step === 4 && (
              <>
                <WizardProgress step={4} />
                <Text style={s.stepTitle}>Confirm Details</Text>
                {labUploadPending ? (
                  <View style={s.labNudge}>
                    <Text style={s.labNudgeTitle}>Upload labs first</Text>
                    <Text style={s.labNudgeBody} numberOfLines={2}>
                      Help {selectedProvider.split(' ').slice(-1)[0]} review your health before the visit.
                    </Text>
                    <TouchableOpacity style={s.labNudgePrimary} onPress={onUploadLabBeforeAppointment}>
                      <Text style={s.labNudgePrimaryText}>Upload results</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={s.confirmBox}>
                  <SummaryRow label="Doctor" value={selectedProvider} />
                  <SummaryRow label="Specialty" value={selectedSpecialty} />
                  <SummaryRow
                    label="Mode"
                    value={visitMode === 'telehealth' ? 'Telehealth (Video)' : 'In-person'}
                  />
                  {visitMode === 'telehealth' && (
                    <SummaryRow label="Platform" value={telehealthPlatformLabel(telehealthPlatform)} />
                  )}
                  <SummaryRow label="DateTime" value={`${selectedDate} @ ${selectedTime}`} />
                  <SummaryRow label="Reason" value={reason || '—'} />
                </View>
              </>
            )}
          </View>

          <View style={s.modalFooter}>
            {step === 1 && (
              <TouchableOpacity
                disabled={!selectedProvider}
                style={[s.primaryCta, s.primaryCtaFull, !selectedProvider && { opacity: 0.5 }]}
                onPress={() => {
                  onStepChange(2);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={s.primaryCtaText}>Continue</Text>
              </TouchableOpacity>
            )}
            {step === 2 && (
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
            )}
            {step === 3 && (
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
            )}
            {step === 4 && (
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
            )}
          </View>
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
              <CheckCircle size={12} color={D.onPrimary} />
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(224,64,160,0.08)',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,200,224,0.35)',
  },
  modalTitle: { fontFamily: DF.bold, fontSize: 16, color: D.onSurface },
  modalContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220,200,224,0.35)',
    backgroundColor: D.surface,
  },
  labNudge: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    gap: 6,
  },
  labNudgeTitle: { fontFamily: DF.bold, fontSize: 12, color: '#b45309' },
  labNudgeBody: { fontFamily: DF.medium, fontSize: 11, color: D.onSurfaceVariant, lineHeight: 15 },
  labNudgePrimary: {
    alignSelf: 'flex-start',
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  labNudgePrimaryText: { fontFamily: DF.bold, fontSize: 11, color: '#fff' },
  wizardProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  progressStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: D.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: { backgroundColor: D.primary },
  progressStepDone: { backgroundColor: D.green },
  progressText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  progressLine: { width: 20, height: 2, backgroundColor: D.surfaceContainerHigh },
  progressLineActive: { backgroundColor: D.primary },
  stepTitle: { fontFamily: DF.bold, fontSize: 15, color: D.onSurface },
  stepSubtitle: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  zoomHint: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginTop: 2 },
  providerList: { gap: 6 },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: D.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  providerItemActive: { backgroundColor: D.primary, borderColor: D.primary },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: D.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: { flex: 1, minWidth: 0 },
  providerName: { fontFamily: DF.bold, fontSize: 13, color: D.onSurface },
  providerMeta: { fontFamily: DF.medium, fontSize: 10, color: D.onSurfaceVariant, marginTop: 1 },
  providerTextActive: { color: D.onPrimary },
  visitSection: { gap: 6, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: D.surfaceContainer,
  },
  filterChipActive: { backgroundColor: D.primary },
  filterChipText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  filterChipTextActive: { color: D.onPrimary },
  input: {
    borderWidth: 1,
    borderColor: D.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: DF.medium,
    fontSize: 14,
    color: D.onSurface,
    backgroundColor: D.surfaceContainerLow,
  },
  dateInput: { textAlign: 'center', fontSize: 15 },
  reasonInput: { height: 72, textAlignVertical: 'top' },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: D.surfaceContainer },
  timeChipActive: { backgroundColor: D.primary },
  timeChipText: { fontFamily: DF.bold, fontSize: 11, color: D.onSurfaceVariant },
  timeChipTextActive: { color: D.onPrimary },
  modalNavRow: { flexDirection: 'row', gap: 10 },
  primaryCta: {
    flex: 1,
    backgroundColor: D.primary,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryCtaFull: {
    flex: 0,
    width: '100%',
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
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(220,200,224,0.35)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryLabel: { fontFamily: DF.bold, fontSize: 10, color: D.onSurfaceVariant, textTransform: 'uppercase' },
  summaryValue: { flex: 1, fontFamily: DF.medium, fontSize: 12, color: D.onSurface, textAlign: 'right' },
});
