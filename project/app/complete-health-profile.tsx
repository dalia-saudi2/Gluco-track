import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { apiClient } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ToastProvider';
import { LabOnboardingColors as C } from '../constants/LabOnboardingColors';
import {
  ETHNICITY_OPTIONS,
  EMPLOYMENT_OPTIONS,
  INCOME_OPTIONS,
} from '../constants/OnboardingColors';
import { DEGREE_OPTIONS } from '../utils/onboardingValidation';
import { GENDER_OPTIONS, toApiEmployment, toApiEthnicity } from '../utils/featureEnums';
import {
  LAB_OCR_FIELDS,
  type ExtractedLabField,
  type LabFieldKey,
} from '../utils/labOnboarding';
import {
  UnifiedHealthProfileForm,
  type UnifiedVisitState,
} from '../components/onboarding/UnifiedHealthProfileForm';
import { setLabUploadReturnTo } from '../utils/labUploadReturn';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

function defaultVisitDate(createdAt?: string | null): string {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeGender(value?: string | null): string | null {
  const g = (value || '').trim().toLowerCase();
  if (g.startsWith('f')) return 'female';
  if (g.startsWith('m')) return 'male';
  return null;
}

export default function CompleteHealthProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [labChoice, setLabChoice] = useState<'yes' | 'no' | null>(null);
  const [labUploadId, setLabUploadId] = useState<number | null>(null);
  const [ethnicity, setEthnicity] = useState<string | null>(null);
  const [education, setEducation] = useState<string | null>(null);
  const [employment, setEmployment] = useState<string | null>(null);
  const [income, setIncome] = useState<string | null>(null);
  const [signupAge, setSignupAge] = useState('');
  const [signupGender, setSignupGender] = useState<string | null>(null);
  const [signupHeightCm, setSignupHeightCm] = useState('');
  const [signupWeightKg, setSignupWeightKg] = useState('');

  const needsSignupDemographics = useMemo(() => {
    if (!user) return true;
    return !(
      user.age != null &&
      user.age > 0 &&
      user.gender &&
      user.height_cm != null &&
      user.height_cm > 0 &&
      user.weight_kg != null &&
      user.weight_kg > 0
    );
  }, [user]);

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

  const [visit, setVisit] = useState<UnifiedVisitState>({
    visitDate: defaultVisitDate(user?.created_at),
    durationYears: '',
    visitAge: user?.age != null ? String(user.age) : '',
    gender: normalizeGender(user?.gender),
    diabetesType: null,
    medications: '',
    hypertension: false,
  });

  const [smoking, setSmoking] = useState<'never' | 'former' | 'current'>('never');
  const [yearsSinceQuit, setYearsSinceQuit] = useState('');
  const [cigarettesPerDay, setCigarettesPerDay] = useState('');
  const [alcohol, setAlcohol] = useState<'none' | 'light' | 'moderate' | 'heavy'>('none');
  const [activityMin, setActivityMin] = useState('150');
  const [sleepHours, setSleepHours] = useState('7');
  const [screenHours, setScreenHours] = useState('4');
  const [heightCm, setHeightCm] = useState(user?.height_cm != null ? String(user.height_cm) : '170');
  const [weightKg, setWeightKg] = useState(user?.weight_kg != null ? String(user.weight_kg) : '70');
  const [waistCm, setWaistCm] = useState('80');
  const [hipCm, setHipCm] = useState('95');
  const [familyDiabetes, setFamilyDiabetes] = useState(false);
  const [cardiovascular, setCardiovascular] = useState(false);
  const [dietQuality, setDietQuality] = useState<string | null>(null);
  const [hba1c, setHba1c] = useState('');
  const [hematocrit, setHematocrit] = useState('');
  const [fastingGlucose, setFastingGlucose] = useState('');
  const [glucosePostprandial, setGlucosePostprandial] = useState('');
  const [insulinLevel, setInsulinLevel] = useState('');

  const isPartial = labChoice === 'no';

  useEffect(() => {
    (async () => {
      try {
        const progress = await apiClient.getOnboardingProgress();
        if (progress.lab_opt_in != null) {
          setLabChoice(progress.lab_opt_in ? 'yes' : 'no');
        }

        setEthnicity(user?.ethnicity ?? null);
        setEducation(user?.education_level ?? null);
        setEmployment(user?.employment_status ?? null);
        setIncome(user?.income_level ?? null);

        if (user?.height_cm != null) setHeightCm(String(user.height_cm));
        if (user?.weight_kg != null) setWeightKg(String(user.weight_kg));
        if (user?.age != null) setSignupAge(String(user.age));
        if (user?.gender) setSignupGender(normalizeGender(user.gender));
        if (user?.height_cm != null) setSignupHeightCm(String(user.height_cm));
        if (user?.weight_kg != null) setSignupWeightKg(String(user.weight_kg));

        try {
          const profile = await apiClient.getClinicalProfile();
          setVisit((prev) => ({
            ...prev,
            durationYears:
              profile.years_since_diagnosis != null
                ? String(profile.years_since_diagnosis)
                : prev.durationYears,
            diabetesType: profile.diabetes_type ?? prev.diabetesType,
            medications: profile.medication_list ?? prev.medications,
          }));
        } catch {
          // optional prefill
        }

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
        // manual path
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.ethnicity, user?.education_level, user?.employment_status, user?.income_level, user?.height_cm, user?.weight_kg]);

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

  const handleLabChoice = async (choice: 'yes' | 'no') => {
    try {
      setLabChoice(choice);
      await apiClient.updateOnboardingLabChoice(choice === 'yes');
      if (choice === 'yes') {
        setLabUploadReturnTo('/complete-health-profile');
        router.push('/onboarding/lab-upload');
      }
    } catch (e: unknown) {
      showToast.error('Error', e instanceof Error ? e.message : 'Could not save lab choice.');
    }
  };

  const handleSubmit = async () => {
    if (needsSignupDemographics) {
      const age = Number(signupAge);
      const height = Number(signupHeightCm);
      const weight = Number(signupWeightKg);
      if (Number.isNaN(age) || age < 18 || age > 100) {
        showToast.error('Validation', 'Age must be between 18 and 100.');
        return;
      }
      if (!signupGender) {
        showToast.error('Validation', 'Select gender.');
        return;
      }
      if (Number.isNaN(height) || height < 100 || height > 250) {
        showToast.error('Validation', 'Height must be between 100 and 250 cm.');
        return;
      }
      if (Number.isNaN(weight) || weight < 30 || weight > 250) {
        showToast.error('Validation', 'Weight must be between 30 and 250 kg.');
        return;
      }
    }

    if (labChoice == null) {
      showToast.error('Validation', 'Choose whether you have lab results to upload.');
      return;
    }
    if (!ethnicity || !education || !employment || !income) {
      showToast.error('Validation', 'Complete ethnicity, education, employment, and income.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.visitDate.trim())) {
      showToast.error('Validation', 'Enter visit date as YYYY-MM-DD.');
      return;
    }
    const duration = Number(visit.durationYears);
    if (Number.isNaN(duration) || duration < 0 || duration > 80) {
      showToast.error('Validation', 'Duration of diabetes must be 0–80 years.');
      return;
    }
    const visitAge = Number(visit.visitAge);
    if (Number.isNaN(visitAge) || visitAge < 18 || visitAge > 100) {
      showToast.error('Validation', 'Age at visit must be 18–100.');
      return;
    }
    if (!visit.gender) {
      showToast.error('Validation', 'Select gender.');
      return;
    }
    if (!visit.diabetesType) {
      showToast.error('Validation', 'Select diabetes type.');
      return;
    }

    const requiredNums = [
      { label: 'Activity minutes', v: activityMin, min: 0, max: 420 },
      { label: 'Sleep hours', v: sleepHours, min: 4, max: 10 },
      { label: 'Screen time', v: screenHours, min: 0, max: 16 },
      { label: 'Height', v: heightCm, min: 100, max: 230 },
      { label: 'Weight', v: weightKg, min: 30, max: 250 },
      { label: 'Waist', v: waistCm, min: 50, max: 200 },
      { label: 'Hip', v: hipCm, min: 60, max: 200 },
      { label: 'Systolic BP', v: labValues.systolic_bp, min: 80, max: 200 },
      { label: 'Diastolic BP', v: labValues.diastolic_bp, min: 50, max: 130 },
    ];

    if (!isPartial) {
      requiredNums.push({ label: 'Heart rate', v: labValues.heart_rate, min: 45, max: 120 });
    }

    for (const item of requiredNums) {
      const n = Number(item.v);
      if (Number.isNaN(n) || n < item.min || n > item.max) {
        showToast.error('Validation', `${item.label} must be between ${item.min} and ${item.max}.`);
        return;
      }
    }

    const optionalLab: Partial<Record<LabFieldKey, number>> = {};
    for (const field of LAB_OCR_FIELDS.slice(0, 4)) {
      const raw = labValues[field.key].trim();
      if (raw) optionalLab[field.key] = Math.round(Number(raw));
    }

    const parseOptional = (raw: string, label: string, min: number, max: number) => {
      if (!raw.trim()) return null;
      const n = Number(raw);
      if (Number.isNaN(n) || n < min || n > max) {
        throw new Error(`${label} must be between ${min} and ${max}.`);
      }
      return n;
    };

    try {
      setSubmitting(true);

      if (needsSignupDemographics) {
        await apiClient.updateUser({
          age: Number(signupAge),
          gender: signupGender!,
          height_cm: Number(signupHeightCm),
          weight_kg: Number(signupWeightKg),
        });
      }

      await apiClient.updateOnboardingDemographics({
        ethnicity: toApiEthnicity(ethnicity),
        education_level: education,
        employment_status: toApiEmployment(employment),
        income_level: income,
      });

      const base = {
        visit_date: visit.visitDate.trim(),
        duration_years: duration,
        visit_age: visitAge,
        visit_gender: visit.gender,
        diabetes_type: visit.diabetesType,
        medications: visit.medications.trim() || null,
        smoking_status: smoking,
        years_since_quit: smoking === 'former' && yearsSinceQuit.trim() ? Number(yearsSinceQuit) : null,
        cigarettes_per_day: smoking === 'current' && cigarettesPerDay.trim() ? Number(cigarettesPerDay) : null,
        alcohol_group: alcohol,
        physical_activity_minutes: Math.round(Number(activityMin)),
        sleep_hours_per_day: Number(sleepHours),
        screen_time_hours_per_day: Number(screenHours),
        diet_quality: dietQuality,
        family_history_diabetes: familyDiabetes,
        hypertension_history: visit.hypertension,
        cardiovascular_history: cardiovascular,
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        waist_cm: Number(waistCm),
        hip_cm: Number(hipCm),
        hba1c: parseOptional(hba1c, 'HbA1c', 3, 20),
        hematocrit: parseOptional(hematocrit, 'Hematocrit', 20, 60),
        fasting_glucose: parseOptional(fastingGlucose, 'Fasting glucose', 40, 600),
        glucose_postprandial: parseOptional(glucosePostprandial, 'Postprandial glucose', 40, 600),
        insulin_level: parseOptional(insulinLevel, 'Insulin level', 0.1, 500),
        partial: isPartial,
        systolic_bp: Math.round(Number(labValues.systolic_bp)),
        diastolic_bp: Math.round(Number(labValues.diastolic_bp)),
        heart_rate: labValues.heart_rate.trim() ? Math.round(Number(labValues.heart_rate)) : null,
        cholesterol_total: optionalLab.cholesterol_total ?? null,
        ldl_cholesterol: optionalLab.ldl_cholesterol ?? null,
        hdl_cholesterol: optionalLab.hdl_cholesterol ?? null,
        triglycerides: optionalLab.triglycerides ?? null,
      };

      const result = await apiClient.submitHealthFeatures(
        isPartial
          ? base
          : {
              ...base,
              source_lab_upload_id: labUploadId,
            }
      );
      await refreshUser();
      const risk = result.prediction?.diabetes_risk_score;
      showToast.success(
        'Profile complete',
        risk != null ? `Your baseline risk score is ${risk.toFixed(1)}.` : 'AI predictions are now available.'
      );
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
        <Pressable style={styles.headerBtn} onPress={() => router.replace('/(tabs)')}>
          <ArrowLeft size={22} color={C.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Complete Your Health Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {needsSignupDemographics ? (
          <>
            <Text style={styles.sectionTitle}>Account details</Text>
            <Text style={styles.sectionHint}>Required demographic information for your account.</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={signupAge}
                onChangeText={setSignupAge}
                keyboardType="number-pad"
                placeholderTextColor={C.onSurfaceVariant}
              />
            </View>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSignupGender(opt.value)}
                  style={[styles.chip, signupGender === opt.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, signupGender === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={signupHeightCm}
                onChangeText={setSignupHeightCm}
                keyboardType="number-pad"
                placeholderTextColor={C.onSurfaceVariant}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={signupWeightKg}
                onChangeText={setSignupWeightKg}
                keyboardType="number-pad"
                placeholderTextColor={C.onSurfaceVariant}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Lab results</Text>
        <Text style={styles.sectionHint}>
          Upload a lab report to pre-fill values, or enter vitals manually below.
        </Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => handleLabChoice('yes')}
            style={[styles.chip, labChoice === 'yes' && styles.chipActive]}
          >
            <Text style={[styles.chipText, labChoice === 'yes' && styles.chipTextActive]}>I have lab results</Text>
          </Pressable>
          <Pressable
            onPress={() => handleLabChoice('no')}
            style={[styles.chip, labChoice === 'no' && styles.chipActive]}
          >
            <Text style={[styles.chipText, labChoice === 'no' && styles.chipTextActive]}>Enter manually</Text>
          </Pressable>
        </View>
        {labChoice === 'yes' ? (
          <Pressable
            style={styles.uploadLink}
            onPress={() => {
              setLabUploadReturnTo('/complete-health-profile');
              router.push('/onboarding/lab-upload');
            }}
          >
            <Upload size={16} color={C.primary} />
            <Text style={styles.uploadLinkText}>Upload or review lab report</Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>Extended demographics</Text>
        <Text style={styles.sectionHint}>Required for the diabetes staging model.</Text>
        <Text style={styles.fieldLabel}>Ethnicity</Text>
        <View style={styles.chipRow}>
          {ETHNICITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setEthnicity(opt)}
              style={[styles.chip, ethnicity === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, ethnicity === opt && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Education</Text>
        <View style={styles.chipRow}>
          {DEGREE_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setEducation(opt)}
              style={[styles.chip, education === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, education === opt && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Employment</Text>
        <View style={styles.chipRow}>
          {EMPLOYMENT_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setEmployment(opt)}
              style={[styles.chip, employment === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, employment === opt && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Income level</Text>
        <View style={styles.chipRow}>
          {INCOME_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setIncome(opt)}
              style={[styles.chip, income === opt && styles.chipActive]}
            >
              <Text style={[styles.chipText, income === opt && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>

        <UnifiedHealthProfileForm
          user={user}
          isPartial={isPartial}
          visit={visit}
          onVisitChange={(patch) => setVisit((prev) => ({ ...prev, ...patch }))}
          labValues={labValues}
          labLocked={labLocked}
          onLabChange={(key, value) => setLabValues((prev) => ({ ...prev, [key]: value }))}
          hba1c={hba1c}
          hematocrit={hematocrit}
          fastingGlucose={fastingGlucose}
          glucosePostprandial={glucosePostprandial}
          insulinLevel={insulinLevel}
          onHba1cChange={setHba1c}
          onHematocritChange={setHematocrit}
          onFastingGlucoseChange={setFastingGlucose}
          onGlucosePostprandialChange={setGlucosePostprandial}
          onInsulinLevelChange={setInsulinLevel}
          smoking={smoking}
          onSmokingChange={setSmoking}
          yearsSinceQuit={yearsSinceQuit}
          onYearsSinceQuitChange={setYearsSinceQuit}
          cigarettesPerDay={cigarettesPerDay}
          onCigarettesPerDayChange={setCigarettesPerDay}
          alcohol={alcohol}
          onAlcoholChange={setAlcohol}
          activityMin={activityMin}
          onActivityMinChange={setActivityMin}
          sleepHours={sleepHours}
          onSleepHoursChange={setSleepHours}
          screenHours={screenHours}
          onScreenHoursChange={setScreenHours}
          dietQuality={dietQuality}
          onDietQualityChange={setDietQuality}
          heightCm={heightCm}
          onHeightCmChange={setHeightCm}
          weightKg={weightKg}
          onWeightKgChange={setWeightKg}
          waistCm={waistCm}
          onWaistCmChange={setWaistCm}
          hipCm={hipCm}
          onHipCmChange={setHipCm}
          bmi={bmi}
          whr={whr}
          familyDiabetes={familyDiabetes}
          onFamilyDiabetesChange={setFamilyDiabetes}
          cardiovascular={cardiovascular}
          onCardiovascularChange={setCardiovascular}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.confirmBtn, submitting && styles.confirmDisabled]}>
          {submitting ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <Text style={styles.confirmText}>Save & run predictions</Text>
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT.bold, fontSize: 17, color: C.onSurface, flex: 1, textAlign: 'center' },
  scroll: { padding: 20, paddingBottom: 120, gap: 10, maxWidth: 560, alignSelf: 'center', width: '100%' },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.onSurface,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHint: { fontFamily: FONT.medium, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 8 },
  fieldLabel: { fontFamily: FONT.bold, fontSize: 13, color: C.onSurfaceVariant, marginBottom: 6 },
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
  uploadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  uploadLinkText: { fontFamily: FONT.bold, fontSize: 14, color: C.primary },
  field: { gap: 4, marginBottom: 6 },
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
