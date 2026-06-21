import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LabOnboardingColors as C } from '../../constants/LabOnboardingColors';
import { DIABETES_TYPE_OPTIONS, GENDER_OPTIONS } from '../../utils/featureEnums';
import { LAB_OCR_FIELDS, type LabFieldKey } from '../../utils/labOnboarding';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

export type ComplicationVisitState = {
  visitDate: string;
  durationYears: string;
  visitAge: string;
  gender: string | null;
  diabetesType: string | null;
  medications: string;
  hypertension: boolean;
};

type NumFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  locked?: boolean;
};

function NumField({ label, value, onChange, unit, locked }: NumFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {unit ? ` (${unit})` : ''}
        {locked ? ' · from lab' : ''}
      </Text>
      <TextInput
        style={[styles.input, locked && styles.inputLocked]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholderTextColor={C.onSurfaceVariant}
      />
    </View>
  );
}

type Props = {
  values: ComplicationVisitState;
  onChange: (patch: Partial<ComplicationVisitState>) => void;
  showLabFields?: boolean;
  labValues?: Record<LabFieldKey, string>;
  labLocked?: Record<LabFieldKey, boolean>;
  onLabChange?: (key: LabFieldKey, value: string) => void;
  hba1c?: string;
  hematocrit?: string;
  onHba1cChange?: (v: string) => void;
  onHematocritChange?: (v: string) => void;
  visitDateHint?: string;
  omitLabFields?: LabFieldKey[];
};

export function ComplicationVisitFields({
  values,
  onChange,
  showLabFields = false,
  labValues,
  labLocked,
  onLabChange,
  hba1c = '',
  hematocrit = '',
  onHba1cChange,
  onHematocritChange,
  visitDateHint,
  omitLabFields = [],
}: Props) {
  const labFields = LAB_OCR_FIELDS.filter((f) => !omitLabFields.includes(f.key));
  return (
    <>
      <Text style={styles.sectionTitle}>Complication risk visit</Text>
      <Text style={styles.sectionHint}>
        These fields feed the complications model. Visit #1 is created at signup; later visits use the visit date.
        {visitDateHint ? ` ${visitDateHint}` : ''}
      </Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Visit date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={values.visitDate}
          onChangeText={(v) => onChange({ visitDate: v })}
          placeholder="2026-06-21"
          placeholderTextColor={C.onSurfaceVariant}
          autoCapitalize="none"
        />
      </View>

      <NumField
        label="Duration of diabetes"
        value={values.durationYears}
        onChange={(v) => onChange({ durationYears: v })}
        unit="years"
      />
      <NumField
        label="Age at visit"
        value={values.visitAge}
        onChange={(v) => onChange({ visitAge: v })}
        unit="years"
      />

      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange({ gender: opt.value })}
            style={[styles.chip, values.gender === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, values.gender === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Diabetes type</Text>
      <View style={styles.chipRow}>
        {DIABETES_TYPE_OPTIONS.filter((o) => o.value !== 'unknown').map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange({ diabetesType: opt.value })}
            style={[styles.chip, values.diabetesType === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, values.diabetesType === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Medications</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={values.medications}
          onChangeText={(v) => onChange({ medications: v })}
          placeholder="e.g. Metformin, Lisinopril"
          placeholderTextColor={C.onSurfaceVariant}
          multiline
        />
      </View>

      <View style={styles.yesNoRow}>
        <Text style={styles.yesNoLabel}>Hypertension</Text>
        <View style={styles.yesNoChips}>
          <Pressable
            onPress={() => onChange({ hypertension: true })}
            style={[styles.yesNoChip, values.hypertension && styles.yesNoChipActive]}
          >
            <Text style={[styles.yesNoChipText, values.hypertension && styles.yesNoChipTextActive]}>Yes</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange({ hypertension: false })}
            style={[styles.yesNoChip, !values.hypertension && styles.yesNoChipActive]}
          >
            <Text style={[styles.yesNoChipText, !values.hypertension && styles.yesNoChipTextActive]}>No</Text>
          </Pressable>
        </View>
      </View>

      {showLabFields && labValues && onLabChange ? (
        <>
          <Text style={styles.sectionTitle}>Lab values for this visit</Text>
          <Text style={styles.sectionHint}>Required for complication predictions when no lab upload is used.</Text>
          {labFields.map((field) => (
            <NumField
              key={field.key}
              label={field.label}
              unit={field.unit}
              value={labValues[field.key]}
              locked={labLocked?.[field.key]}
              onChange={(v) => onLabChange(field.key, v)}
            />
          ))}
          {onHba1cChange ? (
            <NumField label="HbA1c" value={hba1c} onChange={onHba1cChange} unit="%" />
          ) : null}
          {onHematocritChange ? (
            <NumField label="Hematocrit" value={hematocrit} onChange={onHematocritChange} unit="%" />
          ) : null}
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.onSurface,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHint: { fontFamily: FONT.medium, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 8 },
  field: { gap: 4, marginBottom: 6 },
  fieldLabel: { fontFamily: FONT.bold, fontSize: 13, color: C.onSurfaceVariant },
  input: {
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONT.medium,
    fontSize: 16,
    backgroundColor: '#fff',
    color: C.onSurface,
  },
  inputLocked: { backgroundColor: C.surfaceContainerLow, borderColor: C.primary },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: FONT.medium, fontSize: 13, color: C.onSurface },
  chipTextActive: { color: C.onPrimary },
  yesNoRow: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainer,
  },
  yesNoLabel: { fontFamily: FONT.medium, fontSize: 14, color: C.onSurface },
  yesNoChips: { flexDirection: 'row', gap: 10 },
  yesNoChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.outlineVariant,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  yesNoChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  yesNoChipText: { fontFamily: FONT.bold, fontSize: 14, color: C.onSurfaceVariant },
  yesNoChipTextActive: { color: C.onPrimary },
});
