import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/ToastProvider';
import { LabOnboardingColors as C } from '../../constants/LabOnboardingColors';
import {
  ALCOHOL_OPTIONS,
  LAB_OCR_FIELDS,
  SMOKING_OPTIONS,
  type ExtractedLabField,
  type LabFieldKey,
} from '../../utils/labOnboarding';
import { ALCOHOL_LABELS, DIET_QUALITY_OPTIONS, SMOKING_LABELS } from '../../utils/featureEnums';
import { useOnboardingNav } from '../../utils/useOnboardingNav';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

function NumField({
  label,
  value,
  onChange,
  unit,
  locked,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  locked?: boolean;
}) {
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

export default function HealthFeaturesScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { goBack, canGoBack, stepInfo } = useOnboardingNav('health-features');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPartial, setIsPartial] = useState(false);
  const [labUploadId, setLabUploadId] = useState<number | null>(null);

  const [labValues, setLabValues] = useState<Record<LabFieldKey, string>>({
    cholesterol_total: '',
    ldl_cholesterol: '',
    hdl_cholesterol: '',
    triglycerides: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
  });
  const [labLocked, setLabLocked] = useState<Record<LabFieldKey, boolean>>({
    cholesterol_total: false,
    ldl_cholesterol: false,
    hdl_cholesterol: false,
    triglycerides: false,
    systolic_bp: false,
    diastolic_bp: false,
    heart_rate: false,
  });

  const [smoking, setSmoking] = useState<(typeof SMOKING_OPTIONS)[number]>('never');
  const [yearsSinceQuit, setYearsSinceQuit] = useState('');
  const [cigarettesPerDay, setCigarettesPerDay] = useState('');
  const [alcohol, setAlcohol] = useState<(typeof ALCOHOL_OPTIONS)[number]>('none');
  const [activityMin, setActivityMin] = useState('150');
  const [sleepHours, setSleepHours] = useState('7');
  const [screenHours, setScreenHours] = useState('4');
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('70');
  const [waistCm, setWaistCm] = useState('80');
  const [hipCm, setHipCm] = useState('95');
  const [familyDiabetes, setFamilyDiabetes] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [cardiovascular, setCardiovascular] = useState(false);
  const [dietQuality, setDietQuality] = useState<string | null>(null);
  const [hba1c, setHba1c] = useState('');
  const [hematocrit, setHematocrit] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const progress = await apiClient.getOnboardingProgress();
        const partial = progress.lab_opt_in === false;
        setIsPartial(partial);

        if (progress.lab_opt_in && progress.lab_review_done) {
          const upload = await apiClient.getCurrentLabUpload();
          setLabUploadId(upload.id);
          const extracted = upload.ocr_extracted_values || {};
          const next = { ...labValues };
          const locked = { ...labLocked };
          for (const field of LAB_OCR_FIELDS) {
            const cell = extracted[field.key] as ExtractedLabField | undefined;
            if (cell?.value != null) {
              next[field.key] = String(Math.round(cell.value));
              locked[field.key] = true;
            }
          }
          setLabValues(next);
          setLabLocked(locked);
        }
      } catch {
        // manual path — empty lab fields
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const bmi = useMemo(() => {
    const h = Number(heightCm) / 100;
    const w = Number(weightKg);
    if (!h || !w) return null;
    return (w / (h * h)).toFixed(1);
  }, [heightCm, weightKg]);

  const whr = useMemo(() => {
    const w = Number(waistCm);
    const h = Number(hipCm);
    if (!w || !h) return null;
    return (w / h).toFixed(2);
  }, [waistCm, hipCm]);

  const handleSubmit = async () => {
    const requiredNums = [
      { label: 'Activity minutes', v: activityMin, min: 0, max: 420 },
      { label: 'Sleep hours', v: sleepHours, min: 4, max: 10 },
      { label: 'Screen time', v: screenHours, min: 0, max: 16 },
      { label: 'Height', v: heightCm, min: 100, max: 230 },
      { label: 'Weight', v: weightKg, min: 30, max: 250 },
      { label: 'Waist', v: waistCm, min: 50, max: 200 },
      { label: 'Hip', v: hipCm, min: 60, max: 200 },
    ];

    if (!isPartial) {
      requiredNums.unshift(
        { label: 'Systolic BP', v: labValues.systolic_bp, min: 80, max: 200 },
        { label: 'Diastolic BP', v: labValues.diastolic_bp, min: 50, max: 130 },
        { label: 'Heart rate', v: labValues.heart_rate, min: 45, max: 120 }
      );
    }

    for (const item of requiredNums) {
      const n = Number(item.v);
      if (Number.isNaN(n) || n < item.min || n > item.max) {
        showToast.error('Validation', `${item.label} must be between ${item.min} and ${item.max}.`);
        return;
      }
    }

    if (smoking === 'former' && yearsSinceQuit.trim()) {
      const y = Number(yearsSinceQuit);
      if (Number.isNaN(y) || y < 0 || y > 60) {
        showToast.error('Validation', 'Years since quit must be 0–60.');
        return;
      }
    }
    if (smoking === 'current' && cigarettesPerDay.trim()) {
      const c = Number(cigarettesPerDay);
      if (Number.isNaN(c) || c < 0 || c > 60) {
        showToast.error('Validation', 'Cigarettes per day must be 0–60.');
        return;
      }
    }

    const optionalLab: Partial<Record<LabFieldKey, number>> = {};
    if (!isPartial) {
      for (const field of LAB_OCR_FIELDS.slice(0, 4)) {
        const raw = labValues[field.key].trim();
        if (raw) optionalLab[field.key] = Math.round(Number(raw));
      }
    }

    try {
      setSubmitting(true);
      const base = {
        smoking_status: smoking,
        years_since_quit: smoking === 'former' && yearsSinceQuit.trim() ? Number(yearsSinceQuit) : null,
        cigarettes_per_day: smoking === 'current' && cigarettesPerDay.trim() ? Number(cigarettesPerDay) : null,
        alcohol_group: alcohol,
        physical_activity_minutes: Math.round(Number(activityMin)),
        sleep_hours_per_day: Number(sleepHours),
        screen_time_hours_per_day: Number(screenHours),
        diet_quality: dietQuality,
        family_history_diabetes: familyDiabetes,
        hypertension_history: hypertension,
        cardiovascular_history: cardiovascular,
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        waist_cm: Number(waistCm),
        hip_cm: Number(hipCm),
        hba1c: hba1c.trim() ? Number(hba1c) : null,
        hematocrit: hematocrit.trim() ? Number(hematocrit) : null,
        partial: isPartial,
      };

      const result = await apiClient.submitHealthFeatures(
        isPartial
          ? base
          : {
              ...base,
              systolic_bp: Math.round(Number(labValues.systolic_bp)),
              diastolic_bp: Math.round(Number(labValues.diastolic_bp)),
              heart_rate: Math.round(Number(labValues.heart_rate)),
              cholesterol_total: optionalLab.cholesterol_total ?? null,
              ldl_cholesterol: optionalLab.ldl_cholesterol ?? null,
              hdl_cholesterol: optionalLab.hdl_cholesterol ?? null,
              triglycerides: optionalLab.triglycerides ?? null,
              source_lab_upload_id: labUploadId,
            }
      );
      await refreshUser();
      const risk = result.prediction?.diabetes_risk_score;
      if (isPartial) {
        showToast.success(
          'Estimated risk ready',
          risk != null
            ? `Your estimated score is ~${risk.toFixed(0)}. Upload lab results for full accuracy.`
            : 'Profile saved. Upload lab results when ready.'
        );
      } else {
        showToast.success(
          'Profile complete',
          risk != null ? `Your baseline risk score is ${risk.toFixed(1)}.` : 'Welcome to your health portal.'
        );
      }
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save health profile.';
      showToast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable style={styles.headerBtn} onPress={goBack}>
            <ArrowLeft size={22} color={C.primary} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>{stepInfo.label}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isPartial ? (
          <>
            <Text style={styles.sectionTitle}>Your demographics</Text>
            <View style={styles.demoCard}>
              {[
                ['Age', user?.age != null ? String(user.age) : '—'],
                ['Gender', user?.gender ?? '—'],
                ['Ethnicity', user?.ethnicity ?? '—'],
                ['Education', user?.education_level ?? '—'],
                ['Major', user?.education_major ?? '—'],
                ['Employment', user?.employment_status ?? '—'],
                ['Income', user?.income_level ?? '—'],
              ].map(([label, value]) => (
                <View key={label} style={styles.demoRow}>
                  <Text style={styles.demoLabel}>{label}</Text>
                  <Text style={styles.demoValue}>{value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionHint}>
              Lab tests and vitals are skipped for now. You can upload results later from your dashboard.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Clinical values</Text>
            <Text style={styles.sectionHint}>Pre-filled from your lab report when available (editable).</Text>
            {LAB_OCR_FIELDS.map((field) => (
              <NumField
                key={field.key}
                label={field.label}
                unit={field.unit}
                value={labValues[field.key]}
                locked={labLocked[field.key]}
                onChange={(v) => setLabValues((prev) => ({ ...prev, [field.key]: v }))}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Lifestyle</Text>
        <Text style={styles.fieldLabel}>Smoking</Text>
        <View style={styles.chipRow}>
          {SMOKING_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setSmoking(opt)}
              style={[styles.chip, smoking === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, smoking === opt && styles.chipTextActive]}>
                {SMOKING_LABELS[opt] ?? opt}
              </Text>
            </Pressable>
          ))}
        </View>
        {smoking === 'former' ? (
          <NumField label="Years since you quit" value={yearsSinceQuit} onChange={setYearsSinceQuit} />
        ) : null}
        {smoking === 'current' ? (
          <NumField label="Cigarettes per day" value={cigarettesPerDay} onChange={setCigarettesPerDay} />
        ) : null}

        <Text style={styles.fieldLabel}>Alcohol</Text>
        <View style={styles.chipRow}>
          {ALCOHOL_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setAlcohol(opt)}
              style={[styles.chip, alcohol === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, alcohol === opt && styles.chipTextActive]}>
                {ALCOHOL_LABELS[opt] ?? opt}
              </Text>
            </Pressable>
          ))}
        </View>

        <NumField label="Physical activity" value={activityMin} onChange={setActivityMin} unit="min/week" />
        <NumField label="Sleep" value={sleepHours} onChange={setSleepHours} unit="hours/day" />
        <NumField label="Screen time" value={screenHours} onChange={setScreenHours} unit="hours/day" />

        <Text style={styles.fieldLabel}>Diet quality (optional)</Text>
        <View style={styles.chipRow}>
          {DIET_QUALITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setDietQuality(opt.value)}
              style={[styles.chip, dietQuality === opt.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, dietQuality === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Body measurements</Text>
        <NumField label="Height" value={heightCm} onChange={setHeightCm} unit="cm" />
        <NumField label="Weight" value={weightKg} onChange={setWeightKg} unit="kg" />
        {bmi ? <Text style={styles.calc}>BMI: {bmi}</Text> : null}
        <NumField label="Waist" value={waistCm} onChange={setWaistCm} unit="cm" />
        <NumField label="Hip" value={hipCm} onChange={setHipCm} unit="cm" />
        {whr ? <Text style={styles.calc}>Waist-to-hip ratio: {whr}</Text> : null}

        <Text style={styles.sectionTitle}>Additional labs (optional)</Text>
        <Text style={styles.sectionHint}>HbA1c and hematocrit feed the complications model if you have them.</Text>
        <NumField label="HbA1c" value={hba1c} onChange={setHba1c} unit="%" />
        <NumField label="Hematocrit" value={hematocrit} onChange={setHematocrit} unit="%" />

        <Text style={styles.sectionTitle}>Medical history</Text>
        <YesNoRow
          label="Family history of diabetes"
          value={familyDiabetes}
          onChange={setFamilyDiabetes}
        />
        <YesNoRow
          label="Hypertension history"
          value={hypertension}
          onChange={setHypertension}
        />
        <YesNoRow
          label="Cardiovascular history"
          value={cardiovascular}
          onChange={setCardiovascular}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.confirmBtn, submitting && styles.confirmDisabled]}>
          {submitting ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <Text style={styles.confirmText}>
              {isPartial ? 'See estimated risk score' : 'Complete onboarding'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.outlineVariant,
  },
  headerBtn: { width: 40, height: 40 },
  headerTitle: { fontFamily: FONT.bold, fontSize: 17, color: C.onSurface },
  scroll: { padding: 20, paddingBottom: 120, gap: 10, maxWidth: 560, alignSelf: 'center', width: '100%' },
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
  calc: { fontFamily: FONT.bold, fontSize: 14, color: C.secondary, marginBottom: 8 },
  demoCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: C.outlineVariant,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.outlineVariant,
    backgroundColor: C.surface,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: { opacity: 0.7 },
  confirmText: { fontFamily: FONT.bold, fontSize: 16, color: C.onPrimary },
});
