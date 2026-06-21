import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LabOnboardingColors as C } from '../../constants/LabOnboardingColors';
import {
  ALCOHOL_OPTIONS,
  LAB_OCR_FIELDS,
  SMOKING_OPTIONS,
  type LabFieldKey,
} from '../../utils/labOnboarding';
import {
  ALCOHOL_LABELS,
  DIABETES_TYPE_OPTIONS,
  DIET_QUALITY_OPTIONS,
  GENDER_OPTIONS,
  SMOKING_LABELS,
} from '../../utils/featureEnums';
import type { User } from '../../services/authService';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

export type UnifiedVisitState = {
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
  hint?: string;
};

function NumField({ label, value, onChange, unit, locked, hint }: NumFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {unit ? ` (${unit})` : ''}
        {locked ? ' · from lab' : ''}
      </Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
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

function YesNoRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}</Text>
      <View style={styles.yesNoChips}>
        <Pressable
          onPress={() => onChange(true)}
          style={[styles.yesNoChip, value && styles.yesNoChipActive]}
        >
          <Text style={[styles.yesNoChipText, value && styles.yesNoChipTextActive]}>Yes</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(false)}
          style={[styles.yesNoChip, !value && styles.yesNoChipActive]}
        >
          <Text style={[styles.yesNoChipText, !value && styles.yesNoChipTextActive]}>No</Text>
        </Pressable>
      </View>
    </View>
  );
}

type Props = {
  user: User | null;
  isPartial: boolean;
  visit: UnifiedVisitState;
  onVisitChange: (patch: Partial<UnifiedVisitState>) => void;
  labValues: Record<LabFieldKey, string>;
  labLocked: Record<LabFieldKey, boolean>;
  onLabChange: (key: LabFieldKey, value: string) => void;
  hba1c: string;
  hematocrit: string;
  fastingGlucose: string;
  glucosePostprandial: string;
  insulinLevel: string;
  onHba1cChange: (v: string) => void;
  onHematocritChange: (v: string) => void;
  onFastingGlucoseChange: (v: string) => void;
  onGlucosePostprandialChange: (v: string) => void;
  onInsulinLevelChange: (v: string) => void;
  smoking: (typeof SMOKING_OPTIONS)[number];
  onSmokingChange: (v: (typeof SMOKING_OPTIONS)[number]) => void;
  yearsSinceQuit: string;
  onYearsSinceQuitChange: (v: string) => void;
  cigarettesPerDay: string;
  onCigarettesPerDayChange: (v: string) => void;
  alcohol: (typeof ALCOHOL_OPTIONS)[number];
  onAlcoholChange: (v: (typeof ALCOHOL_OPTIONS)[number]) => void;
  activityMin: string;
  onActivityMinChange: (v: string) => void;
  sleepHours: string;
  onSleepHoursChange: (v: string) => void;
  screenHours: string;
  onScreenHoursChange: (v: string) => void;
  dietQuality: string | null;
  onDietQualityChange: (v: string | null) => void;
  heightCm: string;
  onHeightCmChange: (v: string) => void;
  weightKg: string;
  onWeightKgChange: (v: string) => void;
  waistCm: string;
  onWaistCmChange: (v: string) => void;
  hipCm: string;
  onHipCmChange: (v: string) => void;
  bmi: string | null;
  whr: string | null;
  familyDiabetes: boolean;
  onFamilyDiabetesChange: (v: boolean) => void;
  cardiovascular: boolean;
  onCardiovascularChange: (v: boolean) => void;
};

export function UnifiedHealthProfileForm({
  user,
  isPartial,
  visit,
  onVisitChange,
  labValues,
  labLocked,
  onLabChange,
  hba1c,
  hematocrit,
  fastingGlucose,
  glucosePostprandial,
  insulinLevel,
  onHba1cChange,
  onHematocritChange,
  onFastingGlucoseChange,
  onGlucosePostprandialChange,
  onInsulinLevelChange,
  smoking,
  onSmokingChange,
  yearsSinceQuit,
  onYearsSinceQuitChange,
  cigarettesPerDay,
  onCigarettesPerDayChange,
  alcohol,
  onAlcoholChange,
  activityMin,
  onActivityMinChange,
  sleepHours,
  onSleepHoursChange,
  screenHours,
  onScreenHoursChange,
  dietQuality,
  onDietQualityChange,
  heightCm,
  onHeightCmChange,
  weightKg,
  onWeightKgChange,
  waistCm,
  onWaistCmChange,
  hipCm,
  onHipCmChange,
  bmi,
  whr,
  familyDiabetes,
  onFamilyDiabetesChange,
  cardiovascular,
  onCardiovascularChange,
}: Props) {
  return (
    <>
      <Text style={styles.introTitle}>Complete health profile</Text>
      <Text style={styles.introHint}>
        Enter your information once. We route the right fields to the diabetes risk model and the
        complications model automatically.
      </Text>

      {user ? (
        <>
          <Text style={styles.sectionTitle}>Demographics (from signup)</Text>
          <Text style={styles.sectionHint}>Used by the diabetes staging model.</Text>
          <View style={styles.demoCard}>
            {[
              ['Age', user.age != null ? String(user.age) : '—'],
              ['Gender', user.gender ?? '—'],
              ['Ethnicity', user.ethnicity ?? '—'],
              ['Education', user.education_level ?? '—'],
              ['Employment', user.employment_status ?? '—'],
              ['Income', user.income_level ?? '—'],
            ].map(([label, value]) => (
              <View key={label} style={styles.demoRow}>
                <Text style={styles.demoLabel}>{label}</Text>
                <Text style={styles.demoValue}>{value}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Visit & diabetes profile</Text>
      <Text style={styles.sectionHint}>Feeds the complications model and your clinical record.</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Visit date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={visit.visitDate}
          onChangeText={(v) => onVisitChange({ visitDate: v })}
          placeholder="2026-06-21"
          placeholderTextColor={C.onSurfaceVariant}
          autoCapitalize="none"
        />
      </View>

      <NumField
        label="Duration of diabetes"
        value={visit.durationYears}
        onChange={(v) => onVisitChange({ durationYears: v })}
        unit="years"
      />
      <NumField
        label="Age at this visit"
        value={visit.visitAge}
        onChange={(v) => onVisitChange({ visitAge: v })}
        unit="years"
      />

      <Text style={styles.fieldLabel}>Gender at visit</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onVisitChange({ gender: opt.value })}
            style={[styles.chip, visit.gender === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, visit.gender === opt.value && styles.chipTextActive]}>
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
            onPress={() => onVisitChange({ diabetesType: opt.value })}
            style={[styles.chip, visit.diabetesType === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, visit.diabetesType === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Medications</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={visit.medications}
          onChangeText={(v) => onVisitChange({ medications: v })}
          placeholder="e.g. Metformin, Insulin, Lisinopril"
          placeholderTextColor={C.onSurfaceVariant}
          multiline
        />
      </View>

      <YesNoRow
        label="Hypertension"
        value={visit.hypertension}
        onChange={(v) => onVisitChange({ hypertension: v })}
      />

      <Text style={styles.sectionTitle}>Vitals & laboratory tests</Text>
      <Text style={styles.sectionHint}>
        Shared by both models. {isPartial ? 'Blood pressure is required; other labs improve accuracy.' : 'Pre-filled from your lab report when available.'}
      </Text>

      {LAB_OCR_FIELDS.map((field) => (
        <NumField
          key={field.key}
          label={field.label}
          unit={field.unit}
          value={labValues[field.key]}
          locked={labLocked[field.key]}
          onChange={(v) => onLabChange(field.key, v)}
        />
      ))}

      <NumField label="HbA1c" value={hba1c} onChange={onHba1cChange} unit="%" />
      <NumField label="Hematocrit" value={hematocrit} onChange={onHematocritChange} unit="%" />
      <NumField
        label="Fasting glucose"
        value={fastingGlucose}
        onChange={onFastingGlucoseChange}
        unit="mg/dL"
        hint="Diabetes staging model (clinical mode)"
      />
      <NumField
        label="Postprandial glucose"
        value={glucosePostprandial}
        onChange={onGlucosePostprandialChange}
        unit="mg/dL"
        hint="Optional — diabetes staging model"
      />
      <NumField
        label="Insulin level"
        value={insulinLevel}
        onChange={onInsulinLevelChange}
        unit="µU/mL"
        hint="Optional — diabetes staging model"
      />

      <Text style={styles.sectionTitle}>Lifestyle</Text>
      <Text style={styles.fieldLabel}>Smoking</Text>
      <View style={styles.chipRow}>
        {SMOKING_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onSmokingChange(opt)}
            style={[styles.chip, smoking === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, smoking === opt && styles.chipTextActive]}>
              {SMOKING_LABELS[opt] ?? opt}
            </Text>
          </Pressable>
        ))}
      </View>
      {smoking === 'former' ? (
        <NumField label="Years since you quit" value={yearsSinceQuit} onChange={onYearsSinceQuitChange} />
      ) : null}
      {smoking === 'current' ? (
        <NumField label="Cigarettes per day" value={cigarettesPerDay} onChange={onCigarettesPerDayChange} />
      ) : null}

      <Text style={styles.fieldLabel}>Alcohol</Text>
      <View style={styles.chipRow}>
        {ALCOHOL_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onAlcoholChange(opt)}
            style={[styles.chip, alcohol === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, alcohol === opt && styles.chipTextActive]}>
              {ALCOHOL_LABELS[opt] ?? opt}
            </Text>
          </Pressable>
        ))}
      </View>

      <NumField label="Physical activity" value={activityMin} onChange={onActivityMinChange} unit="min/week" />
      <NumField label="Sleep" value={sleepHours} onChange={onSleepHoursChange} unit="hours/day" />
      <NumField label="Screen time" value={screenHours} onChange={onScreenHoursChange} unit="hours/day" />

      <Text style={styles.fieldLabel}>Diet quality (optional)</Text>
      <View style={styles.chipRow}>
        {DIET_QUALITY_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onDietQualityChange(opt.value)}
            style={[styles.chip, dietQuality === opt.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, dietQuality === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Body measurements</Text>
      <NumField label="Height" value={heightCm} onChange={onHeightCmChange} unit="cm" />
      <NumField label="Weight" value={weightKg} onChange={onWeightKgChange} unit="kg" />
      {bmi ? <Text style={styles.calc}>BMI: {bmi}</Text> : null}
      <NumField label="Waist" value={waistCm} onChange={onWaistCmChange} unit="cm" />
      <NumField label="Hip" value={hipCm} onChange={onHipCmChange} unit="cm" />
      {whr ? <Text style={styles.calc}>Waist-to-hip ratio: {whr}</Text> : null}

      <Text style={styles.sectionTitle}>Medical history</Text>
      <YesNoRow label="Family history of diabetes" value={familyDiabetes} onChange={onFamilyDiabetesChange} />
      <YesNoRow label="Cardiovascular history" value={cardiovascular} onChange={onCardiovascularChange} />
    </>
  );
}

const styles = StyleSheet.create({
  introTitle: { fontFamily: FONT.bold, fontSize: 20, color: C.onSurface, marginBottom: 4 },
  introHint: { fontFamily: FONT.medium, fontSize: 14, color: C.onSurfaceVariant, marginBottom: 12, lineHeight: 20 },
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
  fieldHint: { fontFamily: FONT.medium, fontSize: 11, color: C.onSurfaceVariant, fontStyle: 'italic' },
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
  calc: { fontFamily: FONT.bold, fontSize: 14, color: C.secondary, marginBottom: 8 },
  demoCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    marginBottom: 8,
  },
  demoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  demoLabel: { fontFamily: FONT.medium, fontSize: 13, color: C.onSurfaceVariant },
  demoValue: { fontFamily: FONT.bold, fontSize: 13, color: C.onSurface, flex: 1, textAlign: 'right' },
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
  chipText: { fontFamily: FONT.medium, fontSize: 13, color: C.onSurface, textTransform: 'capitalize' },
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
