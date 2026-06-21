import React, { useEffect, useState } from 'react';
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
import { apiClient } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ToastProvider';
import { LabOnboardingColors as C } from '../constants/LabOnboardingColors';
import {
  ComplicationVisitFields,
  type ComplicationVisitState,
} from '../components/onboarding/ComplicationVisitFields';
import { LAB_OCR_FIELDS, type LabFieldKey } from '../utils/labOnboarding';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeVisitDateIso(raw: string): string | null {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function bmiFromHeightWeight(heightCm?: number | null, weightKg?: number | null): string {
  if (heightCm == null || weightKg == null || heightCm <= 0 || weightKg <= 0) return '';
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}

function normalizeGender(value?: string | null): string | null {
  const g = (value || '').trim().toLowerCase();
  if (g.startsWith('f')) return 'female';
  if (g.startsWith('m')) return 'male';
  return null;
}

function NumField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {unit ? ` (${unit})` : ''}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholderTextColor={C.onSurfaceVariant}
      />
    </View>
  );
}

export default function LogLabVisitScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bmiInput, setBmiInput] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [hematocrit, setHematocrit] = useState('');
  const [labValues, setLabValues] = useState<Record<LabFieldKey, string>>({
    cholesterol_total: '',
    ldl_cholesterol: '',
    hdl_cholesterol: '',
    triglycerides: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
  });
  const [complicationVisit, setComplicationVisit] = useState<ComplicationVisitState>({
    visitDate: todayISO(),
    durationYears: '',
    visitAge: user?.age != null ? String(user.age) : '',
    gender: normalizeGender(user?.gender),
    diabetesType: null,
    medications: '',
    hypertension: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiClient.getClinicalProfile();
        setComplicationVisit((prev) => ({
          ...prev,
          durationYears:
            profile.years_since_diagnosis != null
              ? String(profile.years_since_diagnosis)
              : prev.durationYears,
          diabetesType: profile.diabetes_type ?? prev.diabetesType,
          medications: profile.medication_list ?? prev.medications,
        }));
      } catch {
        // optional
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (bmiInput.trim()) return;
    const fromUser = bmiFromHeightWeight(user?.height_cm, user?.weight_kg);
    if (fromUser) setBmiInput(fromUser);
  }, [user?.height_cm, user?.weight_kg, bmiInput]);

  const handleSubmit = async () => {
    const cv = complicationVisit;
    const visitDate = normalizeVisitDateIso(cv.visitDate);
    if (!visitDate) {
      showToast.error('Validation', 'Use visit date as YYYY-MM-DD or DD-MM-YYYY (e.g. 2026-06-21).');
      return;
    }
    const duration = Number(cv.durationYears);
    if (Number.isNaN(duration) || duration < 0 || duration > 80) {
      showToast.error('Validation', 'Duration of diabetes must be 0–80 years.');
      return;
    }
    const age = Number(cv.visitAge);
    if (Number.isNaN(age) || age < 18 || age > 100) {
      showToast.error('Validation', 'Age must be 18–100.');
      return;
    }
    if (!cv.gender || !cv.diabetesType) {
      showToast.error('Validation', 'Select gender and diabetes type.');
      return;
    }
    const bmiValue = Number(bmiInput);
    if (Number.isNaN(bmiValue) || bmiValue < 10 || bmiValue > 80) {
      showToast.error('Validation', 'BMI must be between 10 and 80.');
      return;
    }

    const requiredLabs = [
      { label: 'Systolic BP', v: labValues.systolic_bp, min: 80, max: 200 },
      { label: 'Diastolic BP', v: labValues.diastolic_bp, min: 50, max: 130 },
    ];
    for (const item of requiredLabs) {
      const n = Number(item.v);
      if (Number.isNaN(n) || n < item.min || n > item.max) {
        showToast.error('Validation', `${item.label} must be between ${item.min} and ${item.max}.`);
        return;
      }
    }

    const optionalNums: Record<string, number | null> = {};
    for (const field of LAB_OCR_FIELDS.slice(0, 4)) {
      const raw = labValues[field.key].trim();
      optionalNums[field.key] = raw ? Math.round(Number(raw)) : null;
    }

    try {
      setSubmitting(true);
      await apiClient.submitLabVisit({
        visit_date: visitDate,
        duration_years: duration,
        age,
        bmi: Number(bmiValue.toFixed(2)),
        hba1c: hba1c.trim() ? Number(hba1c) : null,
        systolic_bp: Math.round(Number(labValues.systolic_bp)),
        diastolic_bp: Math.round(Number(labValues.diastolic_bp)),
        total_cholesterol: optionalNums.cholesterol_total,
        ldl: optionalNums.ldl_cholesterol,
        hdl: optionalNums.hdl_cholesterol,
        triglycerides: optionalNums.triglycerides,
        hematocrit: hematocrit.trim() ? Number(hematocrit) : null,
        gender: cv.gender,
        diabetes_type: cv.diabetesType,
        hypertension: cv.hypertension ? 'Yes' : 'No',
        medications: cv.medications.trim() || null,
      });
      showToast.success('Visit saved', 'Complication risks updated from your latest lab visit.');
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save lab visit.';
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
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Log lab visit</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <ComplicationVisitFields
          values={complicationVisit}
          onChange={(patch) => setComplicationVisit((prev) => ({ ...prev, ...patch }))}
          showLabFields
          labValues={labValues}
          onLabChange={(key, value) => setLabValues((prev) => ({ ...prev, [key]: value }))}
          hba1c={hba1c}
          hematocrit={hematocrit}
          onHba1cChange={setHba1c}
          onHematocritChange={setHematocrit}
          omitLabFields={['heart_rate']}
          visitDateHint="Use today's date for a new visit, or pick an earlier date to backfill history."
        />

        <Text style={styles.sectionTitle}>BMI</Text>
        <Text style={styles.sectionHint}>Enter your BMI for this visit (required by the complications model).</Text>
        <NumField label="BMI" value={bmiInput} onChange={setBmiInput} unit="kg/m²" />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.confirmBtn, submitting && styles.confirmDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <Text style={styles.confirmText}>Save visit & update risks</Text>
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
  headerBtn: { width: 40, height: 40, justifyContent: 'center' },
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
