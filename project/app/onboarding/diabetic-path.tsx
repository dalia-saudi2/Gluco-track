import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Activity, ShieldCheck } from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/ToastProvider';
import { OnboardingColors as C } from '../../constants/OnboardingColors';
import { useOnboardingNav } from '../../utils/useOnboardingNav';

const FONT = { bold: 'DMSans_700Bold', medium: 'DMSans_500Medium' };

export default function DiabeticPathScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { goBack, canGoBack, stepInfo } = useOnboardingNav('diabetic-path');
  const [submitting, setSubmitting] = useState(false);

  const choose = async (isDiabetic: boolean) => {
    try {
      setSubmitting(true);
      await apiClient.updateDiabeticPath(isDiabetic);
      await refreshUser();
      router.replace(isDiabetic ? '/onboarding/clinical-profile' : '/onboarding/lab-choice');
    } catch (e: unknown) {
      showToast.error('Error', e instanceof Error ? e.message : 'Could not save your choice.');
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

      <View style={styles.body}>
        <Text style={styles.title}>Do you have diabetes?</Text>
        <Text style={styles.subtitle}>
          This helps us show the right questions and risk tools for you.
        </Text>

        <Pressable
          style={[styles.card, submitting && styles.cardDisabled]}
          onPress={() => choose(true)}
          disabled={submitting}
        >
          <Activity size={28} color={C.primary} />
          <Text style={styles.cardTitle}>I have diabetes or pre-diabetes</Text>
          <Text style={styles.cardHint}>We'll ask about your diagnosis and medications.</Text>
        </Pressable>

        <Pressable
          style={[styles.card, submitting && styles.cardDisabled]}
          onPress={() => choose(false)}
          disabled={submitting}
        >
          <ShieldCheck size={28} color={C.secondary} />
          <Text style={styles.cardTitle}>I want to check my risk</Text>
          <Text style={styles.cardHint}>Focus on prevention and lifestyle risk scoring.</Text>
        </Pressable>

        {submitting ? <ActivityIndicator color={C.primary} style={{ marginTop: 16 }} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.onSurface },
  body: { flex: 1, padding: 24, gap: 16 },
  title: { fontFamily: FONT.bold, fontSize: 26, color: C.onSurface },
  subtitle: { fontFamily: FONT.medium, fontSize: 15, color: C.onSurfaceVariant, marginBottom: 8 },
  card: {
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    backgroundColor: C.surfaceContainerLowest,
  },
  cardDisabled: { opacity: 0.7 },
  cardTitle: { fontFamily: FONT.bold, fontSize: 18, color: C.onSurface },
  cardHint: { fontFamily: FONT.medium, fontSize: 14, color: C.onSurfaceVariant },
});
