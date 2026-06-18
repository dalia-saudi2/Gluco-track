import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';
import { useD } from '../../hooks/useDashboardTheme';
import { classifyGlucoseReading, classificationColor } from '../../utils/glucoseReadingClassify';
import { READING_TYPE_OPTIONS, type GlucoseReadingType } from '../../types/glucoseReading';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: {
    value_mgdl: number;
    reading_type: GlucoseReadingType;
    measured_at: string;
    notes?: string;
  }) => Promise<void>;
};

export function AddGlucoseReadingSheet({ visible, onClose, onSave }: Props) {
  const D = useD();
  const s = useMemo(() => createStyles(D), [D]);

  const [valueText, setValueText] = useState('');
  const [readingType, setReadingType] = useState<GlucoseReadingType>('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const numericValue = useMemo(() => {
    const n = Number(valueText.trim());
    return Number.isFinite(n) ? n : null;
  }, [valueText]);

  const liveStatus = useMemo(
    () => classifyGlucoseReading(numericValue, readingType),
    [numericValue, readingType]
  );

  const notesWarn = notes.length >= 400;

  const reset = () => {
    setValueText('');
    setReadingType('fasting');
    setNotes('');
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (numericValue == null || numericValue < 20 || numericValue > 600) return;
    if (notes.length > 500) return;
    try {
      setSaving(true);
      await onSave({
        value_mgdl: Math.round(numericValue),
        reading_type: readingType,
        measured_at: new Date().toISOString(),
        notes: notes.trim() || undefined,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = numericValue != null && numericValue >= 20 && numericValue <= 600 && notes.length <= 500;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.backdropTap} onPress={handleClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Add glucose reading</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={20} color={D.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
            <Text style={s.fieldLabel}>Glucose (mg/dL)</Text>
            <TextInput
              style={s.valueInput}
              value={valueText}
              onChangeText={setValueText}
              keyboardType="number-pad"
              placeholder="114"
              placeholderTextColor={D.onSurfaceVariant}
              maxLength={3}
            />
            {liveStatus ? (
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: classificationColor(liveStatus.color) }]} />
                <Text style={[s.statusText, { color: classificationColor(liveStatus.color) }]}>
                  {liveStatus.label}
                </Text>
              </View>
            ) : (
              <Text style={s.hint}>Enter a value between 20 and 600</Text>
            )}

            <Text style={[s.fieldLabel, s.sectionGap]}>Reading type</Text>
            <View style={s.chipRow}>
              {READING_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setReadingType(opt.value)}
                  style={[s.chip, readingType === opt.value && s.chipActive]}
                >
                  <Text style={[s.chipText, readingType === opt.value && s.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.fieldLabel, s.sectionGap]}>Notes (optional)</Text>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Before breakfast, felt fine"
              placeholderTextColor={D.onSurfaceVariant}
              multiline
              maxLength={500}
            />
            <Text style={[s.charCount, notesWarn && s.charCountWarn]}>
              {notes.length}/500
            </Text>
          </ScrollView>

          <View style={s.actions}>
            <Pressable style={s.cancelBtn} onPress={handleClose} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.saveBtn, (!canSave || saving) && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator color={D.onPrimary} />
              ) : (
                <Text style={s.saveText}>Save reading</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(D: DashboardPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: D.overlay },
    backdropTap: { flex: 1 },
    sheet: {
      backgroundColor: D.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '88%',
      borderWidth: 1,
      borderColor: D.cardBorder,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: D.surfaceContainerHigh,
      alignSelf: 'center',
      marginTop: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: { fontFamily: DF.bold, fontSize: 18, color: D.onSurface },
    body: { paddingHorizontal: 20, paddingBottom: 12 },
    fieldLabel: {
      fontFamily: DF.bold,
      fontSize: 11,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    sectionGap: { marginTop: 18 },
    valueInput: {
      fontFamily: DF.bold,
      fontSize: 36,
      color: D.primary,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: 'rgba(224,64,160,0.25)',
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontFamily: DF.medium, fontSize: 13, flex: 1 },
    hint: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: D.surfaceContainer,
      borderWidth: 1,
      borderColor: D.cardBorder,
    },
    chipActive: { backgroundColor: 'rgba(224,64,160,0.12)', borderColor: D.primary },
    chipText: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant },
    chipTextActive: { fontFamily: DF.bold, color: D.primary },
    notesInput: {
      minHeight: 72,
      borderWidth: 1,
      borderColor: D.cardBorder,
      borderRadius: 14,
      padding: 12,
      fontFamily: DF.medium,
      fontSize: 14,
      color: D.onSurface,
      textAlignVertical: 'top',
      backgroundColor: D.surfaceContainerLow,
    },
    charCount: {
      fontFamily: DF.medium,
      fontSize: 11,
      color: D.onSurfaceVariant,
      textAlign: 'right',
      marginTop: 4,
    },
    charCountWarn: { color: '#d97706' },
    actions: {
      flexDirection: 'row',
      gap: 10,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: D.cardBorder,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
      backgroundColor: D.surfaceContainer,
    },
    cancelText: { fontFamily: DF.bold, fontSize: 14, color: D.onSurfaceVariant },
    saveBtn: {
      flex: 1.4,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
      backgroundColor: D.primary,
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveText: { fontFamily: DF.bold, fontSize: 14, color: D.onPrimary },
  });
}
