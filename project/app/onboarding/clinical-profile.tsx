import React, { useState } from 'react';
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
import { OnboardingColors as C } from '../../constants/OnboardingColors';
import {
  DIABETES_TYPE_OPTIONS,
  INSULIN_REGIMEN_OPTIONS,
} from '../../utils/featureEnums';
import { resolveOnboardingRoute } from '../../utils/resolveOnboardingRoute';
import { useOnboardingNav } from '../../utils/useOnboardingNav';
import { authService } from '../../services/authService';

const FONT = { bold: 'DMSans_700Bold', medium: 'DMSans_500Medium' };

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.yesNo}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {([true, false] as const).map((opt) => (
          <Pressable
            key={String(opt)}
            onPress={() => onChange(opt)}
            style={[styles.chip, value === opt && styles.chipOn]}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextOn]}>{opt ? 'Yes' : 'No'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ClinicalProfileScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { goBack, canGoBack, stepInfo } = useOnboardingNav('clinical-profile');
  const [diabetesType, setDiabetesType] = useState<string | null>(null);
  const [yearDx, setYearDx] = useState('');
  const [onInsulin, setOnInsulin] = useState<boolean | null>(null);
  const [insulinRegimen, setInsulinRegimen] = useState<string | null>(null);
  const [onSglt2, setOnSglt2] = useState<boolean | null>(null);
  const [onMetformin, setOnMetformin] = useState<boolean | null>(null);
  const [onStatin, setOnStatin] = useState<boolean | null>(null);
  const [onAntihypertensive, setOnAntihypertensive] = useState<boolean | null>(null);
  const [hypertension, setHypertension] = useState<boolean | null>(null);
  const [medicationList, setMedicationList] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!diabetesType) {
      showToast.error('Validation', 'Please select diabetes type.');
      return;
    }
    if (onInsulin === null || onSglt2 === null || hypertension === null) {
      showToast.error('Validation', 'Please answer all required questions.');
      return;
    }

    const year = yearDx.trim() ? Number(yearDx) : null;
    if (year != null && (year < 1950 || year > new Date().getFullYear())) {
      showToast.error('Validation', 'Enter a valid year of diagnosis.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.updateClinicalProfile({
        diabetes_type: diabetesType,
        year_of_diagnosis: year,
        on_insulin: onInsulin,
        insulin_regimen: onInsulin ? insulinRegimen ?? undefined : undefined,
        on_sglt2i: onSglt2,
        on_metformin: onMetformin ?? undefined,
        on_statin: onStatin ?? undefined,
        on_antihypertensive: onAntihypertensive ?? undefined,
        medication_list: medicationList.trim() || undefined,
        hypertension_history: hypertension,
      });
      await refreshUser();
      const user = await authService.getCurrentUser();
      router.replace(await resolveOnboardingRoute(user));
    } catch (e: unknown) {
      showToast.error('Error', e instanceof Error ? e.message : 'Could not save clinical profile.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.title}>Diabetes clinical facts</Text>
        <Text style={styles.subtitle}>Group 2 — used for complication risk and your medical record.</Text>

        <Text style={styles.label}>Diabetes type</Text>
        <View style={styles.chipRow}>
          {DIABETES_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setDiabetesType(opt.value)}
              style={[styles.chip, diabetesType === opt.value && styles.chipOn]}
            >
              <Text style={[styles.chipText, diabetesType === opt.value && styles.chipTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Year of diagnosis (optional)</Text>
        <TextInput
          style={styles.input}
          value={yearDx}
          onChangeText={setYearDx}
          keyboardType="number-pad"
          placeholder="e.g. 2018"
          placeholderTextColor={C.onSurfaceVariant}
        />

        <YesNo label="On insulin?" value={onInsulin} onChange={setOnInsulin} />
        {onInsulin ? (
          <>
            <Text style={styles.label}>Insulin regimen</Text>
            <View style={styles.chipRow}>
              {INSULIN_REGIMEN_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setInsulinRegimen(opt.value)}
                  style={[styles.chip, insulinRegimen === opt.value && styles.chipOn]}
                >
                  <Text style={[styles.chipText, insulinRegimen === opt.value && styles.chipTextOn]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <YesNo label="On SGLT2 inhibitor (e.g. Jardiance, Farxiga)?" value={onSglt2} onChange={setOnSglt2} />
        <YesNo label="Diagnosed hypertension?" value={hypertension} onChange={setHypertension} />
        {hypertension ? (
          <YesNo label="On blood pressure medication?" value={onAntihypertensive} onChange={setOnAntihypertensive} />
        ) : null}
        <YesNo label="On metformin?" value={onMetformin} onChange={setOnMetformin} />
        <YesNo label="On statin?" value={onStatin} onChange={setOnStatin} />

        <Text style={styles.label}>Other medications (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={medicationList}
          onChangeText={setMedicationList}
          multiline
          placeholder="List any other diabetes or heart medications"
          placeholderTextColor={C.onSurfaceVariant}
        />

        <Pressable style={styles.submit} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={C.onPrimary} /> : <Text style={styles.submitText}>Continue</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.onSurface },
  scroll: { padding: 24, gap: 12, paddingBottom: 48 },
  title: { fontFamily: FONT.bold, fontSize: 24, color: C.onSurface },
  subtitle: { fontFamily: FONT.medium, fontSize: 14, color: C.onSurfaceVariant, marginBottom: 8 },
  label: { fontFamily: FONT.bold, fontSize: 13, color: C.onSurfaceVariant, marginTop: 4 },
  input: {
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONT.medium,
    color: C.onSurface,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: FONT.medium, color: C.onSurface, fontSize: 13 },
  chipTextOn: { color: C.onPrimary },
  yesNo: { gap: 8, marginTop: 4 },
  submit: {
    marginTop: 16,
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: { fontFamily: FONT.bold, color: C.onPrimary, fontSize: 15 },
});
