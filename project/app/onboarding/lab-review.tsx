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
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { showToast } from '../../components/ToastProvider';
import { useAuth } from '../../contexts/AuthContext';
import { LabOnboardingColors as C } from '../../constants/LabOnboardingColors';
import { LAB_OCR_FIELDS, type ExtractedLabField, type LabFieldKey } from '../../utils/labOnboarding';
import { resolveOnboardingRoute } from '../../utils/resolveOnboardingRoute';
import { authService } from '../../services/authService';
import { useOnboardingNav } from '../../utils/useOnboardingNav';

const FONT = { medium: 'DMSans_500Medium', bold: 'DMSans_700Bold' };

type LabUpload = {
  id: number;
  ocr_extracted_values?: Record<string, ExtractedLabField>;
  ocr_status?: string;
};

function StatusBadge({ status }: { status: ExtractedLabField['status'] }) {
  if (status === 'ok') return <CheckCircle2 size={18} color="#22c55e" />;
  if (status === 'low') return <AlertTriangle size={18} color="#f59e0b" />;
  return <XCircle size={18} color="#ef4444" />;
}

export default function LabReviewScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { goBack, canGoBack, stepInfo } = useOnboardingNav('lab-review');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [upload, setUpload] = useState<LabUpload | null>(null);
  const [values, setValues] = useState<Record<LabFieldKey, string>>({
    cholesterol_total: '',
    ldl_cholesterol: '',
    hdl_cholesterol: '',
    triglycerides: '',
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
  });
  const [statuses, setStatuses] = useState<Record<LabFieldKey, ExtractedLabField['status']>>({
    cholesterol_total: 'missing',
    ldl_cholesterol: 'missing',
    hdl_cholesterol: 'missing',
    triglycerides: 'missing',
    systolic_bp: 'missing',
    diastolic_bp: 'missing',
    heart_rate: 'missing',
  });

  useEffect(() => {
    (async () => {
      try {
        const data = (await apiClient.getCurrentLabUpload()) as LabUpload;
        setUpload(data);
        const extracted = data.ocr_extracted_values || {};
        const nextValues = { ...values };
        const nextStatuses = { ...statuses };
        for (const field of LAB_OCR_FIELDS) {
          const cell = extracted[field.key] as ExtractedLabField | undefined;
          if (cell?.value != null) {
            nextValues[field.key] = String(Math.round(cell.value));
            nextStatuses[field.key] = cell.status || 'ok';
          }
        }
        setValues(nextValues);
        setStatuses(nextStatuses);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not load lab upload.';
        showToast.error('Error', msg);
        router.replace('/onboarding/lab-upload');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ocrLabel = useMemo(() => {
    const s = upload?.ocr_status || 'pending';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [upload?.ocr_status]);

  const handleConfirm = async () => {
    if (!upload) return;

    const payload: Record<string, number | boolean> = { review_confirmed: true };
    for (const field of LAB_OCR_FIELDS) {
      const raw = values[field.key].trim();
      if (!raw) continue;
      const num = Number(raw);
      if (Number.isNaN(num) || num < field.min || num > field.max) {
        showToast.error('Validation', `${field.label} must be between ${field.min} and ${field.max}.`);
        return;
      }
      payload[field.key] = Math.round(num);
    }

    if (!payload.systolic_bp || !payload.diastolic_bp || !payload.heart_rate) {
      showToast.error('Validation', 'Systolic BP, diastolic BP, and heart rate are required.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.reviewLabUpload(upload.id, payload);

      const completingPendingProfile = Boolean(user?.onboarding_completed && user?.lab_upload_pending);

      if (completingPendingProfile) {
        const labPayload: Record<string, number | null> = {
          systolic_bp: payload.systolic_bp as number,
          diastolic_bp: payload.diastolic_bp as number,
          heart_rate: payload.heart_rate as number,
          cholesterol_total: (payload.cholesterol_total as number) ?? null,
          ldl_cholesterol: (payload.ldl_cholesterol as number) ?? null,
          hdl_cholesterol: (payload.hdl_cholesterol as number) ?? null,
          triglycerides: (payload.triglycerides as number) ?? null,
          source_lab_upload_id: upload.id,
        };
        const result = await apiClient.completeLabData(labPayload);
        await refreshUser();
        const score = result.prediction?.diabetes_risk_score;
        showToast.success(
          'Full risk score ready',
          score != null
            ? `Your score is now ${score.toFixed(0)} based on all health indicators.`
            : 'Your health profile is now complete.'
        );
        router.replace('/(tabs)');
      } else {
        showToast.success('Saved', 'Continue with lifestyle and body measurements.');
        await refreshUser();
        const refreshed = await authService.getCurrentUser();
        router.replace(await resolveOnboardingRoute(refreshed));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save review.';
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
        <Text style={styles.subtitle}>
          OCR status: <Text style={styles.bold}>{ocrLabel}</Text>. Correct any value before continuing.
        </Text>

        {LAB_OCR_FIELDS.map((field) => (
          <View key={field.key} style={styles.row}>
            <View style={styles.rowTop}>
              <StatusBadge status={statuses[field.key]} />
              <Text style={styles.label}>{field.label}</Text>
              <Text style={styles.unit}>{field.unit}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={values[field.key]}
              onChangeText={(text) => {
                setValues((prev) => ({ ...prev, [field.key]: text }));
                setStatuses((prev) => ({ ...prev, [field.key]: text.trim() ? 'ok' : 'missing' }));
              }}
              keyboardType="numeric"
              placeholder={`${field.placeholder} (${field.min}–${field.max})`}
              placeholderTextColor={C.onSurfaceVariant}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          disabled={submitting}
          style={[styles.confirmBtn, submitting && styles.confirmDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <Text style={styles.confirmText}>Confirm lab values</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
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
  headerTitle: { fontFamily: FONT.bold, fontSize: 17, color: C.onSurface },
  scroll: { padding: 20, paddingBottom: 120, gap: 16, maxWidth: 560, alignSelf: 'center', width: '100%' },
  subtitle: { fontFamily: FONT.medium, fontSize: 14, lineHeight: 20, color: C.onSurfaceVariant },
  bold: { fontFamily: FONT.bold, color: C.onSurface },
  row: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    padding: 14,
    gap: 8,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontFamily: FONT.bold, fontSize: 15, color: C.onSurface },
  unit: { fontFamily: FONT.medium, fontSize: 12, color: C.onSurfaceVariant },
  input: {
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONT.medium,
    fontSize: 16,
    color: C.onSurface,
    backgroundColor: '#fff',
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
