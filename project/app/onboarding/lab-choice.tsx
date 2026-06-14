import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle, Upload, FileEdit } from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/ToastProvider';
import { LabChoiceColors as C } from '../../constants/LabOnboardingColors';

const FONT = {
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

type Choice = 'yes' | 'no' | null;

export default function LabChoiceScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [choice, setChoice] = useState<Choice>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!choice) return;
    try {
      setSubmitting(true);
      const hasLab = choice === 'yes';
      await apiClient.updateOnboardingLabChoice(hasLab);
      await refreshUser();
      if (hasLab) {
        router.replace('/onboarding/lab-upload');
      } else {
        showToast.success('All set', 'You can add lab results later from Records.');
        router.replace('/(tabs)');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save your choice.';
      showToast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.primary} />
        </Pressable>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Step 2 of 3</Text>
        </View>
        <Pressable style={styles.headerBtn}>
          <HelpCircle size={22} color={C.onSurfaceVariant} />
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '66.66%' }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.title, isWide && styles.titleWide]}>Have you done a lab test recently?</Text>
          <Text style={styles.subtitle}>
            We'll use your results to create a personalized health baseline with joyful precision.
          </Text>
        </View>

        <View style={styles.cards}>
          <Pressable
            onPress={() => setChoice('yes')}
            style={({ pressed }) => [
              styles.choiceCard,
              choice === 'yes' && styles.choiceCardActive,
              pressed && styles.choicePressed,
            ]}
          >
            <View style={[styles.iconBox, choice === 'yes' && styles.iconBoxActive]}>
              <Upload size={32} color={choice === 'yes' ? C.onPrimary : C.primary} />
            </View>
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceTitle}>Yes, I have results</Text>
              <Text style={styles.choiceSub}>Upload your lab report and we'll scan the values.</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setChoice('no')}
            style={({ pressed }) => [
              styles.choiceCard,
              choice === 'no' && styles.choiceCardActive,
              pressed && styles.choicePressed,
            ]}
          >
            <View style={[styles.iconBox, choice === 'no' && styles.iconBoxActive]}>
              <FileEdit size={32} color={choice === 'no' ? C.onPrimary : C.onSurfaceVariant} />
            </View>
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceTitle}>No, I'll enter manually</Text>
              <Text style={styles.choiceSub}>Enter your health measurements directly.</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!choice || submitting}
          style={({ pressed }) => [
            styles.continueBtn,
            (!choice || submitting) && styles.continueBtnDisabled,
            pressed && choice && styles.continueBtnPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainerHigh,
    backgroundColor: C.surface,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  stepPillText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.primary,
  },
  progressTrack: { height: 8, backgroundColor: C.surfaceContainer },
  progressFill: { height: '100%', backgroundColor: C.primary, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  scroll: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 120, maxWidth: 600, width: '100%', alignSelf: 'center' },
  scrollWide: { paddingHorizontal: 48 },
  hero: { alignItems: 'center', marginBottom: 48 },
  title: {
    fontFamily: FONT.bold,
    fontSize: 28,
    lineHeight: 36,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  titleWide: { fontSize: 36, lineHeight: 44 },
  subtitle: {
    fontFamily: FONT.medium,
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 400,
  },
  cards: { gap: 24 },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    padding: 32,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: C.surfaceContainerHigh,
    borderRadius: 24,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  choiceCardActive: {
    borderColor: C.primary,
    backgroundColor: '#fff0f7',
    shadowOpacity: 0.15,
    transform: [{ translateY: -2 }],
  },
  choicePressed: { transform: [{ scale: 0.97 }] },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: C.primary },
  choiceTextWrap: { flex: 1 },
  choiceTitle: {
    fontFamily: FONT.bold,
    fontSize: 24,
    lineHeight: 32,
    color: C.onSurface,
    marginBottom: 4,
  },
  choiceSub: {
    fontFamily: FONT.medium,
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.92)' : C.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: C.surfaceContainerHigh,
  },
  continueBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  continueBtnDisabled: { opacity: 0.3 },
  continueBtnPressed: { transform: [{ scale: 0.95 }] },
  continueText: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: C.onPrimary,
  },
});
